import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import arrowLeftIcon  from '@iconify-icons/lucide/arrow-left'
import arrowRightIcon from '@iconify-icons/lucide/arrow-right'
import trash2Icon     from '@iconify-icons/lucide/trash-2'
import checkIcon      from '@iconify-icons/lucide/check'
import link2Icon      from '@iconify-icons/lucide/link-2'
import imageOffIcon   from '@iconify-icons/lucide/image-off'
import { Button }  from '../components/Button'
import { Loading } from '../components/Loading'
import { supabase } from '../../shared/supabase'
import type { SentComment } from '../../shared/types'
import { hostname, timeAgo, commentLinkUrl } from '../../shared/utils'

function ScreenshotThumbnail({ url, pinX, pinY }: { url: string; pinX: number; pinY: number }) {
  const [err, setErr] = useState(false)
  return (
    <div className="relative flex-shrink-0 w-14 h-10">
      {err ? (
        <div className="w-14 h-10 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
          <Icon icon={imageOffIcon} width={12} height={12} />
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

async function deleteComment(commentId: string) {
  await chrome.runtime.sendMessage({ type: 'DELETE_COMMENT', payload: { commentId } })
}

function Detail({
  comment,
  onBack,
  onDeleted,
}: {
  comment:   SentComment
  onBack:    () => void
  onDeleted: (id: string) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [copied,     setCopied]     = useState(false)
  const [imgError,   setImgError]   = useState(false)

  async function handleCopyLink() {
    await navigator.clipboard.writeText(commentLinkUrl(comment.id))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDelete() {
    setDeleting(true)
    await deleteComment(comment.id)
    onDeleted(comment.id)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
        >
          <Icon icon={arrowLeftIcon} width={18} height={18} />
        </button>
        <span className="text-[12px] text-gray-500 truncate flex-1">{hostname(comment.url)}</span>
        {!confirming && (
          <button
            onClick={() => setConfirming(true)}
            className="text-gray-400 hover:text-red-500 transition-colors duration-150 p-1 rounded"
            title="Delete"
          >
            <Icon icon={trash2Icon} width={14} height={14} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="relative rounded-lg overflow-hidden border border-gray-200">
          {imgError ? (
            <div className="w-full h-32 bg-gray-50 flex flex-col items-center justify-center gap-2 text-gray-400">
              <Icon icon={imageOffIcon} width={20} height={20} />
              <span className="text-[12px]">Failed to load screenshot</span>
            </div>
          ) : (
            <>
              <img
                src={comment.screenshot_url}
                className="w-full"
                alt="capture"
                onError={() => setImgError(true)}
              />
              <div
                className="absolute w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-md"
                style={{ left: `${comment.pin_x}%`, top: `${comment.pin_y}%`, transform: 'translate(-50%, -50%)' }}
              />
            </>
          )}
        </div>
        <div>
          <p className="text-[11px] text-gray-400 mb-1">{new Date(comment.created_at).toLocaleString('en-US')}</p>
          <p className="text-[13px] text-gray-700 leading-relaxed">{comment.body}</p>
        </div>

        {confirming ? (
          <div className="space-y-2">
            <p className="text-[12px] text-gray-500 text-center">Delete this comment?</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setConfirming(false)} className="flex-1">
                Cancel
              </Button>
              <Button variant="danger-filled" onClick={handleDelete} disabled={deleting} className="flex-1">
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Button
              variant="secondary"
              onClick={() => chrome.tabs.create({ url: comment.url })}
              className="flex items-center justify-center gap-1.5"
            >
              Open page <Icon icon={arrowRightIcon} width={14} height={14} />
            </Button>
            <Button
              variant="secondary"
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-1.5"
            >
              {copied ? 'Link copied!' : 'Copy link'}
              <Icon icon={copied ? checkIcon : link2Icon} width={14} height={14} />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export function Sent({ userId, onCommentDeleted }: { userId: string; onCommentDeleted?: () => void }) {
  const [comments,   setComments]   = useState<SentComment[]>([])
  const [selected,   setSelected]   = useState<SentComment | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('comments')
      .select('id, url, body, screenshot_url, pin_x, pin_y, created_at')
      .eq('from_user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setComments(data ?? [])
        setLoading(false)
      })
  }, [userId])

  function handleDeleted(id: string) {
    setComments(prev => prev.filter(c => c.id !== id))
    setSelected(null)
    onCommentDeleted?.()
  }

  async function handleQuickDelete(e: React.MouseEvent, comment: SentComment) {
    e.stopPropagation()
    setDeletingId(comment.id)
    await deleteComment(comment.id)
    handleDeleted(comment.id)
    setDeletingId(null)
  }

  if (selected) {
    return (
      <Detail
        comment={selected}
        onBack={() => setSelected(null)}
        onDeleted={handleDeleted}
      />
    )
  }

  if (loading) return <Loading />

  if (comments.length === 0) {
    return (
      <div className="p-6 text-center mt-8">
        <p className="text-[13px] text-gray-400">No comments sent.</p>
        <p className="text-[12px] text-gray-300 mt-1">Click "New comment" to get started.</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {comments.map(comment => (
        <div
          key={comment.id}
          className="group relative flex items-center hover:bg-gray-50 transition-colors duration-100"
        >
          <button
            onClick={() => setSelected(comment)}
            className="w-full text-left px-4 py-3 flex gap-3 pr-10"
          >
            <ScreenshotThumbnail url={comment.screenshot_url} pinX={comment.pin_x} pinY={comment.pin_y} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-[11px] text-gray-500 truncate">{hostname(comment.url)}</span>
                <span className="text-[11px] text-gray-400 flex-shrink-0">{timeAgo(comment.created_at)}</span>
              </div>
              <p className="text-[12px] text-gray-600 truncate">{comment.body}</p>
            </div>
          </button>
          <button
            onClick={e => handleQuickDelete(e, comment)}
            disabled={deletingId === comment.id}
            title="Delete"
            className="absolute right-3 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 disabled:opacity-30 transition-all duration-150 p-1 rounded"
          >
            <Icon icon={trash2Icon} width={14} height={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
