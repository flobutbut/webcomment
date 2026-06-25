import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { matchesSearch } from '../../lib/utils'
import { useInboxComments } from '../../lib/useInboxComments'
import { Spinner } from '../../components/Spinner'
import { EmptyState } from '../../components/EmptyState'
import { CommentDetail } from './CommentDetail'
import type { DashboardContext, FilterType } from '../../lib/types'

type InboxTab = 'all' | 'mentions' | 'followed'

const INBOX_TABS: { value: InboxTab; label: string }[] = [
  { value: 'all',      label: 'All'      },
  { value: 'mentions', label: 'Mentions'  },
  { value: 'followed', label: 'Followed'  },
]

export function InboxPage() {
  const { userId, search, filterTypes } = useOutletContext<DashboardContext>()
  const { comments, loading, removeComment } = useInboxComments(userId)
  const [tab, setTab] = useState<InboxTab>('all')

  const byTab = tab === 'all'      ? comments
    : tab === 'mentions' ? comments.filter(c => c.mentions?.some(m => m.id === userId))
    :                      comments.filter(c => c.recipient_type === 'follow')

  const filtered = byTab.filter(c => {
    if (!search) return true
    const q      = search.toLowerCase()
    const active = filterTypes.size === 0
      ? new Set<FilterType>(['url', 'user', 'tag'])
      : filterTypes
    return matchesSearch(q, active, { url: c.url, user: c.from_username, tags: c.tags })
  })

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-2.5 border-b border-gray-200 dark:border-dark-border flex items-center justify-between flex-shrink-0 gap-4 min-h-[49px]">
        <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-shrink-0">Inbox</h1>
        <div className="flex-1 flex justify-center">
          <div className="inline-flex bg-gray-100 dark:bg-dark-700 rounded-9 p-0.5">
            {INBOX_TABS.map(t => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`px-3 py-1 rounded-6 text-xs font-medium transition-all duration-150 ${
                  tab === t.value
                    ? 'bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {!loading && (
          <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
            {filtered.length} comment{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            message={
              search
                ? 'No results.'
                : tab === 'mentions'
                  ? 'No direct comments received.'
                  : tab === 'followed'
                    ? 'No activity on followed pages.'
                    : 'No comments received.'
            }
            variant="list"
          />
        ) : (
          <div>
            {filtered.map((comment, i) => (
              <div key={comment.recipient_id} className={i > 0 ? 'border-t border-gray-200 dark:border-dark-border' : ''}>
                <CommentDetail
                  url={comment.url}
                  created_at={comment.created_at}
                  screenshot_url={comment.screenshot_url}
                  pin_x={comment.pin_x}
                  pin_y={comment.pin_y}
                  body={comment.body}
                  mentions={comment.mentions}
                  from_username={comment.from_username}
                  from_avatar_url={comment.from_avatar_url}
                  from_initials={comment.from_initials}
                  onOpenPage={() => window.open(comment.url, '_blank')}
                  onResolve={async () => {
                    await supabase
                      .from('comment_recipients')
                      .update({ resolved_at: new Date().toISOString() })
                      .eq('id', comment.recipient_id)
                    removeComment(comment.recipient_id)
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
