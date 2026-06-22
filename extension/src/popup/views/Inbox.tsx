import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import arrowLeftIcon  from '@iconify-icons/lucide/arrow-left'
import arrowRightIcon from '@iconify-icons/lucide/arrow-right'
import checkIcon      from '@iconify-icons/lucide/check'
import link2Icon      from '@iconify-icons/lucide/link-2'
import { Button } from '../components/Button'
import { supabase } from '../../shared/supabase'
import type { CommentInboxItem } from '../../shared/types'
import { hostname, timeAgo } from '../../shared/utils'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

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

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'MARK_READ', payload: { recipientId: comment.recipient_id } })
  }, [comment.recipient_id])

  async function handleCopyLink() {
    const url = `${SUPABASE_URL}/functions/v1/get-comment-page?id=${comment.comment_id}`
    await navigator.clipboard.writeText(url)
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
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 transition-colors duration-150">
          <Icon icon={arrowLeftIcon} width={18} height={18} />
        </button>
        <span className="text-[12px] text-gray-500 truncate">{hostname(comment.url)}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="relative rounded-lg overflow-hidden border border-gray-200">
          <img src={comment.screenshot_url} className="w-full" alt="screenshot" />
          <div
            className="absolute w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-md"
            style={{
              left:      `${comment.pin_x}%`,
              top:       `${comment.pin_y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-gray-900">{comment.from_username}</p>
          <p className="text-[11px] text-gray-400 mb-2">{new Date(comment.created_at).toLocaleString('en-US')}</p>
          <p className="text-[13px] text-gray-700 leading-relaxed">{comment.body}</p>
        </div>
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
        <Button
          variant="ghost"
          onClick={handleResolve}
          disabled={resolving}
          className="flex items-center justify-center gap-1.5 text-green-600 border border-green-500 hover:bg-green-50"
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

  function loadComments() {
    supabase
      .from('comment_inbox')
      .select('*')
      .eq('for_user_id', userId)
      .neq('from_user_id', userId)
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
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'comment_recipients',
          filter: `recipient_type=eq.user,recipient_id=eq.${userId}`,
        },
        loadComments,
      )
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

  if (loading) {
    return <div className="p-4 text-[13px] text-gray-400 text-center mt-8">Loading...</div>
  }

  if (comments.length === 0) {
    return (
      <div className="p-6 text-center mt-8">
        <p className="text-[13px] text-gray-400">No comments received.</p>
        <p className="text-[12px] text-gray-300 mt-1">Click "New" to send one.</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {comments.map(comment => (
        <button
          key={comment.recipient_id}
          onClick={() => handleSelect(comment)}
          className="w-full text-left px-4 py-3 hover:bg-gray-50 flex gap-3 transition-colors duration-100"
        >
          <div className="relative flex-shrink-0">
            <img
              src={comment.screenshot_url}
              className="w-14 h-10 object-cover rounded border border-gray-200"
              alt=""
            />
            <div
              className="absolute w-2.5 h-2.5 rounded-full bg-blue-600 border border-white shadow-sm"
              style={{
                left:      `${comment.pin_x}%`,
                top:       `${comment.pin_y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          </div>
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
            <p className="text-[12px] text-gray-600 truncate">{comment.body}</p>
          </div>
        </button>
      ))}
    </div>
  )
}
