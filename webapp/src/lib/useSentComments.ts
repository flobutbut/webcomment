import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { SentComment } from './types'

export function useSentComments(userId: string) {
  const [comments, setComments] = useState<SentComment[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    supabase
      .from('comments')
      .select('id, url, body, mentions, tags, screenshot_url, pin_x, pin_y, created_at')
      .eq('from_user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setComments(data ?? [])
        setLoading(false)
      })
  }, [userId])

  function removeComment(id: string) {
    setComments(prev => prev.filter(c => c.id !== id))
  }

  return { comments, loading, removeComment }
}
