import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../../components/Spinner'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState } from '../../components/EmptyState'
import { CommentDetail } from './CommentDetail'
import type { CommentInboxItem, DashboardContext } from '../../lib/types'

export function InboxPage() {
  const { userId, search, filterTypes } = useOutletContext<DashboardContext>()
  const [comments, setComments] = useState<CommentInboxItem[]>([])
  const [loading,  setLoading]  = useState(true)

  function loadComments() {
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
    loadComments()
    const channel = supabase
      .channel(`inbox-webapp:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'comment_recipients',
        filter: `recipient_type=eq.user,recipient_id=eq.${userId}`,
      }, loadComments)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  function handleResolve(recipientId: string) {
    setComments(prev => prev.filter(c => c.recipient_id !== recipientId))
  }

  const filtered = comments.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    const active = filterTypes.size === 0
      ? new Set(['url', 'user', 'tag'] as const)
      : filterTypes
    if (active.has('url')  && c.url.toLowerCase().includes(q))                       return true
    if (active.has('user') && c.from_username.toLowerCase().includes(q))              return true
    if (active.has('tag')  && (c.tags ?? []).some(t => t.toLowerCase().includes(q))) return true
    return false
  })

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Inbox"
        right={!loading && (
          <span className="text-xs text-gray-400">
            {filtered.length} comment{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      />

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState message={search ? 'No results.' : 'No comments received.'} variant="list" />
        ) : (
          <div>
            {filtered.map((comment, i) => (
              <div key={comment.recipient_id} className={i > 0 ? 'border-t border-gray-100' : ''}>
                <CommentDetail
                  url={comment.url}
                  created_at={comment.created_at}
                  screenshot_url={comment.screenshot_url}
                  pin_x={comment.pin_x}
                  pin_y={comment.pin_y}
                  body={comment.body}
                  from_username={comment.from_username}
                  from_avatar_url={comment.from_avatar_url}
                  from_initials={comment.from_initials}
                  onOpenPage={() => window.open(comment.url, '_blank')}
                  onResolve={async () => {
                    await supabase
                      .from('comment_recipients')
                      .update({ resolved_at: new Date().toISOString() })
                      .eq('id', comment.recipient_id)
                    handleResolve(comment.recipient_id)
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
