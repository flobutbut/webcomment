import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { SentComment } from './types'

export function useContactComments(userId: string) {
  const [comments, setComments] = useState<SentComment[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    supabase
      .from('comments')
      .select('id, url, body, tags, created_at, screenshot_url, pin_x, pin_y')
      .eq('from_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setComments((data as SentComment[]) ?? [])
        setLoading(false)
      })
  }, [userId])

  return { comments, loading }
}
