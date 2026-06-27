import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function useUnreadCount(userId: string) {
  const [count, setCount] = useState(0)

  function load() {
    if (!userId) return
    supabase
      .from('comment_inbox')
      .select('recipient_id', { count: 'exact', head: true })
      .eq('for_user_id', userId)
      .or(`from_user_id.neq.${userId},from_user_id.is.null`)
      .neq('recipient_type', 'public')
      .is('resolved_at', null)
      .is('read_at', null)
      .then(({ count: n }) => setCount(n ?? 0))
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`unread-count:${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'comment_recipients',
        filter: `recipient_id=eq.${userId}`,
      }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return count
}
