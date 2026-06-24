import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Inbox, MessageSquare, Users, UsersRound, Rss, Sparkles, Settings, Download, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../../components/Spinner'
import { NavItem } from './NavItem'
import { SearchBar } from './SearchBar'
import { SearchResultsPage } from './SearchResultsPage'
import { UserMenu } from './UserMenu'
import { useExtensionInstalled } from '../../lib/useExtensionInstalled'
import type { Profile, FilterType, DashboardContext } from '../../lib/types'
import type { Session } from '@supabase/supabase-js'

const GITHUB_URL = 'https://github.com/flobutbut/webcomment'
const BANNER_DISMISSED_KEY = 'webcomment_ext_banner_dismissed'

export function DashboardLayout() {
  const [session,    setSession]    = useState<Session | null>(null)
  const [profile,    setProfile]    = useState<Profile | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [filterTypes, setFilterTypes] = useState<Set<FilterType>>(new Set())
  const [search,      setSearch]      = useState('')
  const [bannerDismissed, setBannerDismissed] = useState(
    () => localStorage.getItem(BANNER_DISMISSED_KEY) === '1'
  )
  const extensionInstalled = useExtensionInstalled()

  function dismissBanner() {
    localStorage.setItem(BANNER_DISMISSED_KEY, '1')
    setBannerDismissed(true)
  }

  function toggleFilter(f: FilterType) {
    setFilterTypes(prev => {
      const next = new Set(prev)
      if (next.has(f)) next.delete(f)
      else next.add(f)
      return next
    })
  }
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate('/', { replace: true })
      } else {
        setSession(data.session)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') navigate('/', { replace: true })
      if (s) setSession(s)
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  useEffect(() => {
    if (!session) return
    supabase
      .from('profiles')
      .select('id, username, email, baseline, avatar_url, initials, created_at')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setProfile(data))
  }, [session?.user.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!session) return null

  const outletContext: DashboardContext = {
    userId: session.user.id,
    profile,
    search,
    filterTypes,
  }

  const showBanner = extensionInstalled === false && !bannerDismissed

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">

      {/* ── Extension install banner ──────────────────────────── */}
      {showBanner && (
        <div className="flex-shrink-0 bg-amber-400 text-amber-950 flex items-center justify-between px-4 py-2 gap-4">
          <div className="flex items-center gap-2 text-sm font-medium min-w-0">
            <Download className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">
              Install the Chrome extension to annotate any web page — the full WebComment experience.
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold bg-amber-950 text-amber-50 px-3 py-1 rounded-lg hover:bg-amber-900 transition-colors whitespace-nowrap"
            >
              Install extension
            </a>
            <button
              onClick={dismissBanner}
              aria-label="Dismiss"
              className="p-1 rounded hover:bg-amber-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
        <div className="h-14 flex items-center px-4 border-b border-gray-200 flex-shrink-0">
          <span className="font-mono text-xs font-bold tracking-widest text-gray-900">WEBCOMMENT</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 bg-white">
          <NavItem to="/dashboard/inbox"       icon={<Inbox         className="w-4 h-4" />} label="Inbox"       />
          <NavItem to="/dashboard/my-comments" icon={<MessageSquare className="w-4 h-4" />} label="My Comments" />
          <NavItem to="/dashboard/contacts"    icon={<Users         className="w-4 h-4" />} label="Contacts"    />

          <div className="my-2 border-t border-gray-200" />

          <NavItem to="/dashboard/groups" icon={<UsersRound className="w-4 h-4" />} label="Groups" comingSoon />
          <NavItem to="/dashboard/feed"   icon={<Rss        className="w-4 h-4" />} label="Feed"   comingSoon />
        </nav>

        <div className="p-3 border-t border-gray-200 space-y-0.5 bg-white flex-shrink-0">
          <NavItem to="/dashboard/whats-new" icon={<Sparkles className="w-4 h-4" />} label="What's new" comingSoon />
          <NavItem to="/dashboard/settings"  icon={<Settings  className="w-4 h-4" />} label="Settings"   />
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        <header className="h-14 flex-shrink-0 bg-white border-b border-gray-200 flex items-center px-6">
          <div className="flex-1" />
          <div className="flex-1 flex justify-center">
            <SearchBar
              query={search}
              setQuery={setSearch}
              filterTypes={filterTypes}
              toggleFilter={toggleFilter}
            />
          </div>
          <div className="flex-1 flex justify-end">
            <UserMenu profile={profile} session={session} />
          </div>
        </header>

        <main className="flex-1 overflow-hidden bg-white">
          {search
            ? <SearchResultsPage userId={session.user.id} search={search} filterTypes={filterTypes} />
            : <Outlet context={outletContext} />
          }
        </main>
      </div>
      </div>
    </div>
  )
}
