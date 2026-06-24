import { useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../../components/Spinner'
import { Avatar } from '../../components/Avatar'
import { EmptyState } from '../../components/EmptyState'
import { CommentDetail } from './CommentDetail'
import type { Contact, ContactProfile, SentComment, DashboardContext } from '../../lib/types'

function ContactDetail({ contact, currentUserId, onAccept, onDecline, onRemove }: {
  contact:       Contact
  currentUserId: string
  onAccept:  (id: string) => void
  onDecline: (id: string) => void
  onRemove:  (id: string) => void
}) {
  const isAddressee = contact.addressee.id === currentUserId
  const other = isAddressee ? contact.requester : contact.addressee
  const [comments,        setComments]        = useState<SentComment[]>([])
  const [loadingComments, setLoadingComments] = useState(true)

  useEffect(() => {
    setLoadingComments(true)
    supabase
      .from('comments')
      .select('id, url, body, tags, created_at, screenshot_url, pin_x, pin_y')
      .eq('from_user_id', other.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setComments((data as SentComment[]) ?? [])
        setLoadingComments(false)
      })
  }, [other.id])

  return (
    <div className="h-full overflow-y-auto">

      {/* Horizontal banner */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100">
        <Avatar
          username={other.username}
          initials={(other as ContactProfile).initials}
          avatarUrl={other.avatar_url}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{other.username}</p>
          <p className="text-xs text-gray-400 truncate">{other.email}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {contact.status === 'pending' && isAddressee && (
            <>
              <button onClick={() => onAccept(contact.id)}
                className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                Accept
              </button>
              <button onClick={() => onDecline(contact.id)}
                className="px-3 py-1.5 text-xs border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition-colors">
                Decline
              </button>
            </>
          )}
          {contact.status === 'pending' && !isAddressee && (
            <span className="text-xs text-gray-400">Request sent</span>
          )}
          {contact.status === 'accepted' && (
            <button onClick={() => onRemove(contact.id)}
              className="px-3 py-1.5 text-xs border border-red-100 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Comment thread */}
      {loadingComments ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : comments.length === 0 ? (
        <EmptyState message="No comments." variant="list" />
      ) : (
        <div>
          {comments.map((c, i) => (
            <div key={c.id} className={i > 0 ? 'border-t border-gray-100' : ''}>
              <CommentDetail
                url={c.url}
                created_at={c.created_at}
                screenshot_url={c.screenshot_url}
                pin_x={c.pin_x}
                pin_y={c.pin_y}
                body={c.body}
                from_username={other.username}
                from_avatar_url={other.avatar_url}
                from_initials={(other as ContactProfile).initials}
                onOpenPage={() => window.open(c.url, '_blank')}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ContactListItem({ contact, currentUserId, selected, onClick }: {
  contact:       Contact
  currentUserId: string
  selected:      boolean
  onClick:       () => void
}) {
  const isAddressee = contact.addressee.id === currentUserId
  const other = isAddressee ? contact.requester : contact.addressee
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
        selected ? 'bg-blue-50' : 'hover:bg-gray-50'
      }`}
    >
      <Avatar
        username={other.username}
        initials={(other as ContactProfile).initials}
        avatarUrl={other.avatar_url}
        size="md"
      />
      <div className="min-w-0 flex-1 text-left">
        <p className="text-sm font-medium text-gray-900 truncate">{other.username}</p>
        <p className="text-xs text-gray-400 truncate">{other.email}</p>
      </div>
      {contact.status === 'pending' && isAddressee && (
        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
      )}
    </button>
  )
}

export function ContactsPage() {
  const { userId, profile, search } = useOutletContext<DashboardContext>()
  const [contacts,  setContacts]  = useState<Contact[]>([])
  const [selected,  setSelected]  = useState<Contact | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [addOpen,   setAddOpen]   = useState(false)
  const [query,     setQuery]     = useState('')
  const [addStatus, setAddStatus] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null)
  const [adding,    setAdding]    = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchContacts() }, [userId])

  useEffect(() => {
    if (addOpen) setTimeout(() => inputRef.current?.focus(), 50)
    else { setQuery(''); setAddStatus(null) }
  }, [addOpen])

  async function fetchContacts() {
    setLoading(true)
    const { data } = await supabase
      .from('contacts')
      .select(`
        id, status, created_at,
        requester:profiles!contacts_requester_id_fkey(id, username, email, avatar_url, initials),
        addressee:profiles!contacts_addressee_id_fkey(id, username, email, avatar_url, initials)
      `)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })
    setContacts((data as unknown as Contact[]) ?? [])
    setLoading(false)
  }

  async function handleAccept(id: string) {
    await supabase.from('contacts').update({ status: 'accepted' }).eq('id', id)
    setContacts(cs => cs.map(c => c.id === id ? { ...c, status: 'accepted' } : c))
    setSelected(prev => prev?.id === id ? { ...prev, status: 'accepted' } : prev)
  }

  async function handleDecline(id: string) {
    await supabase.from('contacts').update({ status: 'declined' }).eq('id', id)
    setContacts(cs => cs.filter(c => c.id !== id))
    setSelected(prev => prev?.id === id ? null : prev)
  }

  async function handleRemove(id: string) {
    await supabase.from('contacts').delete().eq('id', id)
    setContacts(cs => cs.filter(c => c.id !== id))
    setSelected(prev => prev?.id === id ? null : prev)
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !query.trim()) return
    setAdding(true)
    setAddStatus(null)

    const input   = query.trim()
    const isEmail = input.includes('@')

    const { data: found } = await supabase
      .from('profiles')
      .select('id, username, email, avatar_url')
      .eq(isEmail ? 'email' : 'username', input)
      .neq('id', profile.id)
      .maybeSingle()

    if (!found) {
      setAddStatus({
        type: isEmail ? 'info' : 'error',
        msg:  isEmail ? 'No account found. Email invitation coming soon.' : 'No account found with this username.',
      })
      setAdding(false)
      return
    }

    const { data: existing } = await supabase
      .from('contacts')
      .select('id, status, requester_id, addressee_id')
      .or(`and(requester_id.eq.${profile.id},addressee_id.eq.${found.id}),and(requester_id.eq.${found.id},addressee_id.eq.${profile.id})`)
      .maybeSingle()

    if (existing) {
      const msg = existing.status === 'accepted'        ? 'Already in contact.'
        : existing.requester_id === profile.id          ? 'Request already sent.'
        : 'This person already sent you a request — accept it from the list.'
      setAddStatus({ type: 'info', msg })
      setAdding(false)
      return
    }

    const { error } = await supabase.from('contacts').insert({ requester_id: profile.id, addressee_id: found.id })
    if (error) {
      setAddStatus({ type: 'error', msg: 'Failed to send the request.' })
    } else {
      setAddStatus({ type: 'success', msg: `Request sent to @${found.username}!` })
      setQuery('')
      fetchContacts()
    }
    setAdding(false)
  }

  const pendingIn  = contacts.filter(c => c.status === 'pending' && c.addressee.id === userId)
  const pendingOut = contacts.filter(c => c.status === 'pending' && c.requester.id === userId)
  const accepted   = contacts.filter(c => c.status === 'accepted')

  const filterContact = (c: Contact) => {
    if (!search) return true
    const q = search.toLowerCase()
    const other = c.addressee.id === userId ? c.requester : c.addressee
    return other.username.toLowerCase().includes(q) || other.email.toLowerCase().includes(q)
  }

  const SECTION_LABEL = 'px-4 pt-4 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider'

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <h1 className="text-sm font-semibold text-gray-900">Contacts</h1>
        <button
          onClick={() => setAddOpen(o => !o)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {/* Add contact form */}
      {addOpen && (
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
          <form onSubmit={handleAddContact} className="flex gap-2 items-start">
            <div className="flex-1 space-y-1.5">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setAddStatus(null) }}
                placeholder="Username or email"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
              />
              {addStatus && (
                <p className={`text-xs ${
                  addStatus.type === 'success' ? 'text-green-600' :
                  addStatus.type === 'info'    ? 'text-blue-500'  : 'text-red-500'
                }`}>{addStatus.msg}</p>
              )}
            </div>
            <button type="submit" disabled={adding || !query.trim()}
              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">
              {adding ? '…' : 'Send'}
            </button>
            <button type="button" onClick={() => setAddOpen(false)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
              ✕
            </button>
          </form>
        </div>
      )}

      {/* Two columns */}
      <div className="flex flex-1 overflow-hidden">

        {/* List */}
        <div className="w-80 flex-shrink-0 border-r border-gray-100 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Spinner /></div>
          ) : contacts.length === 0 ? (
            <EmptyState message="No contacts yet." variant="list" />
          ) : (
            <div>
              {pendingIn.filter(filterContact).length > 0 && (
                <div>
                  <p className={SECTION_LABEL}>Requests received</p>
                  <div className="divide-y divide-gray-100">
                    {pendingIn.filter(filterContact).map(c => (
                      <ContactListItem key={c.id} contact={c} currentUserId={userId}
                        selected={selected?.id === c.id} onClick={() => setSelected(c)} />
                    ))}
                  </div>
                </div>
              )}
              {accepted.filter(filterContact).length > 0 && (
                <div>
                  <p className={SECTION_LABEL}>My contacts</p>
                  <div className="divide-y divide-gray-100">
                    {accepted.filter(filterContact).map(c => (
                      <ContactListItem key={c.id} contact={c} currentUserId={userId}
                        selected={selected?.id === c.id} onClick={() => setSelected(c)} />
                    ))}
                  </div>
                </div>
              )}
              {pendingOut.filter(filterContact).length > 0 && (
                <div>
                  <p className={SECTION_LABEL}>Sent requests</p>
                  <div className="divide-y divide-gray-100">
                    {pendingOut.filter(filterContact).map(c => (
                      <ContactListItem key={c.id} contact={c} currentUserId={userId}
                        selected={selected?.id === c.id} onClick={() => setSelected(c)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="flex-1 overflow-hidden">
          {selected ? (
            <ContactDetail
              contact={selected}
              currentUserId={userId}
              onAccept={handleAccept}
              onDecline={handleDecline}
              onRemove={handleRemove}
            />
          ) : (
            <EmptyState message="Select a contact to view details" />
          )}
        </div>
      </div>
    </div>
  )
}
