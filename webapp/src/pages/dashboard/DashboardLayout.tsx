import { useCallback, useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Inbox, MessageSquare, Users, UsersRound, Rss, Sparkles, Settings, Download, X, Sun, Moon } from 'lucide-react'
import { IconButton } from '../../components/IconButton'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../../components/Spinner'
import { NavItem } from './NavItem'
import { SearchBar } from './SearchBar'
import { SearchResultsPage } from './SearchResultsPage'
import { UserMenu } from './UserMenu'
import { useExtensionInstalled } from '../../lib/useExtensionInstalled'
import { useTheme } from '../../lib/useTheme'
import type { Profile, FilterType, DashboardContext } from '../../lib/types'
import type { Session } from '@supabase/supabase-js'

const GITHUB_URL = 'https://github.com/flobutbut/webcomment'
const BANNER_DISMISSED_KEY = 'webcomment_ext_banner_dismissed'

export function DashboardLayout() {
  const { theme, setTheme } = useTheme()
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

  const toggleFilter = useCallback((f: FilterType) => {
    setFilterTypes(prev => {
      const next = new Set(prev)
      if (next.has(f)) next.delete(f)
      else next.add(f)
      return next
    })
  }, [])
  const navigate = useNavigate()

  useEffect(() => {
    const hasHashTokens = window.location.hash.includes('access_token=')

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession(data.session)
        setLoading(false)
      } else if (!hasHashTokens) {
        navigate('/', { replace: true })
        setLoading(false)
      }
      // else: Supabase is exchanging hash tokens async — wait for onAuthStateChange
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (s) {
        setSession(s)
        setLoading(false)
      }
      if (event === 'SIGNED_OUT') navigate('/', { replace: true })
      // Hash exchange failed: INITIAL_SESSION fires with no session
      if (event === 'INITIAL_SESSION' && !s && hasHashTokens) {
        navigate('/', { replace: true })
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  async function refreshProfile() {
    if (!session?.user.id) return
    const { data } = await supabase
      .from('profiles')
      .select('id, username, email, baseline, avatar_url, initials, created_at')
      .eq('id', session.user.id)
      .single()
    setProfile(data)
  }

  useEffect(() => {
    refreshProfile()
  }, [session?.user.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-dark-900 flex items-center justify-center">
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
    refreshProfile,
    theme,
    setTheme,
  }

  const showBanner = extensionInstalled === false && !bannerDismissed

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-dark-800 overflow-hidden">

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
              className="text-xs font-semibold bg-amber-950 text-amber-50 px-3 py-1 rounded-6 hover:bg-amber-900 transition-colors whitespace-nowrap"
            >
              Install extension
            </a>
            <IconButton
              onClick={dismissBanner}
              aria-label="Dismiss"
              className="hover:bg-amber-500 hover:text-current rounded-3"
            >
              <X className="w-4 h-4" />
            </IconButton>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 bg-white dark:bg-dark-900 border-r border-gray-200 dark:border-dark-border flex flex-col overflow-hidden">
        <div className="h-14 flex items-center px-4 border-b border-gray-200 dark:border-dark-border flex-shrink-0">
          <span className="font-mono text-xs font-bold tracking-widest text-gray-900 dark:text-gray-100">WEBCOMMENT</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 bg-white dark:bg-dark-900">
          <NavItem to="/dashboard/inbox"       icon={<Inbox         className="w-4 h-4" />} label="Inbox"       />
          <NavItem to="/dashboard/feed"        icon={<Rss           className="w-4 h-4" />} label="Feed"        />
          <NavItem to="/dashboard/my-comments" icon={<MessageSquare className="w-4 h-4" />} label="My Comments" />
          <NavItem to="/dashboard/contacts"    icon={<Users         className="w-4 h-4" />} label="Contacts"    />

          <div className="my-2 border-t border-gray-200 dark:border-dark-border" />

          <NavItem to="/dashboard/groups" icon={<UsersRound className="w-4 h-4" />} label="Groups" />
        </nav>

        <div className="p-3 border-t border-gray-200 dark:border-dark-border space-y-0.5 bg-white dark:bg-dark-900 flex-shrink-0">
          <NavItem to="/dashboard/whats-new" icon={<Sparkles className="w-4 h-4" />} label="What's new" comingSoon />
          <NavItem to="/dashboard/settings"  icon={<Settings  className="w-4 h-4" />} label="Settings"   />
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        <header className="h-14 flex-shrink-0 bg-white dark:bg-dark-900 border-b border-gray-200 dark:border-dark-border flex items-center px-6">
          <div className="flex-1" />
          <div className="flex-1 flex justify-center">
            <SearchBar
              query={search}
              setQuery={setSearch}
              filterTypes={filterTypes}
              toggleFilter={toggleFilter}
            />
          </div>
          <div className="flex-1 flex items-center justify-end gap-1">
            <UserMenu profile={profile} session={session} />
            <IconButton
              onClick={() => {
                const effective = theme === 'system'
                  ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                  : theme
                setTheme(effective === 'dark' ? 'light' : 'dark')
              }}
              aria-label="Toggle theme"
              className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
            >
              {(theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches))
                ? <Sun  className="w-4 h-4" />
                : <Moon className="w-4 h-4" />
              }
            </IconButton>
          </div>
        </header>

        <main className="flex-1 overflow-hidden bg-white dark:bg-dark-800">
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
