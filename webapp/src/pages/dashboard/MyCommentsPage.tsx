import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Trash2, ImageOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { hostname, timeAgo } from '../../lib/utils'
import { Spinner } from '../../components/Spinner'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState } from '../../components/EmptyState'
import { CommentDetail } from './CommentDetail'
import type { SentComment, DashboardContext } from '../../lib/types'

function ScreenshotThumb({ url, pinX, pinY }: { url: string; pinX: number; pinY: number }) {
  const [err, setErr] = useState(false)
  return (
    <div className="relative w-14 h-10 flex-shrink-0">
      {err ? (
        <div className="w-14 h-10 bg-gray-50 rounded border border-gray-200 flex items-center justify-center">
          <ImageOff className="w-3 h-3 text-gray-300" />
        </div>
      ) : (
        <>
          <img src={url} className="w-14 h-10 object-cover rounded border border-gray-200" alt="" onError={() => setErr(true)} />
          <div className="absolute w-2.5 h-2.5 rounded-full bg-blue-600 border border-white shadow-sm"
            style={{ left: `${pinX}%`, top: `${pinY}%`, transform: 'translate(-50%, -50%)' }} />
        </>
      )}
    </div>
  )
}

export function MyCommentsPage() {
  const { userId, search, filterTypes } = useOutletContext<DashboardContext>()
  const [comments,   setComments]   = useState<SentComment[]>([])
  const [selected,   setSelected]   = useState<SentComment | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('comments')
      .select('id, url, body, tags, screenshot_url, pin_x, pin_y, created_at')
      .eq('from_user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setComments(data ?? [])
        setLoading(false)
      })
  }, [userId])

  function handleDeleted(id: string) {
    setComments(prev => prev.filter(c => c.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  async function handleQuickDelete(e: React.MouseEvent, comment: SentComment) {
    e.stopPropagation()
    setDeletingId(comment.id)
    await supabase.from('comments').delete().eq('id', comment.id)
    handleDeleted(comment.id)
    setDeletingId(null)
  }

  const filtered = comments.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    const active = filterTypes.size === 0
      ? new Set(['url', 'tag'] as const)
      : filterTypes
    if (active.has('url') && c.url.toLowerCase().includes(q))                        return true
    if (active.has('tag') && (c.tags ?? []).some(t => t.toLowerCase().includes(q))) return true
    return false
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
        <div className="w-80 flex-shrink-0 border-r border-gray-200 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Spinner /></div>
          ) : filtered.length === 0 ? (
            <EmptyState message={search ? 'No results.' : 'No comments sent yet.'} variant="list" />
          ) : (
            <div className="divide-y divide-gray-200">
              {filtered.map(comment => (
                <div
                  key={comment.id}
                  className={`group relative flex items-center transition-colors ${
                    selected?.id === comment.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <button
                    onClick={() => setSelected(comment)}
                    className="w-full text-left px-4 py-3.5 flex gap-3 pr-10"
                  >
                    <ScreenshotThumb url={comment.screenshot_url} pinX={comment.pin_x} pinY={comment.pin_y} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-[11px] text-gray-400 truncate">{hostname(comment.url)}</span>
                        <span className="text-[11px] text-gray-400 flex-shrink-0">{timeAgo(comment.created_at)}</span>
                      </div>
                      <p className="text-xs text-gray-700 truncate">{comment.body}</p>
                    </div>
                  </button>
                  <button
                    onClick={e => handleQuickDelete(e, comment)}
                    disabled={deletingId === comment.id}
                    className="absolute right-3 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 disabled:opacity-30 transition-all p-1 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
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
              onOpenPage={() => window.open(selected.url, '_blank')}
              onDelete={async () => {
                await supabase.from('comments').delete().eq('id', selected.id)
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
