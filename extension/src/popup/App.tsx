import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Icon } from '@iconify/react'
import checkIcon        from '@iconify-icons/lucide/check'
import arrowUpRightIcon from '@iconify-icons/lucide/arrow-up-right'
import mapPinIcon       from '@iconify-icons/lucide/map-pin'
import mapPinOffIcon    from '@iconify-icons/lucide/map-pin-off'
import userIcon         from '@iconify-icons/lucide/user'
import plusIcon         from '@iconify-icons/lucide/plus'
import { supabase } from '../shared/supabase'
import type { Profile } from '../shared/types'
import { Button }   from './components/Button'
import { Login }    from './views/Login'
import { Inbox }    from './views/Inbox'
import { Sent }     from './views/Sent'
import { Settings } from './views/Settings'

type Tab = 'inbox' | 'sent'

export function App() {
  const [session,       setSession]       = useState<Session | null>(null)
  const [profile,       setProfile]       = useState<Profile | null>(null)
  const [tab,           setTab]           = useState<Tab>('inbox')
  const [settings,      setSettings]      = useState(false)
  const [copied,        setCopied]        = useState(false)
  const [loading,       setLoading]       = useState(true)
  const [newCommentErr, setNewCommentErr] = useState<string | null>(null)
  const [pinsVisible,   setPinsVisible]   = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) chrome.storage.local.set({ session })
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        chrome.storage.local.set({ session })
      } else {
        chrome.storage.local.remove('session')
        setProfile(null); setSettings(false); setTab('inbox')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setProfile(data))
  }, [session])

  useEffect(() => {
    if (!session) {
      chrome.action.setBadgeText({ text: '' })
      return
    }
    refreshBadge(session.user.id)
  }, [session])

  async function refreshBadge(userId: string) {
    const { data } = await supabase
      .from('comment_inbox')
      .select('recipient_id')
      .eq('for_user_id', userId)
      .neq('from_user_id', userId)
      .neq('recipient_type', 'public')
      .is('read_at', null)
    const count = data?.length ?? 0
    const text  = count > 0 ? String(count) : ''
    chrome.action.setBadgeBackgroundColor({ color: '#2563EB' })
    chrome.action.setBadgeText({ text })
  }

  // Restore pins state on session load
  useEffect(() => {
    if (!session) return
    chrome.storage.local.get('pinsVisible', ({ pinsVisible: saved }) => {
      if (saved) {
        setPinsVisible(true)
        applyPins(true, session.user.id)
      }
    })
  }, [session?.user.id])

  async function applyPins(visible: boolean, userId: string) {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!activeTab?.id) return

    const sendPins = async (comments: unknown[]) => {
      try {
        await chrome.tabs.sendMessage(activeTab.id!, { type: 'SHOW_PINS', payload: { comments } })
      } catch {
        const manifest = chrome.runtime.getManifest()
        const files    = manifest.content_scripts?.[0]?.js ?? []
        await chrome.scripting.executeScript({ target: { tabId: activeTab.id! }, files })
        await chrome.tabs.sendMessage(activeTab.id!, { type: 'SHOW_PINS', payload: { comments } })
      }
    }

    if (!visible) { await sendPins([]); return }

    const rawUrl = activeTab.url
    if (!rawUrl) { await sendPins([]); return }

    // Strip fragment so #section variants all match
    const baseUrl  = rawUrl.split('#')[0]
    const urlSet   = [...new Set([rawUrl, baseUrl])]

    const [{ data: received }, { data: sent }] = await Promise.all([
      supabase.from('comment_inbox').select('*').eq('for_user_id', userId).in('url', urlSet),
      supabase.from('comments').select('id, url, body, screenshot_url, pin_x, pin_y, anchor_selector, anchor_x, anchor_y, created_at')
        .eq('from_user_id', userId).in('url', urlSet),
    ])

    // Normalize sent comments to the shape showPins() expects
    const sentNormalized = (sent ?? []).map(c => ({
      ...c,
      comment_id:      c.id,
      from_username:   profile?.username ?? 'Me',
      from_avatar_url: profile?.avatar_url ?? null,
      from_user_id:    userId,
      for_user_id:     userId,
    }))

    // Merge: avoid duplicates when sent to self (comment already in inbox)
    const receivedIds = new Set((received ?? []).map(c => c.comment_id))
    const merged = [
      ...(received ?? []),
      ...sentNormalized.filter(c => !receivedIds.has(c.id)),
    ]

    await sendPins(merged)
  }

  async function togglePins() {
    if (!session) return
    const next = !pinsVisible
    setPinsVisible(next)
    chrome.storage.local.set({ pinsVisible: next })
    await applyPins(next, session.user.id)
  }

  async function handleNewComment() {
    setNewCommentErr(null)
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!activeTab?.id) return

    const url = activeTab.url ?? ''
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:') || url.startsWith('edge://')) {
      setNewCommentErr('This page does not support comments.')
      return
    }

    const activate = async () => {
      await chrome.tabs.sendMessage(activeTab.id!, { type: 'ACTIVATE_PIN_PICKER' })
    }

    try {
      await activate()
    } catch {
      // Content script absent — automatic re-injection
      try {
        const manifest = chrome.runtime.getManifest()
        const files    = manifest.content_scripts?.[0]?.js ?? []
        await chrome.scripting.executeScript({ target: { tabId: activeTab.id! }, files })
        await activate()
      } catch {
        setNewCommentErr('This page does not support comments.')
        return
      }
    }

    window.close()
  }

  async function handleShare() {
    if (!session) return
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!activeTab?.url) return

    const { data, error } = await supabase.functions.invoke('create-share-link', {
      body: { url: activeTab.url, scope: 'page' },
    })
    if (error || !data?.share_url) return

    await navigator.clipboard.writeText(data.share_url as string)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <div className="w-full h-full flex flex-col bg-white">

      {/* Header */}
      <div className="flex items-center justify-between px-4 border-b border-gray-100 h-12 flex-shrink-0">
        <span className="font-semibold text-blue-600 text-[14px] tracking-tight">WebComment</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleShare}
            title="Share this page"
            className={`flex items-center gap-1 px-2.5 py-1 text-[12px] rounded-md transition-colors duration-150 border ${
              copied
                ? 'border-green-200 bg-green-50 text-green-600'
                : 'border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300'
            }`}
          >
            <Icon icon={copied ? checkIcon : arrowUpRightIcon} width={12} height={12} />
            {copied ? 'Copied' : 'Share'}
          </button>
          <button
            onClick={togglePins}
            title={pinsVisible ? 'Hide comments' : 'Show comments on the page'}
            className={`flex items-center gap-1 px-2.5 py-1 text-[12px] rounded-md transition-colors duration-150 border ${
              pinsVisible
                ? 'border-blue-200 bg-blue-50 text-blue-600'
                : 'border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300'
            }`}
          >
            <Icon icon={pinsVisible ? mapPinIcon : mapPinOffIcon} width={12} height={12} />
            Pins
          </button>
          <button
            onClick={() => setSettings(s => !s)}
            title="Settings"
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors duration-150 ${
              settings ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Icon icon={userIcon} width={15} height={15} />
          </button>
        </div>
      </div>

      {/* Tabs — hidden in settings mode */}
      {!settings && (
        <div className="flex border-b border-gray-100 flex-shrink-0">
          {(['inbox', 'sent'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-[13px] font-medium transition-colors duration-150 border-b-2 ${
                tab === t
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t === 'inbox' ? 'Inbox' : 'My comments'}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {settings
          ? <Settings profile={profile} onClose={() => setSettings(false)} />
          : tab === 'inbox'
            ? <Inbox userId={session.user.id} onRead={() => refreshBadge(session.user.id)} />
            : <Sent  userId={session.user.id} onCommentDeleted={() => pinsVisible && applyPins(true, session.user.id)} />
        }
      </div>

      {/* Footer — always visible except in settings */}
      {!settings && (
        <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 space-y-1.5">
          {newCommentErr && (
            <p className="text-[11px] text-red-500 text-center">{newCommentErr}</p>
          )}
          <Button
            onClick={handleNewComment}
            className="flex items-center justify-center gap-1.5"
          >
            <Icon icon={plusIcon} width={14} height={14} />
            New comment
          </Button>
        </div>
      )}

    </div>
  )
}
