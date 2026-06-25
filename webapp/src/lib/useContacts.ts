import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Contact } from './types'

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading,  setLoading]  = useState(true)

  async function refetch() {
    setLoading(true)
    const { data } = await supabase
      .from('contacts')
      .select(`
        id, status, created_at,
        requester:profiles!contacts_requester_id_fkey(id, username, baseline, avatar_url, initials),
        addressee:profiles!contacts_addressee_id_fkey(id, username, baseline, avatar_url, initials)
      `)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })
    setContacts((data as unknown as Contact[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { refetch() }, [])

  async function acceptContact(id: string) {
    await supabase.from('contacts').update({ status: 'accepted' }).eq('id', id)
    setContacts(cs => cs.map(c => c.id === id ? { ...c, status: 'accepted' } : c))
  }

  async function declineContact(id: string) {
    await supabase.from('contacts').update({ status: 'declined' }).eq('id', id)
    setContacts(cs => cs.filter(c => c.id !== id))
  }

  async function removeContact(id: string) {
    await supabase.from('contacts').delete().eq('id', id)
    setContacts(cs => cs.filter(c => c.id !== id))
  }

  return { contacts, loading, refetch, acceptContact, declineContact, removeContact }
}
