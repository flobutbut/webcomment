import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import arrowLeftIcon  from '@iconify-icons/lucide/arrow-left'
import arrowRightIcon from '@iconify-icons/lucide/arrow-right'
import checkIcon      from '@iconify-icons/lucide/check'
import link2Icon      from '@iconify-icons/lucide/link-2'
import imageOffIcon   from '@iconify-icons/lucide/image-off'
import { Button }      from '../components/Button'
import { IconButton }  from '../components/IconButton'
import { Loading }  from '../components/Loading'
import { BodyText } from '../components/BodyText'
import { supabase } from '../../shared/supabase'
import type { CommentInboxItem } from '../../shared/types'
import { hostname, timeAgo, commentLinkUrl, resolveBody } from '../../shared/utils'

type InboxFilter = 'all' | 'mentions' | 'followed'

const FILTER_TABS = [
  { value: 'all'      as InboxFilter, label: 'All'      },
  { value: 'mentions' as InboxFilter, label: 'Mentions'  },
  { value: 'followed' as InboxFilter, label: 'Followed'  },
]

function ScreenshotThumbnail({ url, pinX, pinY }: { url: string; pinX: number; pinY: number }) {
  const [err, setErr] = useState(false)
  return (
    <div className="relative flex-shrink-0 w-14 h-10">
      {err ? (
        <div className="w-14 h-10 bg-gray-100 rounded-6 border border-gray-200 flex items-center justify-center">
          <Icon icon={imageOffIcon} width={12} height={12} />
        </div>
      ) : (
        <>
          <img src={url} className="w-14 h-10 object-cover rounded-6 border border-gray-200" alt="" onError={() => setErr(true)} />
          <div className="absolute w-2.5 h-2.5 rounded-full bg-blue-600 border border-white shadow-sm"
            style={{ left: `${pinX}%`, top: `${pinY}%`, transform: 'translate(-50%, -50%)' }} />
        </>
      )}
    </div>
  )
}


function Detail({
  comment,
  onBack,
  onResolve,
}: {
  comment:   CommentInboxItem
  onBack:    () => void
  onResolve: (recipientId: string) => void
}) {
  const [resolving, setResolving] = useState(false)
  const [copied,    setCopied]    = useState(false)
  const [imgError,  setImgError]  = useState(false)

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'MARK_READ', payload: { recipientId: comment.recipient_id } })
  }, [comment.recipient_id])

  async function handleCopyLink() {
    await navigator.clipboard.writeText(commentLinkUrl(comment.comment_id))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleResolve() {
    setResolving(true)
    await chrome.runtime.sendMessage({ type: 'RESOLVE_COMMENT', payload: { recipientId: comment.recipient_id } })
    onResolve(comment.recipient_id)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <IconButton onClick={onBack}>
          <Icon icon={arrowLeftIcon} width={18} height={18} />
        </IconButton>
        <span className="text-[12px] text-gray-500 truncate">{hostname(comment.url)}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="relative rounded-9 overflow-hidden border border-gray-200">
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
                alt="screenshot"
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
          <p className="text-[13px] font-semibold text-gray-900">{comment.from_username}</p>
          <p className="text-[11px] text-gray-400 mb-2">{new Date(comment.created_at).toLocaleString('en-US')}</p>
          <BodyText body={comment.body} mentions={comment.mentions} />
        </div>
        <Button
          variant="secondary"
          onClick={async () => {
            await chrome.storage.local.set({
              pendingCommentLink: { url: comment.url, comment_id: comment.comment_id },
            })
            chrome.tabs.create({ url: comment.url })
          }}
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
        <Button
          variant="success"
          onClick={handleResolve}
          disabled={resolving}
          className="flex items-center justify-center gap-1.5"
        >
          Mark as resolved <Icon icon={checkIcon} width={14} height={14} />
        </Button>
      </div>
    </div>
  )
}

export function Inbox({ userId, onRead }: { userId: string; onRead?: () => void }) {
  const [comments, setComments] = useState<CommentInboxItem[]>([])
  const [selected, setSelected] = useState<CommentInboxItem | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState<InboxFilter>('all')

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
        setComments(data ?? [])
        setLoading(false)
      })
  }

  useEffect(() => {
    loadComments()

    const channel = supabase
      .channel(`inbox-ui:${userId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'comment_recipients',
        filter: `recipient_type=eq.user,recipient_id=eq.${userId}`,
      }, loadComments)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'comment_recipients',
        filter: `recipient_type=eq.follow,recipient_id=eq.${userId}`,
      }, loadComments)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  function handleSelect(comment: CommentInboxItem) {
    if (!comment.read_at) {
      setComments(prev => prev.map(c =>
        c.recipient_id === comment.recipient_id
          ? { ...c, read_at: new Date().toISOString() }
          : c
      ))
      onRead?.()
    }
    setSelected(comment)
  }

  function handleResolve(recipientId: string) {
    setComments(prev => prev.filter(c => c.recipient_id !== recipientId))
    setSelected(null)
  }

  if (selected) return (
    <Detail
      comment={selected}
      onBack={() => setSelected(null)}
      onResolve={handleResolve}
    />
  )

  const filtered = filter === 'all'      ? comments
    : filter === 'mentions' ? comments.filter(c => c.mentions?.some(m => m.id === userId))
    :                         comments.filter(c => c.recipient_type === 'follow')

  const emptyMessage = filter === 'mentions' ? 'No direct comments received.'
    : filter === 'followed' ? 'No activity on followed pages.'
    : 'No comments received.'

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-center px-4 py-2 border-b border-gray-100 flex-shrink-0">
        <div className="inline-flex bg-gray-100 rounded-9 p-0.5">
          {FILTER_TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setFilter(t.value)}
              className={`px-3 py-1 rounded-6 text-[11px] font-medium transition-all duration-150 ${
                filter === t.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <div className="p-6 text-center mt-8">
          <p className="text-[13px] text-gray-400">{emptyMessage}</p>
          {filter === 'all' && <p className="text-[12px] text-gray-300 mt-1">Click "New" to send one.</p>}
        </div>
      ) : (
        <div className="divide-y divide-gray-100 overflow-y-auto flex-1">
          {filtered.map(comment => (
            <button
              key={comment.recipient_id}
              onClick={() => handleSelect(comment)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 flex gap-3 transition-colors duration-100"
            >
              <ScreenshotThumbnail url={comment.screenshot_url} pinX={comment.pin_x} pinY={comment.pin_y} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {!comment.read_at && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    )}
                    <span className="text-[13px] font-semibold text-gray-900 truncate">{comment.from_username}</span>
                  </div>
                  <span className="text-[11px] text-gray-400 flex-shrink-0">{timeAgo(comment.created_at)}</span>
                </div>
                <p className="text-[11px] text-gray-500 truncate mb-0.5">{hostname(comment.url)}</p>
                <p className="text-[12px] text-gray-600 truncate">{resolveBody(comment.body, comment.mentions)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
