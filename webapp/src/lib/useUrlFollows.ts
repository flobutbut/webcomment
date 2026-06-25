import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export interface UrlFollow {
  url: string
  created_at: string
}

export interface PublicComment {
  comment_id: string
  url: string
  body: string
  tags: string[] | null
  created_at: string
  screenshot_url: string | null
  pin_x: number
  pin_y: number
  from_user_id: string
  from_username: string
  from_avatar_url: string | null
  from_initials: string | null
}

export function useUrlFollows(userId: string) {
  const [follows, setFollows] = useState<UrlFollow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('url_follows')
      .select('url, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setFollows(data ?? [])
        setLoading(false)
      })
  }, [userId])

  async function follow(url: string) {
    const { data, error } = await supabase
      .from('url_follows')
      .insert({ user_id: userId, url })
      .select('url, created_at')
      .single()
    if (!error && data) setFollows(prev => [data as UrlFollow, ...prev])
  }

  async function unfollow(url: string) {
    await supabase.from('url_follows').delete().eq('user_id', userId).eq('url', url)
    setFollows(prev => prev.filter(f => f.url !== url))
  }

  function isFollowing(url: string) {
    return follows.some(f => f.url === url)
  }

  async function getCommentsForUrl(url: string): Promise<PublicComment[]> {
    const { data } = await supabase.rpc('get_public_comments_for_url', { p_url: url })
    return (data ?? []) as PublicComment[]
  }

  return { follows, loading, follow, unfollow, isFollowing, getCommentsForUrl }
}
