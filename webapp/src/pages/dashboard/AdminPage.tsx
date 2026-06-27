import { useEffect, useRef, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Users, MessageSquare, UsersRound, Handshake, Check, X, Trash2, Send } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../../components/Spinner'
import { Avatar } from '../../components/Avatar'
import { BodyText } from '../../components/BodyText'
import { Input } from '../../components/Input'
import { PageHeader } from '../../components/PageHeader'
import type { DashboardContext, Mention } from '../../lib/types'

const ADMIN_EMAIL  = (import.meta.env.VITE_ADMIN_EMAIL ?? '') as string
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminUser {
  id:                    string
  username:              string
  email:                 string
  avatar_url:            string | null
  initials:              string | null
  created_at:            string
  is_seed:               boolean
  extension_version:     string | null
  extension_last_active: string | null
  last_seen_webapp_at:   string | null
}

interface InviteRequest {
  id:         string
  full_name:  string
  email:      string
  status:     'pending' | 'approved' | 'rejected'
  token:      string
  created_at: string
}

interface AdminComment {
  id:         string
  url:        string
  body:       string
  created_at: string
  profiles:   { username: string; avatar_url: string | null; initials: string | null; is_seed: boolean } | null
}

interface Stats {
  users:    number
  comments: number
  groups:   number
  contacts: number
}

type ActivityItem = { type: 'signup'; date: string; username: string; email: string; is_seed: boolean }

type Tab = 'invites' | 'stats' | 'users' | 'comments' | 'activity'

const TABS: { id: Tab; label: string }[] = [
  { id: 'stats',    label: 'Stats'     },
  { id: 'invites',  label: 'Invites'   },
  { id: 'users',    label: 'Users'     },
  { id: 'comments', label: 'Comments'  },
  { id: 'activity', label: 'Activity'  },
]

// ── Root ──────────────────────────────────────────────────────────────────────

export function AdminPage() {
  const { profile, userId } = useOutletContext<DashboardContext>()
  const navigate = useNavigate()
  const [tab,      setTab]      = useState<Tab>('stats')
  const [hideSeed, setHideSeed] = useState(true)

  useEffect(() => {
    if (profile && profile.email !== ADMIN_EMAIL) {
      navigate('/dashboard', { replace: true })
    }
  }, [profile])

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader
        title="Admin"
        right={
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs text-gray-500 dark:text-gray-400">Seed accounts</span>
            <ToggleSwitch checked={!hideSeed} onChange={() => setHideSeed(v => !v)} />
          </label>
        }
      />

      {/* Tab bar */}
      <div className="flex-shrink-0 flex gap-0.5 px-4 pt-3 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-900">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'px-3 py-2 text-sm font-medium rounded-t transition-colors',
              tab === t.id
                ? 'text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100 -mb-px'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto bg-white dark:bg-dark-800">
        {tab === 'invites'  && <InvitesTab />}
        {tab === 'stats'    && <StatsTab />}
        {tab === 'users'    && <UsersTab    hideSeed={hideSeed} currentUserId={userId} />}
        {tab === 'comments' && <CommentsTab hideSeed={hideSeed} />}
        {tab === 'activity' && <ActivityTab hideSeed={hideSeed} />}
      </div>
    </div>
  )
}

// ── Stats tab ─────────────────────────────────────────────────────────────────

function StatsTab() {
  const [stats,   setStats]   = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('comments').select('*', { count: 'exact', head: true }),
      supabase.from('groups').select('*', { count: 'exact', head: true }),
      supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
    ]).then(([u, c, g, co]) => {
      setStats({ users: u.count ?? 0, comments: c.count ?? 0, groups: g.count ?? 0, contacts: co.count ?? 0 })
      setLoading(false)
    })
  }, [])

  if (loading) return <TabSpinner />

  return (
    <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard icon={<Users         className="w-5 h-5" />} label="Users"     value={stats!.users}    color="blue"   />
      <StatCard icon={<MessageSquare className="w-5 h-5" />} label="Comments"  value={stats!.comments} color="violet" />
      <StatCard icon={<UsersRound    className="w-5 h-5" />} label="Groups"    value={stats!.groups}   color="green"  />
      <StatCard icon={<Handshake     className="w-5 h-5" />} label="Contacts"  value={stats!.contacts} color="amber"  />
    </div>
  )
}

function StatCard({ icon, label, value, color }: {
  icon:  React.ReactNode
  label: string
  value: number
  color: 'blue' | 'violet' | 'green' | 'amber'
}) {
  const cls = {
    blue:   'bg-blue-50   text-blue-600   dark:bg-blue-950/30   dark:text-blue-400',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400',
    green:  'bg-green-50  text-green-600  dark:bg-green-950/30  dark:text-green-400',
    amber:  'bg-amber-50  text-amber-600  dark:bg-amber-950/30  dark:text-amber-400',
  }
  return (
    <div className="bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-border rounded-xl p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg flex-shrink-0 ${cls[color]}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-none">{value.toLocaleString()}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
      </div>
    </div>
  )
}

// ── Users tab ─────────────────────────────────────────────────────────────────

function UsersTab({ hideSeed, currentUserId }: { hideSeed: boolean; currentUserId: string }) {
  const [users,      setUsers]      = useState<AdminUser[]>([])
  const [loading,    setLoading]    = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, username, email, avatar_url, initials, created_at, is_seed, extension_version, extension_last_active, last_seen_webapp_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setUsers((data as AdminUser[]) ?? []); setLoading(false) })
  }, [])

  async function deleteUser(u: AdminUser) {
    if (!confirm(`Permanently delete ${u.username}'s account (${u.email})?\n\nThis cannot be undone.`)) return
    setDeletingId(u.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session!.access_token}` },
        body: JSON.stringify({ target_user_id: u.id }),
      })
      if (!res.ok) throw new Error('Delete failed')
      setUsers(prev => prev.filter(x => x.id !== u.id))
    } catch (e) {
      console.error(e)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <TabSpinner />

  const visible = hideSeed ? users.filter(u => !u.is_seed) : users

  return (
    <div className="p-6">
      <ResizableTable columns={[
        { label: 'User',      ratio: 3.5 },
        { label: 'Email',     ratio: 3   },
        { label: 'Extension', ratio: 1.5 },
        { label: 'Last seen', ratio: 1.5 },
        { label: 'Joined',    ratio: 1.5 },
        { label: '',          ratio: 0.7 },
      ]}>
        <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
          {visible.map(u => (
            <tr key={u.id} className="group hover:bg-gray-50 dark:hover:bg-dark-800/50 transition-colors">
              <td className="py-2.5 pr-4 truncate">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar username={u.username} initials={u.initials} avatarUrl={u.avatar_url} size="sm" />
                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{u.username}</span>
                  {u.is_seed && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-dark-700 text-gray-400 dark:text-gray-500 font-mono flex-shrink-0">
                      seed
                    </span>
                  )}
                </div>
              </td>
              <td className="py-2.5 pr-4 text-gray-500 dark:text-gray-400 truncate">{u.email}</td>
              <td className="py-2.5 pr-4">
                {u.extension_version
                  ? <span className="inline-flex items-center gap-1 text-xs font-mono px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400">
                      v{u.extension_version}
                    </span>
                  : <span className="text-gray-300 dark:text-gray-600">—</span>
                }
              </td>
              <td className="py-2.5 pr-4 text-gray-400 dark:text-gray-500 text-xs">
                <LastSeenCell webappAt={u.last_seen_webapp_at} extAt={u.extension_last_active} />
              </td>
              <td className="py-2.5 pr-4 text-gray-400 dark:text-gray-500">{relativeTime(u.created_at)}</td>
              <td className="py-2.5">
                {u.id !== currentUserId && (
                  <button
                    onClick={() => deleteUser(u)}
                    disabled={deletingId === u.id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:cursor-wait"
                    aria-label="Delete account"
                  >
                    {deletingId === u.id ? <Spinner size="sm" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </ResizableTable>
      {visible.length === 0 && <EmptyMsg>No users.</EmptyMsg>}
    </div>
  )
}

// ── Invites tab ───────────────────────────────────────────────────────────────

function InvitesTab() {
  const [invites,  setInvites]  = useState<InviteRequest[]>([])
  const [loading,  setLoading]  = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [email,    setEmail]    = useState('')
  const [name,     setName]     = useState('')
  const [sending,  setSending]  = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  async function load() {
    const { data } = await supabase
      .from('invite_requests')
      .select('id, full_name, email, status, token, created_at')
      .order('created_at', { ascending: false })
    setInvites((data as InviteRequest[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function sendDirectInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    setFeedback(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${SUPABASE_URL}/functions/v1/approve-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session!.access_token}` },
        body: JSON.stringify({ action: 'direct', email: email.trim(), full_name: name.trim() }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Erreur')
      setFeedback({ ok: true, msg: `Invitation sent to ${email.trim()}` })
      setEmail('')
      setName('')
      emailRef.current?.focus()
      await load()
    } catch (err: unknown) {
      setFeedback({ ok: false, msg: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setSending(false)
    }
  }

  async function act(invite: InviteRequest, action: 'approve' | 'reject') {
    setActingId(invite.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${SUPABASE_URL}/functions/v1/approve-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session!.access_token}` },
        body: JSON.stringify({ invite_id: invite.id, action }),
      })
      if (!res.ok) throw new Error('Action failed')
      await load()
    } catch (e) {
      console.error(e)
    } finally {
      setActingId(null)
    }
  }

  if (loading) return <TabSpinner />

  const pending = invites.filter(i => i.status === 'pending')
  const others  = invites.filter(i => i.status !== 'pending')

  return (
    <div className="p-6 space-y-6">

      {/* Direct invite form */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
          Invite directly
        </h2>
        <form onSubmit={sendDirectInvite} className="flex items-end gap-2">
          <div className="flex-1 min-w-0">
            <Input
              ref={emailRef}
              type="email"
              placeholder="address@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={sending}
            />
          </div>
          <div className="w-44 flex-shrink-0">
            <Input
              type="text"
              placeholder="Name (optional)"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={sending}
            />
          </div>
          <button
            type="submit"
            disabled={sending || !email.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait transition-colors flex-shrink-0"
          >
            {sending ? <Spinner size="sm" /> : <Send className="w-3.5 h-3.5" />}
            Invite
          </button>
        </form>
        {feedback && (
          <p className={`mt-2 text-xs ${feedback.ok ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {feedback.msg}
          </p>
        )}
      </section>

      {pending.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
            Pending ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map(inv => (
              <div
                key={inv.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{inv.full_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{inv.email} · {relativeTime(inv.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <ActionBtn onClick={() => act(inv, 'approve')} disabled={actingId === inv.id} variant="approve">
                    {actingId === inv.id ? <Spinner size="sm" /> : <Check className="w-3.5 h-3.5" />}
                    Approve
                  </ActionBtn>
                  <ActionBtn onClick={() => act(inv, 'reject')} disabled={actingId === inv.id} variant="reject">
                    <X className="w-3.5 h-3.5" />
                    Reject
                  </ActionBtn>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
            History
          </h2>
          <ResizableTable columns={[
            { label: 'Name',   ratio: 3 },
            { label: 'Email',  ratio: 4 },
            { label: 'Status', ratio: 2 },
            { label: 'Date',   ratio: 2 },
          ]}>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
              {others.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-dark-800/50 transition-colors">
                  <td className="py-2.5 pr-4 font-medium text-gray-900 dark:text-gray-100 truncate">{inv.full_name}</td>
                  <td className="py-2.5 pr-4 text-gray-500 dark:text-gray-400 truncate">{inv.email}</td>
                  <td className="py-2.5 pr-4"><StatusBadge status={inv.status} /></td>
                  <td className="py-2.5 text-gray-400 dark:text-gray-500">{relativeTime(inv.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </ResizableTable>
        </section>
      )}

      {invites.length === 0 && <EmptyMsg>No invite requests.</EmptyMsg>}
    </div>
  )
}

// ── Comments tab ──────────────────────────────────────────────────────────────

function CommentsTab({ hideSeed }: { hideSeed: boolean }) {
  const [comments,    setComments]    = useState<AdminComment[]>([])
  const [profilesMap, setProfilesMap] = useState<Map<string, string>>(new Map())
  const [loading,     setLoading]     = useState(true)
  const [deletingId,  setDeletingId]  = useState<string | null>(null)

  async function load() {
    const [{ data: commentsData }, { data: profilesData }] = await Promise.all([
      supabase
        .from('comments')
        .select('id, url, body, created_at, profiles(username, avatar_url, initials, is_seed)')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('profiles').select('id, username'),
    ])
    setComments((commentsData as unknown as AdminComment[]) ?? [])
    setProfilesMap(new Map(profilesData?.map(p => [p.id, p.username]) ?? []))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function deleteComment(id: string) {
    if (!confirm('Permanently delete this comment?')) return
    setDeletingId(id)
    await supabase.from('comments').delete().eq('id', id)
    setComments(prev => prev.filter(c => c.id !== id))
    setDeletingId(null)
  }

  if (loading) return <TabSpinner />

  const visible = hideSeed ? comments.filter(c => !c.profiles?.is_seed) : comments

  return (
    <div className="p-6">
      <ResizableTable columns={[
        { label: 'Author',  ratio: 3   },
        { label: 'Page',    ratio: 2.5 },
        { label: 'Content', ratio: 4   },
        { label: 'Date',    ratio: 1.5 },
        { label: '',        ratio: 0.7 },
      ]}>
        <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
          {visible.map(c => (
            <tr key={c.id} className="group hover:bg-gray-50 dark:hover:bg-dark-800/50 transition-colors">
              <td className="py-2.5 pr-4 truncate">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar
                    username={c.profiles?.username ?? '?'}
                    initials={c.profiles?.initials ?? null}
                    avatarUrl={c.profiles?.avatar_url ?? null}
                    size="sm"
                  />
                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {c.profiles?.username ?? 'Deleted user'}
                  </span>
                </div>
              </td>
              <td className="py-2.5 pr-4 text-gray-500 dark:text-gray-400 truncate">
                {safeHostname(c.url)}
              </td>
              <td className="py-2.5 pr-4 truncate">
                <BodyText
                  body={c.body}
                  mentions={mentionsFor(c.body, profilesMap)}
                  className="text-gray-600 dark:text-gray-300 text-sm"
                />
              </td>
              <td className="py-2.5 pr-4 text-gray-400 dark:text-gray-500">
                {relativeTime(c.created_at)}
              </td>
              <td className="py-2.5">
                <button
                  onClick={() => deleteComment(c.id)}
                  disabled={deletingId === c.id}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:cursor-wait"
                  aria-label="Delete comment"
                >
                  {deletingId === c.id ? <Spinner size="sm" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </ResizableTable>
      {visible.length === 0 && <EmptyMsg>No comments.</EmptyMsg>}
    </div>
  )
}

// ── Activity tab ──────────────────────────────────────────────────────────────

function ActivityTab({ hideSeed }: { hideSeed: boolean }) {
  const [items,   setItems]   = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('profiles')
      .select('id, username, email, created_at, is_seed')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data: signups }) => {
        const all: ActivityItem[] = (signups ?? []).map((s: { username: string; email: string; created_at: string; is_seed: boolean }) => ({
          type: 'signup' as const, date: s.created_at, username: s.username, email: s.email, is_seed: s.is_seed,
        }))
        setItems(all)
        setLoading(false)
      })
  }, [])

  if (loading) return <TabSpinner />

  const visible = hideSeed ? items.filter(i => !i.is_seed) : items

  return (
    <div className="p-6 space-y-0.5">
      {visible.map((item, i) => (
        <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors">
          <span className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0 bg-green-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 dark:text-gray-100">
              <span className="font-medium">{item.username}</span>
              <span className="text-gray-500 dark:text-gray-400"> signed up</span>
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{item.email} · {relativeTime(item.date)}</p>
          </div>
        </div>
      ))}
      {visible.length === 0 && <EmptyMsg>No activity.</EmptyMsg>}
    </div>
  )
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function LastSeenCell({ webappAt, extAt }: { webappAt: string | null; extAt: string | null }) {
  const latest = [webappAt, extAt]
    .filter(Boolean)
    .sort()
    .at(-1)
  if (!latest) return <span className="text-gray-300 dark:text-gray-600">—</span>
  const isExt = latest === extAt && extAt !== webappAt
  return (
    <span className="flex items-center gap-1">
      <span className="text-[10px] text-gray-300 dark:text-gray-600">{isExt ? '⬡' : '⬢'}</span>
      {relativeTime(latest)}
    </span>
  )
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-dark-600'
      }`}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-4' : 'translate-x-1'
      }`} />
    </button>
  )
}

function TabSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Spinner size="lg" />
    </div>
  )
}

function EmptyMsg({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">{children}</p>
}

function ActionBtn({ children, onClick, disabled, variant }: {
  children: React.ReactNode
  onClick: () => void
  disabled: boolean
  variant: 'approve' | 'reject'
}) {
  const cls = variant === 'approve'
    ? 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600'
    : 'bg-white dark:bg-dark-900 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-800'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-wait ${cls}`}
    >
      {children}
    </button>
  )
}

function StatusBadge({ status }: { status: InviteRequest['status'] }) {
  const cfg = {
    pending:  'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
    approved: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',
    rejected: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
  }
  const label = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg[status]}`}>
      {label[status]}
    </span>
  )
}

// ── Resizable columns ─────────────────────────────────────────────────────────

function useResizableColumns(initialRatios: number[]) {
  const total = initialRatios.reduce((a, b) => a + b, 0)
  const [widths, setWidths] = useState<number[]>(initialRatios.map(r => (r / total) * 100))

  function startResize(index: number, e: React.MouseEvent) {
    e.preventDefault()
    const table = (e.currentTarget as HTMLElement).closest('table')
    const containerWidth = table?.offsetWidth ?? 800
    const startX  = e.clientX
    const startW  = widths[index]
    const nextW   = widths[index + 1] ?? 0

    function onMove(ev: MouseEvent) {
      const deltaPct = ((ev.clientX - startX) / containerWidth) * 100
      setWidths(prev => {
        const n = [...prev]
        n[index]     = Math.max(4, startW + deltaPct)
        n[index + 1] = Math.max(4, nextW  - deltaPct)
        return n
      })
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
  }

  return { widths, startResize }
}

function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <span
      onMouseDown={onMouseDown}
      className="absolute right-0 top-0 bottom-0 w-4 flex items-center justify-center cursor-col-resize select-none group/rh hover:bg-blue-500/10 dark:hover:bg-blue-400/10 rounded transition-colors"
    >
      <span className="w-0.5 h-4 rounded-full bg-gray-300 dark:bg-dark-600 opacity-0 group-hover/rh:opacity-100 group-hover/rh:bg-blue-500 dark:group-hover/rh:bg-blue-400 transition-all" />
    </span>
  )
}

interface ColDef { label: React.ReactNode; ratio: number }

function ResizableTable({ columns, children }: { columns: ColDef[]; children: React.ReactNode }) {
  const { widths, startResize } = useResizableColumns(columns.map(c => c.ratio))
  return (
    <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
      <colgroup>{widths.map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
      <thead>
        <tr className="text-left text-xs text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-dark-border">
          {columns.map((col, i) => {
            const last = i === columns.length - 1
            return (
              <th key={i} className={last ? 'pb-2' : 'relative pb-2 font-medium'}>
                {col.label}
                {!last && <ResizeHandle onMouseDown={e => startResize(i, e)} />}
              </th>
            )
          })}
        </tr>
      </thead>
      {children}
    </table>
  )
}

// ── Utils ─────────────────────────────────────────────────────────────────────

function mentionsFor(body: string, map: Map<string, string>): Mention[] {
  const seen = new Set<string>()
  const out: Mention[] = []
  for (const [, id] of body.matchAll(/@\[([0-9a-f-]{36})\]/g)) {
    if (!seen.has(id) && map.has(id)) {
      out.push({ id, username: map.get(id)! })
      seen.add(id)
    }
  }
  return out
}

function safeHostname(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d`
  return new Date(iso).toLocaleDateString('en', { day: 'numeric', month: 'short' })
}
