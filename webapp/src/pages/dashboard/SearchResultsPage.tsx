import { useEffect, useState } from 'react'
import { ImageOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { hostname, timeAgo } from '../../lib/utils'
import { Avatar } from '../../components/Avatar'
import { Spinner } from '../../components/Spinner'
import { EmptyState } from '../../components/EmptyState'
import { CommentDetail } from './CommentDetail'
import type { CommentInboxItem, SentComment, Contact, ContactProfile, FilterType } from '../../lib/types'

type Selected =
  | { kind: 'inbox';   item: CommentInboxItem }
  | { kind: 'sent';    item: SentComment }
  | { kind: 'contact'; item: Contact }

function Thumb({ url, pinX, pinY }: { url: string; pinX: number; pinY: number }) {
  const [err, setErr] = useState(false)
  return (
    <div className="relative w-12 h-8 flex-shrink-0">
      {err ? (
        <div className="w-12 h-8 bg-gray-50 rounded border border-gray-200 flex items-center justify-center">
          <ImageOff className="w-3 h-3 text-gray-300" />
        </div>
      ) : (
        <>
          <img src={url} className="w-12 h-8 object-cover rounded border border-gray-200" alt="" onError={() => setErr(true)} />
          <div className="absolute w-2 h-2 rounded-full bg-blue-600 border border-white shadow-sm"
            style={{ left: `${pinX}%`, top: `${pinY}%`, transform: 'translate(-50%,-50%)' }} />
        </>
      )}
    </div>
  )
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="text-[10px] text-gray-400">{count}</span>
    </div>
  )
}

function ContactCard({ contact, userId }: { contact: Contact; userId: string }) {
  const other = contact.addressee.id === userId ? contact.requester : contact.addressee
  return (
    <div className="p-6 max-w-md mx-auto w-full">
      <div className="flex items-center gap-4 mb-6">
        <Avatar
          username={other.username}
          initials={(other as ContactProfile).initials}
          avatarUrl={other.avatar_url}
          size="lg"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">{other.username}</p>
          {other.baseline && <p className="text-xs text-gray-400">{other.baseline}</p>}
          {contact.status === 'pending' && (
            <span className="inline-block mt-1 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
              Pending
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function SearchResultsPage({ userId, search, filterTypes }: {
  userId:      string
  search:      string
  filterTypes: Set<FilterType>
}) {
  const [inbox,    setInbox]    = useState<CommentInboxItem[]>([])
  const [sent,     setSent]     = useState<SentComment[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<Selected | null>(null)

  useEffect(() => {
    setLoading(true)
    setSelected(null)
    Promise.all([
      supabase
        .from('comment_inbox').select('*')
        .eq('for_user_id', userId)
        .or(`from_user_id.neq.${userId},from_user_id.is.null`)
        .neq('recipient_type', 'public')
        .is('resolved_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('comments')
        .select('id, url, body, tags, screenshot_url, pin_x, pin_y, created_at')
        .eq('from_user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('contacts')
        .select(`id, status, created_at,
          requester:profiles!contacts_requester_id_fkey(id, username, baseline, avatar_url, initials),
          addressee:profiles!contacts_addressee_id_fkey(id, username, baseline, avatar_url, initials)`)
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false }),
    ]).then(([inboxRes, sentRes, contactsRes]) => {
      setInbox(inboxRes.data ?? [])
      setSent(sentRes.data ?? [])
      setContacts((contactsRes.data as unknown as Contact[]) ?? [])
      setLoading(false)
    })
  }, [userId])

  const q      = search.toLowerCase()
  const active = filterTypes.size === 0
    ? new Set<FilterType>(['url', 'user', 'tag'])
    : filterTypes

  const filteredInbox = inbox.filter(c => {
    if (active.has('url')  && c.url.toLowerCase().includes(q))                       return true
    if (active.has('user') && c.from_username.toLowerCase().includes(q))              return true
    if (active.has('tag')  && (c.tags ?? []).some(t => t.toLowerCase().includes(q))) return true
    return false
  })

  const filteredSent = sent.filter(c => {
    if (active.has('url') && c.url.toLowerCase().includes(q))                        return true
    if (active.has('tag') && (c.tags ?? []).some(t => t.toLowerCase().includes(q))) return true
    return false
  })

  const filteredContacts = active.has('user')
    ? contacts.filter(c => {
        const other = c.addressee.id === userId ? c.requester : c.addressee
        return other.username.toLowerCase().includes(q) || (other.baseline ?? '').toLowerCase().includes(q)
      })
    : []

  const total = filteredInbox.length + filteredSent.length + filteredContacts.length

  function isSelected(s: Selected) {
    if (!selected) return false
    if (s.kind !== selected.kind) return false
    if (s.kind === 'inbox'   && selected.kind === 'inbox')   return s.item.recipient_id === selected.item.recipient_id
    if (s.kind === 'sent'    && selected.kind === 'sent')    return s.item.id           === selected.item.id
    if (s.kind === 'contact' && selected.kind === 'contact') return s.item.id           === selected.item.id
    return false
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Spinner /></div>
  }

  const ROW = (active: boolean) =>
    `w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer transition-colors ${
      active ? 'bg-blue-50' : 'hover:bg-gray-50'
    }`

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── List ── */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-gray-500">
            Results for <span className="font-semibold text-gray-900">"{search}"</span>
          </p>
          <span className="text-[11px] text-gray-400">{total}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {total === 0 ? (
            <EmptyState message="No results." variant="list" />
          ) : (
            <>
              {filteredInbox.length > 0 && (
                <section>
                  <SectionHeader label="Inbox" count={filteredInbox.length} />
                  <div className="divide-y divide-gray-200">
                    {filteredInbox.map(c => {
                      const sel: Selected = { kind: 'inbox', item: c }
                      return (
                        <button key={c.recipient_id} onClick={() => setSelected(sel)} className={ROW(isSelected(sel))}>
                          <Thumb url={c.screenshot_url} pinX={c.pin_x} pinY={c.pin_y} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <span className="text-xs font-semibold text-gray-900 truncate">{c.from_username}</span>
                              <span className="text-[11px] text-gray-400 flex-shrink-0">{timeAgo(c.created_at)}</span>
                            </div>
                            <p className="text-[11px] text-gray-400 truncate mb-0.5">{hostname(c.url)}</p>
                            <p className="text-xs text-gray-600 truncate">{c.body}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </section>
              )}

              {filteredSent.length > 0 && (
                <section>
                  <SectionHeader label="My Comments" count={filteredSent.length} />
                  <div className="divide-y divide-gray-200">
                    {filteredSent.map(c => {
                      const sel: Selected = { kind: 'sent', item: c }
                      return (
                        <button key={c.id} onClick={() => setSelected(sel)} className={ROW(isSelected(sel))}>
                          <Thumb url={c.screenshot_url} pinX={c.pin_x} pinY={c.pin_y} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <span className="text-[11px] text-gray-400 truncate">{hostname(c.url)}</span>
                              <span className="text-[11px] text-gray-400 flex-shrink-0">{timeAgo(c.created_at)}</span>
                            </div>
                            <p className="text-xs text-gray-600 truncate">{c.body}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </section>
              )}

              {filteredContacts.length > 0 && (
                <section>
                  <SectionHeader label="Contacts" count={filteredContacts.length} />
                  <div className="divide-y divide-gray-200">
                    {filteredContacts.map(c => {
                      const other = c.addressee.id === userId ? c.requester : c.addressee
                      const sel: Selected = { kind: 'contact', item: c }
                      return (
                        <button key={c.id} onClick={() => setSelected(sel)} className={ROW(isSelected(sel))}>
                          <Avatar
                            username={other.username}
                            initials={(other as ContactProfile).initials}
                            avatarUrl={other.avatar_url}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-900 truncate">{other.username}</p>
                            {other.baseline && <p className="text-xs text-gray-400 truncate">{other.baseline}</p>}
                          </div>
                          {c.status === 'pending' && (
                            <span className="text-[10px] text-gray-400 flex-shrink-0">pending</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Detail ── */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <EmptyState message="Select a result to view details" />
        ) : selected.kind === 'inbox' ? (
          <CommentDetail
            url={selected.item.url}
            created_at={selected.item.created_at}
            screenshot_url={selected.item.screenshot_url}
            pin_x={selected.item.pin_x}
            pin_y={selected.item.pin_y}
            body={selected.item.body}
            from_username={selected.item.from_username}
            from_avatar_url={selected.item.from_avatar_url}
            from_initials={selected.item.from_initials}
            onOpenPage={() => window.open(selected.item.url, '_blank')}
            onResolve={async () => {
              await supabase
                .from('comment_recipients')
                .update({ resolved_at: new Date().toISOString() })
                .eq('id', selected.item.recipient_id)
              setInbox(prev => prev.filter(c => c.recipient_id !== selected.item.recipient_id))
              setSelected(null)
            }}
          />
        ) : selected.kind === 'sent' ? (
          <CommentDetail
            url={selected.item.url}
            created_at={selected.item.created_at}
            screenshot_url={selected.item.screenshot_url}
            pin_x={selected.item.pin_x}
            pin_y={selected.item.pin_y}
            body={selected.item.body}
            onOpenPage={() => window.open(selected.item.url, '_blank')}
            onDelete={async () => {
              await supabase.from('comments').delete().eq('id', selected.item.id)
              setSent(prev => prev.filter(c => c.id !== selected.item.id))
              setSelected(null)
            }}
          />
        ) : (
          <ContactCard contact={selected.item} userId={userId} />
        )}
      </div>
    </div>
  )
}
