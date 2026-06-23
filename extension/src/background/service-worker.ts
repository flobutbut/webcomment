import { createClient } from '@supabase/supabase-js'
import type { Session } from '@supabase/supabase-js'
import type { Message, FinalizePayload } from '../shared/messages'
import type { ShareContext, CommentLinkContext, Profile } from '../shared/types'

const SUPABASE_URL   = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_KEY   = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const SHARE_BASE_URL = import.meta.env.VITE_SHARE_BASE_URL as string

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

let currentSession: Session | null = null
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null
let realtimeInitialized = false

// ---------------------------------------------------------------------------
// Top-level listeners (required for MV3)
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  if (message.type === 'CONTENT_READY') {
    const tabId = sender.tab?.id
    const url   = sender.tab?.url
    if (tabId && url) handleContentReady(tabId, url)
    sendResponse({ ok: true })
    return true
  }
  handleMessage(message).then(sendResponse)
  return true
})

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return
  try {
    const url = new URL(details.url)
    if (url.hostname === new URL(SHARE_BASE_URL).hostname && url.pathname.startsWith('/s/')) {
      handleShareLink(details.tabId, details.url)
    }
  } catch { /* invalid URL */ }
})

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return
  try {
    const url = new URL(details.url)
    if (url.hostname === new URL(SUPABASE_URL).hostname && url.pathname === '/functions/v1/get-comment-page') {
      handleCommentLink(details.tabId, details.url)
    }
  } catch { /* invalid URL */ }
})

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'activate-pin-picker') return
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id || !tab.url) return
  const url = tab.url
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:') || url.startsWith('edge://')) return
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'ACTIVATE_PIN_PICKER' })
  } catch {
    try {
      const manifest = chrome.runtime.getManifest()
      const files    = manifest.content_scripts?.[0]?.js ?? []
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files })
      await chrome.tabs.sendMessage(tab.id, { type: 'ACTIVATE_PIN_PICKER' })
    } catch { /* unsupported page */ }
  }
})

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return

  const { pendingCommentLink } = await chrome.storage.local.get('pendingCommentLink')
  if (!pendingCommentLink) return

  const ctx      = pendingCommentLink as CommentLinkContext
  const tabBase  = tab.url.split('#')[0]
  const linkBase = ctx.url.split('#')[0]
  if (tabBase === linkBase) {
    await chrome.storage.local.remove('pendingCommentLink')
    await showPinsForTab(tabId, tab.url, ctx.comment_id)
  }
})

// ---------------------------------------------------------------------------
// Init: session restore
// ---------------------------------------------------------------------------

chrome.storage.local.get('session', async ({ session }) => {
  if (!session) return
  const { data, error } = await supabase.auth.setSession(session)
  if (!error && data.session) {
    currentSession = data.session
    chrome.storage.local.set({ session: data.session })
    if (!realtimeInitialized) {
      realtimeInitialized = true
      subscribeToInbox(data.session.user.id)
    }
    supabase.functions.invoke('cleanup-screenshots')
    // After session is ready, push pins to the active tab.
    // Covers the race where CONTENT_READY arrived before currentSession was set.
    const { pinsVisible } = await chrome.storage.local.get('pinsVisible')
    if (pinsVisible !== false) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('about:')) {
        showPinsForTab(tab.id, tab.url).catch(() => {})
      }
    }
  }
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.session) return
  const newSession = changes.session.newValue
  if (newSession && !currentSession) {
    supabase.auth.setSession(newSession).then(({ data, error }) => {
      if (!error && data.session) {
        currentSession = data.session
        if (!realtimeInitialized) {
          realtimeInitialized = true
          subscribeToInbox(data.session.user.id)
        }
      }
    })
  }
})

supabase.auth.onAuthStateChange((event, session) => {
  currentSession = session
  if (session) {
    chrome.storage.local.set({ session })
    if (!realtimeInitialized) {
      realtimeInitialized = true
      subscribeToInbox(session.user.id)
    }
  } else {
    realtimeInitialized = false
    chrome.storage.local.remove(['session', 'profile'])
    realtimeChannel?.unsubscribe()
    realtimeChannel = null
    chrome.action.setBadgeText({ text: '' })
  }
})

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

async function handleMessage(message: Message): Promise<unknown> {
  switch (message.type) {
    case 'PREPARE_CAPTURE':   return prepareCapture(message.payload)
    case 'FINALIZE_COMMENT':  return finalizeComment(message.payload)
    case 'SEARCH_USERS':      return searchUsers(message.payload.query)
    case 'MARK_READ':         return markRead(message.payload.recipientId)
    case 'RESOLVE_COMMENT':   return resolveComment(message.payload.recipientId)
    case 'DELETE_COMMENT':    return deleteCommentById(message.payload.commentId)
    case 'GET_SESSION':       return { session: currentSession }
    case 'UPDATE_BADGE':      return handleUpdateBadge()
    case 'REFRESH_PINS':      return handleRefreshPins(message.payload.visible)
    case 'GET_USER_PROFILE':  return getUserProfile(message.payload.userId)
    case 'ADD_CONTACT':          return addContact(message.payload.addresseeId)
    case 'NAVIGATE_TO_COMMENT': return navigateToComment(message.payload.commentId, message.payload.url)
    default:                    return { error: 'Unknown message type' }
  }
}

// ---------------------------------------------------------------------------
// Two-step capture
// ---------------------------------------------------------------------------

async function ensureSession(): Promise<boolean> {
  if (currentSession) return true
  const { session } = await chrome.storage.local.get('session')
  if (!session) return false
  const { data, error } = await supabase.auth.setSession(session)
  if (!error && data.session) {
    currentSession = data.session
    return true
  }
  return false
}

async function prepareCapture(pin: { x: number; y: number }): Promise<unknown> {
  try {
    if (!await ensureSession()) throw new Error('Not authenticated')
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id || !tab.url) throw new Error('Tab not found')

    const dataUrl  = await chrome.tabs.captureVisibleTab({ format: 'png' })
    const webpBlob = await convertToWebP(dataUrl)

    const commentId = crypto.randomUUID()
    const path      = `${currentSession!.user.id}/${commentId}.webp`

    const { error: uploadError } = await supabase.storage
      .from('screenshots')
      .upload(path, webpBlob, { contentType: 'image/webp' })
    if (uploadError) throw uploadError

    await chrome.storage.local.set({
      pendingCapture: {
        comment_id:      commentId,
        pin_x:           pin.x,
        pin_y:           pin.y,
        anchor_path:     pin.anchor_path,
        anchor_x:        pin.anchor_x,
        anchor_y:        pin.anchor_y,
        url:             tab.url,
        screenshot_path: path,
      },
    })

    return { ok: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

async function finalizeComment(payload: FinalizePayload): Promise<unknown> {
  try {
    if (!await ensureSession()) throw new Error('Not authenticated')
    const { pendingCapture } = await chrome.storage.local.get('pendingCapture')
    if (!pendingCapture) throw new Error('No pending capture')

    const { data, error } = await supabase.functions.invoke('send-comment', {
      body: {
        comment_id:      pendingCapture.comment_id,
        url:             pendingCapture.url,
        screenshot_path: pendingCapture.screenshot_path,
        pin_x:           pendingCapture.pin_x,
        pin_y:           pendingCapture.pin_y,
        anchor_path:     pendingCapture.anchor_path,
        anchor_x:        pendingCapture.anchor_x,
        anchor_y:        pendingCapture.anchor_y,
        body:            payload.body,
        to:              payload.to,
      },
    })
    if (error) throw error

    await chrome.storage.local.remove('pendingCapture')

    chrome.storage.local.get('pinsVisible').then(({ pinsVisible }) => {
      if (pinsVisible === false) return
      chrome.tabs.query({ active: true, currentWindow: true }).then(([activeTab]) => {
        if (activeTab?.id && activeTab.url) showPinsForTab(activeTab.id, activeTab.url)
      })
    })

    return { success: true, comment_id: (data as { comment_id: string }).comment_id }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

// ---------------------------------------------------------------------------
// User search
// ---------------------------------------------------------------------------

async function searchUsers(query: string): Promise<unknown> {
  try {
    await ensureSession()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, email')
      .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(5)
    if (error) throw error
    return { users: data ?? [] }
  } catch (err) {
    return { error: (err as Error).message, users: [] }
  }
}

// ---------------------------------------------------------------------------
// Pins
// ---------------------------------------------------------------------------

async function handleRefreshPins(visible: boolean): Promise<unknown> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id || !tab.url) return { ok: false }

    if (!visible) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_PINS', payload: { comments: [] } })
      } catch { /* content script not present */ }
    } else {
      await showPinsForTab(tab.id, tab.url)
    }
    return { ok: true }
  } catch {
    return { ok: false }
  }
}

async function showPinsForTab(tabId: number, rawUrl: string, targetCommentId?: string) {
  try {
    if (!await ensureSession()) return
    const userId = currentSession!.user.id

    const { profile } = await chrome.storage.local.get('profile') as { profile?: Profile }

    const baseUrl = rawUrl.split('#')[0]
    const urlSet  = [...new Set([rawUrl, baseUrl])]

    const [{ data: received }, { data: sent }] = await Promise.all([
      supabase.from('comment_inbox').select('*').eq('for_user_id', userId).in('url', urlSet).is('resolved_at', null),
      supabase.from('comments')
        .select('id, url, body, screenshot_url, pin_x, pin_y, anchor_selector, anchor_path, anchor_x, anchor_y, tags, created_at')
        .eq('from_user_id', userId).in('url', urlSet),
    ])

    const sentNormalized = (sent ?? []).map(c => ({
      ...c,
      comment_id:      c.id,
      from_username:   profile?.username   ?? 'Me',
      from_avatar_url: profile?.avatar_url ?? null,
      from_initials:   profile?.initials   ?? null,
      from_user_id:    userId,
      for_user_id:     userId,
    }))

    const receivedIds = new Set((received ?? []).map((c: { comment_id: string }) => c.comment_id))
    const merged = [
      ...(received ?? []),
      ...sentNormalized.filter(c => !receivedIds.has(c.id)),
    ]

    const sendPins = async () => {
      await chrome.tabs.sendMessage(tabId, { type: 'SHOW_PINS', payload: { comments: merged, targetCommentId } })
    }

    try {
      await sendPins()
    } catch {
      const manifest = chrome.runtime.getManifest()
      const files    = manifest.content_scripts?.[0]?.js ?? []
      await chrome.scripting.executeScript({ target: { tabId }, files })
      await sendPins()
    }
  } catch {
    // page does not support content scripts
  }
}

// ---------------------------------------------------------------------------
// User profile & contacts
// ---------------------------------------------------------------------------

async function getUserProfile(userId: string): Promise<unknown> {
  try {
    await ensureSession()
    const currentUserId = currentSession!.user.id
    const isCurrentUser = userId === currentUserId

    const [commentsResult, contactResult] = await Promise.all([
      supabase
        .from('comment_inbox')
        .select('comment_id, body, url, created_at')
        .eq('from_user_id', userId)
        .eq('recipient_type', 'public')
        .order('created_at', { ascending: false })
        .limit(5),
      isCurrentUser
        ? Promise.resolve({ data: null, error: null })
        : supabase
          .from('contacts')
          .select('id, status')
          .or(`and(requester_id.eq.${currentUserId},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${currentUserId})`)
          .maybeSingle(),
    ])

    return {
      comments:      commentsResult.data ?? [],
      contactStatus: (contactResult.data as { status?: string } | null)?.status ?? 'none',
      isCurrentUser,
    }
  } catch (err) {
    return { error: (err as Error).message, comments: [], contactStatus: 'none', isCurrentUser: false }
  }
}

async function navigateToComment(commentId: string, url: string): Promise<unknown> {
  try {
    await chrome.storage.local.set({ pendingCommentLink: { comment_id: commentId, url } })
    await chrome.tabs.create({ url })
    return { ok: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

async function addContact(addresseeId: string): Promise<unknown> {
  try {
    if (!await ensureSession()) throw new Error('Not authenticated')
    const { error } = await supabase
      .from('contacts')
      .insert({ requester_id: currentSession!.user.id, addressee_id: addresseeId, status: 'pending' })
    if (error) throw error
    return { success: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

// ---------------------------------------------------------------------------
// CONTENT_READY handler
// ---------------------------------------------------------------------------

async function handleContentReady(tabId: number, url: string) {
  try {
    const { pinsVisible, pendingCommentLink } = await chrome.storage.local.get(['pinsVisible', 'pendingCommentLink'])

    if (pendingCommentLink) {
      const ctx      = pendingCommentLink as CommentLinkContext
      const tabBase  = url.split('#')[0]
      const linkBase = ctx.url.split('#')[0]
      if (tabBase === linkBase) {
        await chrome.storage.local.remove('pendingCommentLink')
        await showPinsForTab(tabId, url, ctx.comment_id)
        return
      }
    }

    if (pinsVisible !== false) {
      await showPinsForTab(tabId, url)
    }
  } catch {
    // non-fatal
  }
}

// ---------------------------------------------------------------------------
// Share link
// ---------------------------------------------------------------------------

async function handleShareLink(tabId: number, rawUrl: string) {
  try {
    const url   = new URL(rawUrl)
    const token = url.pathname.split('/s/')[1]
    if (!token) return

    const { data, error } = await supabase.functions.invoke('resolve-share-link', {
      body: { token },
    })
    if (error || !data) return

    const context: ShareContext = {
      recipient_id:   data.recipient_id,
      recipient_name: data.recipient_name,
      url:            data.url,
      scope:          data.scope,
    }

    await chrome.storage.local.set({ [`share:${data.url}`]: context })
    chrome.tabs.update(tabId, { url: data.url })
  } catch {
    // invalid or expired link
  }
}

// ---------------------------------------------------------------------------
// Comment link
// ---------------------------------------------------------------------------

async function handleCommentLink(tabId: number, rawUrl: string) {
  try {
    if (!await ensureSession()) return
    const url       = new URL(rawUrl)
    const commentId = url.searchParams.get('id')
    if (!commentId) return

    const userId = currentSession!.user.id

    const [{ data: sent }, { data: received }] = await Promise.all([
      supabase.from('comments').select('id, url').eq('id', commentId).eq('from_user_id', userId).maybeSingle(),
      supabase.from('comment_inbox').select('comment_id, url').eq('comment_id', commentId).eq('for_user_id', userId).maybeSingle(),
    ])

    const targetUrl = sent?.url ?? received?.url
    if (!targetUrl) return

    const ctx: CommentLinkContext = { comment_id: commentId, url: targetUrl }
    await chrome.storage.local.set({ pendingCommentLink: ctx })
    chrome.tabs.update(tabId, { url: targetUrl })
  } catch {
    // comment not found or access denied → fallback HTML page loads
  }
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

async function handleUpdateBadge(): Promise<unknown> {
  if (!currentSession) return { ok: false }
  await updateBadge(currentSession.user.id)
  return { ok: true }
}

async function markRead(recipientId: string): Promise<unknown> {
  const { error } = await supabase
    .from('comment_recipients')
    .update({ read_at: new Date().toISOString() })
    .eq('id', recipientId)
  if (!error && currentSession) {
    await updateBadge(currentSession.user.id)
  }
  return { error: error?.message ?? null }
}

async function deleteCommentById(commentId: string): Promise<unknown> {
  try {
    if (!await ensureSession()) throw new Error('Not authenticated')
    const { data } = await supabase.from('comments').select('screenshot_path').eq('id', commentId).single()
    if (data?.screenshot_path) {
      await supabase.storage.from('screenshots').remove([data.screenshot_path])
    }
    const { error } = await supabase.from('comments').delete()
      .eq('id', commentId)
      .eq('from_user_id', currentSession!.user.id)
    if (error) throw error
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id && tab.url) showPinsForTab(tab.id, tab.url)
    return { success: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

async function resolveComment(recipientId: string): Promise<unknown> {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('comment_recipients')
    .update({ resolved_at: now, read_at: now })
    .eq('id', recipientId)
  if (!error && currentSession) {
    await updateBadge(currentSession.user.id)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id && tab.url) showPinsForTab(tab.id, tab.url)
  }
  return { error: error?.message ?? null }
}

// ---------------------------------------------------------------------------
// Realtime inbox
// ---------------------------------------------------------------------------

function subscribeToInbox(userId: string) {
  realtimeChannel?.unsubscribe()

  realtimeChannel = supabase
    .channel(`inbox:${userId}`)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'comment_recipients',
        filter: `recipient_type=eq.user,recipient_id=eq.${userId}`,
      },
      async () => {
        await updateBadge(userId)
        chrome.notifications.create({
          type:    'basic',
          iconUrl: 'icons/48.png',
          title:   'WebComment',
          message: 'You received a new comment',
        })
      }
    )
    .subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('[Realtime] channel error:', err ?? status)
        realtimeInitialized = false
        setTimeout(() => {
          realtimeInitialized = true
          subscribeToInbox(userId)
        }, 5000)
      }
    })

  updateBadge(userId)
}

async function updateBadge(userId: string) {
  const { data } = await supabase
    .from('comment_inbox')
    .select('recipient_id')
    .eq('for_user_id', userId)
    .or(`from_user_id.neq.${userId},from_user_id.is.null`)
    .neq('recipient_type', 'public')
    .is('read_at', null)
    .is('resolved_at', null)

  const count = data?.length ?? 0
  const text  = count > 0 ? String(count) : ''
  chrome.action.setBadgeBackgroundColor({ color: '#2563EB' })
  chrome.action.setBadgeText({ text })
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

async function convertToWebP(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl)
  const blob     = await response.blob()
  const bitmap   = await createImageBitmap(blob)
  const canvas   = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx      = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)
  return canvas.convertToBlob({ type: 'image/webp', quality: 0.75 })
}
