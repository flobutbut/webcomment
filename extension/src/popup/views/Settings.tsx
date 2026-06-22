import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/Button'
import { supabase } from '../../shared/supabase'
import type { Profile, Contact, ContactProfile } from '../../shared/types'

type ProfileTab = 'profile' | 'contacts'

function Avatar({ user, size = 9 }: { user: ContactProfile; size?: number }) {
  const sizeClass = `w-${size} h-${size}`
  return (
    <div className={`${sizeClass} rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[13px] flex-shrink-0`}>
      {user.username.slice(0, 2).toUpperCase()}
    </div>
  )
}

function ContactRow({
  contact,
  currentUserId,
  onAccept,
  onDecline,
  onRemove,
}: {
  contact: Contact
  currentUserId: string
  onAccept?: (id: string) => void
  onDecline?: (id: string) => void
  onRemove?: (id: string) => void
}) {
  const isAddressee = contact.addressee.id === currentUserId
  const other = isAddressee ? contact.requester : contact.addressee

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50">
      <Avatar user={other} size={8} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-gray-900 truncate">{other.username}</p>
        <p className="text-[11px] text-gray-400 truncate">{other.email}</p>
      </div>
      {contact.status === 'pending' && isAddressee && (
        <div className="flex gap-1.5 flex-shrink-0">
          <button
            onClick={() => onAccept?.(contact.id)}
            className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Accept
          </button>
          <button
            onClick={() => onDecline?.(contact.id)}
            className="px-2.5 py-1 text-[11px] rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Decline
          </button>
        </div>
      )}
      {contact.status === 'pending' && !isAddressee && (
        <span className="text-[11px] text-gray-400 flex-shrink-0">Pending</span>
      )}
      {contact.status === 'accepted' && (
        <button
          onClick={() => onRemove?.(contact.id)}
          className="text-[11px] text-gray-300 hover:text-red-400 flex-shrink-0 transition-colors"
          title="Remove contact"
        >
          ✕
        </button>
      )}
    </div>
  )
}

export function Settings({ profile, onClose }: { profile: Profile | null; onClose?: () => void }) {
  const [tab,        setTab]        = useState<ProfileTab>('profile')
  const [contacts,   setContacts]   = useState<Contact[]>([])
  const [loading,    setLoading]    = useState(false)
  const [addOpen,    setAddOpen]    = useState(false)
  const [query,      setQuery]      = useState('')
  const [addStatus,  setAddStatus]  = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null)
  const [adding,     setAdding]     = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (tab !== 'contacts' || !profile) return
    fetchContacts()
  }, [tab, profile])

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
        requester:profiles!contacts_requester_id_fkey(id, username, email, avatar_url),
        addressee:profiles!contacts_addressee_id_fkey(id, username, email, avatar_url)
      `)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })
    setContacts((data as unknown as Contact[]) ?? [])
    setLoading(false)
  }

  async function handleAccept(id: string) {
    await supabase.from('contacts').update({ status: 'accepted' }).eq('id', id)
    setContacts(cs => cs.map(c => c.id === id ? { ...c, status: 'accepted' } : c))
  }

  async function handleDecline(id: string) {
    await supabase.from('contacts').update({ status: 'declined' }).eq('id', id)
    setContacts(cs => cs.filter(c => c.id !== id))
  }

  async function handleRemove(id: string) {
    await supabase.from('contacts').delete().eq('id', id)
    setContacts(cs => cs.filter(c => c.id !== id))
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !query.trim()) return
    setAdding(true)
    setAddStatus(null)

    const input = query.trim()
    const isEmail = input.includes('@')

    // Look up target profile
    const { data: found } = await supabase
      .from('profiles')
      .select('id, username, email, avatar_url')
      .eq(isEmail ? 'email' : 'username', isEmail ? input : input)
      .neq('id', profile.id)
      .maybeSingle()

    if (!found) {
      if (isEmail) {
        // TODO: send an invitation email when the extension is on the Chrome Web Store
        setAddStatus({ type: 'info', msg: "No account found. Email invitation will be available once the extension is published." })
      } else {
        setAddStatus({ type: 'error', msg: "No account found with this username." })
      }
      setAdding(false)
      return
    }

    // Check if a relationship already exists in either direction
    const { data: existing } = await supabase
      .from('contacts')
      .select('id, status, requester_id, addressee_id')
      .or(`and(requester_id.eq.${profile.id},addressee_id.eq.${found.id}),and(requester_id.eq.${found.id},addressee_id.eq.${profile.id})`)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'accepted') {
        setAddStatus({ type: 'info', msg: 'You are already in contact.' })
      } else if (existing.requester_id === profile.id) {
        setAddStatus({ type: 'info', msg: 'Request already sent, awaiting response.' })
      } else {
        setAddStatus({ type: 'info', msg: "This person has already sent you a request — accept it from the list." })
      }
      setAdding(false)
      return
    }

    const { error } = await supabase.from('contacts').insert({
      requester_id: profile.id,
      addressee_id: found.id,
    })

    if (error) {
      setAddStatus({ type: 'error', msg: 'Failed to send the request.' })
    } else {
      setAddStatus({ type: 'success', msg: `Request sent to @${found.username}!` })
      setQuery('')
      fetchContacts()
    }
    setAdding(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  const pendingIn  = contacts.filter(c => c.status === 'pending'  && c.addressee.id === profile?.id)
  const pendingOut = contacts.filter(c => c.status === 'pending'  && c.requester.id === profile?.id)
  const accepted   = contacts.filter(c => c.status === 'accepted')

  return (
    <div className="flex flex-col h-full">

      {/* Tabs */}
      <div className="flex border-b border-gray-100 flex-shrink-0">
        {(['profile', 'contacts'] as ProfileTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-[13px] font-medium transition-colors duration-150 border-b-2 ${
              tab === t
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t === 'profile' ? 'Profile' : 'Contacts'}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">

        {tab === 'profile' && (
          <>
            {profile && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[13px] flex-shrink-0">
                  {profile.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-gray-900 truncate">{profile.username}</p>
                  <p className="text-[12px] text-gray-500 truncate">{profile.email}</p>
                </div>
              </div>
            )}
            <Button variant="danger" onClick={handleLogout}>
              Sign out
            </Button>
          </>
        )}

        {tab === 'contacts' && (
          <>
            {loading && (
              <p className="text-[12px] text-gray-400 text-center py-6">Loading…</p>
            )}

            {!loading && pendingIn.length > 0 && (
              <section>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 px-1">
                  Received requests
                </p>
                {pendingIn.map(c => (
                  <ContactRow key={c.id} contact={c} currentUserId={profile!.id}
                    onAccept={handleAccept} onDecline={handleDecline} />
                ))}
              </section>
            )}

            {!loading && accepted.length > 0 && (
              <section>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 px-1">
                  My contacts
                </p>
                {accepted.map(c => (
                  <ContactRow key={c.id} contact={c} currentUserId={profile!.id}
                    onRemove={handleRemove} />
                ))}
              </section>
            )}

            {!loading && pendingOut.length > 0 && (
              <section>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 px-1">
                  Sent requests
                </p>
                {pendingOut.map(c => (
                  <ContactRow key={c.id} contact={c} currentUserId={profile!.id}
                    onRemove={handleRemove} />
                ))}
              </section>
            )}

            {!loading && contacts.length === 0 && !addOpen && (
              <p className="text-[12px] text-gray-400 text-center py-8">
                No contacts yet.
              </p>
            )}
          </>
        )}

      </div>

      {/* Footer — add button (Contacts tab only) */}
      {tab === 'contacts' && (
        <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3 space-y-2">

          {addOpen && (
            <form onSubmit={handleAddContact} className="space-y-2">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setAddStatus(null) }}
                placeholder="Username or email"
                className="w-full px-3 py-2 text-[13px] rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/40"
              />
              {addStatus && (
                <p className={`text-[11px] ${
                  addStatus.type === 'success' ? 'text-green-600' :
                  addStatus.type === 'info'    ? 'text-blue-500'  : 'text-red-500'
                }`}>
                  {addStatus.msg}
                </p>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={adding || !query.trim()}>
                  {adding ? '…' : 'Send request'}
                </Button>
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="flex-shrink-0 px-3 py-2 text-[13px] rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {!addOpen && (
            <Button variant="secondary" onClick={() => setAddOpen(true)}>
              + Add a contact
            </Button>
          )}

        </div>
      )}

    </div>
  )
}
