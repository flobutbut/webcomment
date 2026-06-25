import { useState } from 'react'
import { ExternalLink, Link2, Check, Trash2, ImageOff } from 'lucide-react'
import { hostname } from '../../lib/utils'
import { Avatar }    from '../../components/Avatar'
import { Button }    from '../../components/Button'
import { BodyText }  from '../../components/BodyText'
import type { Mention } from '../../lib/types'

interface CommentDetailProps {
  url:            string
  created_at:     string
  screenshot_url: string
  pin_x:          number
  pin_y:          number
  body:           string
  mentions?:        Mention[]
  from_username?:   string
  from_avatar_url?: string | null
  from_initials?:   string | null
  onOpenPage?: () => void
  onResolve?:  () => Promise<void>
  onDelete?:   () => Promise<void>
}

function Screenshot({ url, pinX, pinY }: { url: string; pinX: number; pinY: number }) {
  const [err, setErr] = useState(false)
  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
      {err ? (
        <div className="w-full h-48 flex items-center justify-center">
          <ImageOff className="w-6 h-6 text-gray-300" />
        </div>
      ) : (
        <>
          <img src={url} className="w-full" alt="" onError={() => setErr(true)} />
          <div
            className="absolute w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md"
            style={{ left: `${pinX}%`, top: `${pinY}%`, transform: 'translate(-50%, -50%)' }}
          />
        </>
      )}
    </div>
  )
}

export function CommentDetail({
  url, created_at, screenshot_url, pin_x, pin_y, body, mentions = [],
  from_username, from_avatar_url, from_initials,
  onOpenPage, onResolve, onDelete,
}: CommentDetailProps) {
  const [copied,     setCopied]     = useState(false)
  const [resolving,  setResolving]  = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleResolve() {
    setResolving(true)
    await onResolve?.()
    setResolving(false)
  }

  async function handleDelete() {
    setDeleting(true)
    await onDelete?.()
    setDeleting(false)
  }

  const date = new Date(created_at).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <div className="p-5 space-y-4 max-w-2xl mx-auto w-full">

      {/* Head */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {from_username && (
            <Avatar username={from_username} initials={from_initials} avatarUrl={from_avatar_url} size="sm" />
          )}
          <div className="min-w-0">
            {from_username && (
              <p className="text-sm font-semibold text-gray-900 truncate">{from_username}</p>
            )}
            <p className="text-xs text-gray-400">{date}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onOpenPage && (
            <Button variant="outline" size="sm" onClick={onOpenPage} title="Open page">
              <ExternalLink className="w-3.5 h-3.5" />
              Open
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleCopy} title="Copy link">
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Link2 className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          {onResolve && (
            <Button
              variant="success-outline"
              size="sm"
              onClick={handleResolve}
              disabled={resolving}
              title="Resolve"
            >
              <Check className="w-3.5 h-3.5" />
              {resolving ? '…' : 'Resolve'}
            </Button>
          )}
          {onDelete && !confirming && (
            <Button
              variant="ghost-danger"
              size="sm"
              onClick={() => setConfirming(true)}
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
          {onDelete && confirming && (
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? '…' : 'Delete'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Capture + URL caption */}
      <div>
        <Screenshot url={screenshot_url} pinX={pin_x} pinY={pin_y} />
        <p className="text-xs text-gray-400 mt-2 truncate">{hostname(url)}</p>
      </div>

      {/* Comment */}
      <BodyText body={body} mentions={mentions} className="text-sm text-gray-700 leading-relaxed" />

    </div>
  )
}
