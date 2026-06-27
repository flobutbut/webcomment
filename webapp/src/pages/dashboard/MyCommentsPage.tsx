import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { IconButton } from '../../components/IconButton'
import { ScreenshotPin } from '../../components/ScreenshotPin'
import { supabase } from '../../lib/supabase'
import { posthog } from '../../lib/posthog'
import { hostname, timeAgo, resolveBody, matchesSearch } from '../../lib/utils'
import { useSentComments } from '../../lib/useSentComments'
import { Spinner } from '../../components/Spinner'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState } from '../../components/EmptyState'
import { CommentDetail } from './CommentDetail'
import type { SentComment, DashboardContext, FilterType } from '../../lib/types'

export function MyCommentsPage() {
  const { userId, search, filterTypes } = useOutletContext<DashboardContext>()
  const { comments, loading, removeComment } = useSentComments(userId)
  const [selected,   setSelected]   = useState<SentComment | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleDeleted(id: string) {
    removeComment(id)
    if (selected?.id === id) setSelected(null)
  }

  async function handleQuickDelete(e: React.MouseEvent, comment: SentComment) {
    e.stopPropagation()
    setDeletingId(comment.id)
    await supabase.from('comments').delete().eq('id', comment.id)
    posthog.capture('comment_deleted', { source: 'quick_delete' })
    handleDeleted(comment.id)
    setDeletingId(null)
  }

  const filtered = comments.filter(c => {
    if (!search) return true
    const q      = search.toLowerCase()
    const active = filterTypes.size === 0
      ? new Set<FilterType>(['url', 'tag'])
      : filterTypes
    return matchesSearch(q, active, { url: c.url, tags: c.tags })
  })

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="My Comments"
        right={!loading && (
          <span className="text-xs text-gray-400">
            {filtered.length} comment{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* List */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-dark-border overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Spinner /></div>
          ) : filtered.length === 0 ? (
            <EmptyState message={search ? 'No results.' : 'No comments sent yet.'} variant="list" />
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-dark-border">
              {filtered.map(comment => (
                <div
                  key={comment.id}
                  className={`group relative flex items-center transition-colors ${
                    selected?.id === comment.id
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-dark-hover'
                  }`}
                >
                  <button
                    onClick={() => setSelected(comment)}
                    className="w-full text-left px-4 py-3.5 flex gap-3 pr-10"
                  >
                    <ScreenshotPin url={comment.screenshot_url} pinX={comment.pin_x} pinY={comment.pin_y} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{hostname(comment.url)}</span>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 flex-shrink-0">{timeAgo(comment.created_at)}</span>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{resolveBody(comment.body, comment.mentions)}</p>
                    </div>
                  </button>
                  <IconButton
                    variant="danger"
                    onClick={e => handleQuickDelete(e, comment)}
                    disabled={deletingId === comment.id}
                    className="absolute right-3 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </IconButton>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="flex-1 overflow-y-auto">
          {selected ? (
            <CommentDetail
              url={selected.url}
              created_at={selected.created_at}
              screenshot_url={selected.screenshot_url}
              pin_x={selected.pin_x}
              pin_y={selected.pin_y}
              body={selected.body}
              mentions={selected.mentions}
              onOpenPage={() => window.open(selected.url, '_blank')}
              onDelete={async () => {
                await supabase.from('comments').delete().eq('id', selected.id)
                posthog.capture('comment_deleted', { source: 'detail_panel' })
                handleDeleted(selected.id)
              }}
            />
          ) : (
            <EmptyState message="Select a comment to view details" />
          )}
        </div>
      </div>
    </div>
  )
}
