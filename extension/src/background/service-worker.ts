import { createClient } from '@supabase/supabase-js'
import type { Session } from '@supabase/supabase-js'
import type { Message, SendPayload, FinalizePayload } from '../shared/messages'
import type { ShareContext, CommentLinkContext } from '../shared/types'

const SUPABASE_URL   = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_KEY   = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const SHARE_BASE_URL = import.meta.env.VITE_SHARE_BASE_URL as string

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

let currentSession: Session | null = null
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null

// ---------------------------------------------------------------------------
// Top-level listeners (required for MV3)
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse)
  return true
})

chrome.webNavigation.onCommitted.addListener(
  (details) => {
    if (details.frameId !== 0) return
    handleShareLink(details.tabId, details.url)
  },
  { url: [{ hostEquals: new URL(SHARE_BASE_URL).hostname, pathPrefix: '/s/' }] }
)

chrome.webNavigation.onCommitted.addListener(
  (details) => {
    if (details.frameId !== 0) return
    handleCommentLink(details.tabId, details.url)
  },
  { url: [{ hostEquals: new URL(SUPABASE_URL).hostname, pathEquals: '/functions/v1/get-comment-page' }] }
)

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return

  const { pinsVisible, pendingCommentLink } = await chrome.storage.local.get(['pinsVisible', 'pendingCommentLink'])

  if (pendingCommentLink) {
    const ctx      = pendingCommentLink as CommentLinkContext
    const tabBase  = tab.url.split('#')[0]
    const linkBase = ctx.url.split('#')[0]
    if (tabBase === linkBase) {
      await chrome.storage.local.remove('pendingCommentLink')
      await showPinsForTab(tabId, tab.url, ctx.comment_id)
      return
    }
  }

  if (!pinsVisible) return
  await showPinsForTab(tabId, tab.url)
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
    subscribeToInbox(data.session.user.id)
  }
})

// Reacts when the popup saves a new session (login or refresh)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.session) return
  const newSession = changes.session.newValue
  if (newSession && !currentSession) {
    supabase.auth.setSession(newSession).then(({ data, error }) => {
      if (!error && data.session) {
        currentSession = data.session
        subscribeToInbox(data.session.user.id)
      }
    })
  }
})

supabase.auth.onAuthStateChange((event, session) => {
  currentSession = session
  if (session) {
    chrome.storage.local.set({ session })
    subscribeToInbox(session.user.id)
  } else {
    chrome.storage.local.remove('session')
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
    case 'CAPTURE_AND_SEND':  return captureAndSend(message.payload)
    case 'PREPARE_CAPTURE':   return prepareCapture(message.payload)
    case 'FINALIZE_COMMENT':  return finalizeComment(message.payload)
    case 'SEARCH_USERS':      return searchUsers(message.payload.query)
    case 'MARK_READ':         return markRead(message.payload.recipientId)
    case 'RESOLVE_COMMENT':   return resolveComment(message.payload.recipientId)
    case 'DELETE_COMMENT':    return deleteCommentById(message.payload.commentId)
    case 'GET_SESSION':       return { session: currentSession }
    default:                  return { error: 'Unknown message type' }
  }
}

// ---------------------------------------------------------------------------
// Classic send (popup Composer — compat)
// ---------------------------------------------------------------------------

async function captureAndSend(payload: SendPayload): Promise<unknown> {
  try {
    if (!await ensureSession()) throw new Error('Not authenticated')
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id || !tab.url) throw new Error('Tab not found')

    const dataUrl  = await chrome.tabs.captureVisibleTab({ format: 'png' })
    const webpBlob = await convertToWebP(dataUrl)

    const commentId = crypto.randomUUID()
    const path      = `${currentSession.user.id}/${commentId}.webp`

    const { error: uploadError } = await supabase.storage
      .from('screenshots')
      .upload(path, webpBlob, { contentType: 'image/webp' })
    if (uploadError) throw uploadError

    const { data, error } = await supabase.functions.invoke('send-comment', {
      body: { comment_id: commentId, url: tab.url, screenshot_path: path, ...payload },
    })
    if (error) throw error

    return { success: true, comment_id: (data as { comment_id: string }).comment_id }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Two-step capture (in-page composer)
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
    const path      = `${currentSession.user.id}/${commentId}.webp`

    const { error: uploadError } = await supabase.storage
      .from('screenshots')
      .upload(path, webpBlob, { contentType: 'image/webp' })
    if (uploadError) throw uploadError

    await chrome.storage.local.set({
      pendingCapture: {
        comment_id:      commentId,
        pin_x:           pin.x,
        pin_y:           pin.y,
        anchor_selector: pin.anchor_selector,
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
    const { pendingCapture } = await chrome.storage.local.get('pendingCapture')
    if (!pendingCapture) throw new Error('No pending capture')

    const { data, error } = await supabase.functions.invoke('send-comment', {
      body: {
        comment_id:      pendingCapture.comment_id,
        url:             pendingCapture.url,
        screenshot_path: pendingCapture.screenshot_path,
        pin_x:           pendingCapture.pin_x,
        pin_y:           pendingCapture.pin_y,
        anchor_selector: pendingCapture.anchor_selector,
        anchor_x:        pendingCapture.anchor_x,
        anchor_y:        pendingCapture.anchor_y,
        body:            payload.body,
        to:              payload.to,
      },
    })
    if (error) throw error

    await chrome.storage.local.remove('pendingCapture')

    // Refresh pins immediately if the toggle is active
    chrome.storage.local.get('pinsVisible').then(({ pinsVisible }) => {
      if (!pinsVisible) return
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
// User search (for the in-page composer)
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
// Auto-display pins on page load
// ---------------------------------------------------------------------------

async function showPinsForTab(tabId: number, rawUrl: string, targetCommentId?: string) {
  try {
    if (!await ensureSession()) return
    const userId = currentSession!.user.id

    const baseUrl = rawUrl.split('#')[0]
    const urlSet  = [...new Set([rawUrl, baseUrl])]

    const [{ data: received }, { data: sent }] = await Promise.all([
      supabase.from('comment_inbox').select('*').eq('for_user_id', userId).in('url', urlSet).is('resolved_at', null),
      supabase.from('comments')
        .select('id, url, body, screenshot_url, pin_x, pin_y, anchor_selector, anchor_x, anchor_y, created_at')
        .eq('from_user_id', userId).in('url', urlSet),
    ])

    const sentNormalized = (sent ?? []).map(c => ({
      ...c,
      comment_id:    c.id,
      from_username: 'Me',
      from_user_id:  userId,
      for_user_id:   userId,
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
// Mark as read
// ---------------------------------------------------------------------------

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
    const { error } = await supabase.from('comments').delete().eq('id', commentId)
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
    .subscribe()

  updateBadge(userId)
}

async function updateBadge(userId: string) {
  const { data } = await supabase
    .from('comment_inbox')
    .select('recipient_id')
    .eq('for_user_id', userId)
    .neq('from_user_id', userId)
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
