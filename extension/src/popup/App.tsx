import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Icon } from '@iconify/react'
import mapPinIcon       from '@iconify-icons/lucide/map-pin'
import mapPinOffIcon    from '@iconify-icons/lucide/map-pin-off'
import userIcon         from '@iconify-icons/lucide/user'
import externalLinkIcon from '@iconify-icons/lucide/external-link'
import { supabase } from '../shared/supabase'
import type { Profile } from '../shared/types'
import { Button }   from './components/Button'
import { Tabs }     from './components/Tabs'
import { Login }    from './views/Login'
import { Inbox }    from './views/Inbox'
import { Sent }     from './views/Sent'
import { Feed }     from './views/Feed'
import { Settings } from './views/Settings'

const WEBAPP_URL = (import.meta.env.VITE_SHARE_BASE_URL as string) || 'https://webcomment.app'

type Tab = 'inbox' | 'sent' | 'feed'

const MAIN_TABS = [
  { value: 'inbox' as Tab, label: 'Inbox'       },
  { value: 'sent'  as Tab, label: 'My comments' },
  { value: 'feed'  as Tab, label: 'Feed'        },
]

export function App() {
  const [session,             setSession]             = useState<Session | null>(null)
  const [profile,             setProfile]             = useState<Profile | null>(null)
  const [tab,                 setTab]                 = useState<Tab>('inbox')
  const [settings,            setSettings]            = useState(false)
  const [loading,             setLoading]             = useState(true)
  const [newCommentErr,       setNewCommentErr]       = useState<string | null>(null)
  const [pinsVisible,         setPinsVisible]         = useState(false)
  const [pendingContactCount, setPendingContactCount] = useState(0)

  // Auth
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
        chrome.storage.local.remove(['session', 'profile'])
        setProfile(null); setSettings(false); setTab('inbox')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Profile
  useEffect(() => {
    if (!session) return
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        setProfile(data)
        if (data) chrome.storage.local.set({ profile: data })
      })
  }, [session])

  // Badge + contact count on session load
  useEffect(() => {
    if (!session) {
      setPendingContactCount(0)
      return
    }
    chrome.runtime.sendMessage({ type: 'UPDATE_BADGE' })
    refreshContactBadge(session.user.id)
  }, [session])

  async function refreshContactBadge(userId: string) {
    const { data } = await supabase
      .from('contacts')
      .select('id')
      .eq('addressee_id', userId)
      .eq('status', 'pending')
    setPendingContactCount(data?.length ?? 0)
  }

  // Restore pins state on session load
  useEffect(() => {
    if (!session) return
    chrome.storage.local.get('pinsVisible', ({ pinsVisible: saved }) => {
      const visible = saved !== false
      setPinsVisible(visible)
      if (visible) {
        chrome.runtime.sendMessage({ type: 'REFRESH_PINS', payload: { visible: true } })
      }
    })
  }, [session?.user.id])

  async function togglePins() {
    if (!session) return
    const next = !pinsVisible
    setPinsVisible(next)
    chrome.storage.local.set({ pinsVisible: next })
    chrome.runtime.sendMessage({ type: 'REFRESH_PINS', payload: { visible: next } })
  }

  async function openWebApp() {
    const { data: { session: currentSession } } = await supabase.auth.getSession()
    let url = WEBAPP_URL
    if (currentSession) {
      const hash = `access_token=${currentSession.access_token}&refresh_token=${currentSession.refresh_token}&type=magiclink`
      url = `${WEBAPP_URL}/dashboard#${hash}`
    }
    chrome.tabs.create({ url })
    window.close()
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

    try {
      await chrome.tabs.sendMessage(activeTab.id, { type: 'ACTIVATE_PIN_PICKER' })
    } catch {
      try {
        const manifest = chrome.runtime.getManifest()
        const files    = manifest.content_scripts?.[0]?.js ?? []
        await chrome.scripting.executeScript({ target: { tabId: activeTab.id }, files })
        await chrome.tabs.sendMessage(activeTab.id, { type: 'ACTIVATE_PIN_PICKER' })
      } catch {
        setNewCommentErr('This page does not support comments.')
        return
      }
    }

    window.close()
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-sm text-gray-400">Loading…</span>
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
            className={`relative w-7 h-7 flex items-center justify-center rounded-md transition-colors duration-150 ${
              settings ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Icon icon={userIcon} width={15} height={15} />
            {pendingContactCount > 0 && (
              <span className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none px-[3px]">
                {pendingContactCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tabs — hidden in settings mode */}
      {!settings && <Tabs tabs={MAIN_TABS} active={tab} onChange={setTab} />}

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {settings
          ? <Settings
              profile={profile}
              onClose={() => setSettings(false)}
              onContactChange={() => refreshContactBadge(session.user.id)}
            />
          : tab === 'inbox'
            ? <Inbox userId={session.user.id} onRead={() => chrome.runtime.sendMessage({ type: 'UPDATE_BADGE' })} />
            : tab === 'sent'
              ? <Sent userId={session.user.id} />
              : <Feed userId={session.user.id} />
        }
      </div>

      {/* Footer */}
      {!settings && (
        <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 space-y-1.5">
          {newCommentErr && (
            <p className="text-[11px] text-red-500 text-center">{newCommentErr}</p>
          )}
          <Button
            onClick={handleNewComment}
            className="flex items-center justify-center gap-1.5"
          >
            New comment
            <span className="ml-1 text-[10px] opacity-50 font-normal">Alt+Shift+N</span>
          </Button>
          <button
            onClick={openWebApp}
            className="flex items-center justify-center gap-1 w-full text-[11px] text-gray-400 hover:text-blue-500 transition-colors duration-150"
          >
            <Icon icon={externalLinkIcon} width={10} height={10} />
            Open web app
          </button>
        </div>
      )}

    </div>
  )
}
