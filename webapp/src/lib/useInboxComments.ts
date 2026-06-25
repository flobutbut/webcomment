import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { CommentInboxItem } from './types'

export function useInboxComments(userId: string) {
  const [comments, setComments] = useState<CommentInboxItem[]>([])
  const [loading,  setLoading]  = useState(true)

  function load() {
    supabase
      .from('comment_inbox')
      .select('*')
      .eq('for_user_id', userId)
      .or(`from_user_id.neq.${userId},from_user_id.is.null`)
      .neq('recipient_type', 'public')
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const rows = data ?? []
        setComments(rows)
        setLoading(false)
        const unread = rows.filter(c => !c.read_at)
        if (unread.length > 0) {
          supabase
            .from('comment_recipients')
            .update({ read_at: new Date().toISOString() })
            .in('id', unread.map(c => c.recipient_id))
            .is('read_at', null)
            .then(() => {})
        }
      })
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`inbox-webapp:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'comment_recipients',
        filter: `recipient_type=eq.user,recipient_id=eq.${userId}`,
      }, load)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'comment_recipients',
        filter: `recipient_type=eq.follow,recipient_id=eq.${userId}`,
      }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  function removeComment(recipientId: string) {
    setComments(prev => prev.filter(c => c.recipient_id !== recipientId))
  }

  return { comments, loading, removeComment }
}
