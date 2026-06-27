import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Plus, Rss, Trash2 } from 'lucide-react'
import { IconButton } from '../../components/IconButton'
import { Spinner } from '../../components/Spinner'
import { EmptyState } from '../../components/EmptyState'
import { Input } from '../../components/Input'
import { CommentDetail } from './CommentDetail'
import { useUrlFollows, type PublicComment } from '../../lib/useUrlFollows'
import { hostname } from '../../lib/utils'
import type { DashboardContext } from '../../lib/types'

export function FollowedUrlsPage() {
  const { userId } = useOutletContext<DashboardContext>()
  const { follows, loading, follow, unfollow, isFollowing, getCommentsForUrl } = useUrlFollows(userId)
  const [selectedUrl,     setSelectedUrl]     = useState<string | null>(null)
  const [comments,        setComments]        = useState<PublicComment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [input,           setInput]           = useState('')
  const [inputError,      setInputError]      = useState<string | null>(null)
  const [adding,          setAdding]          = useState(false)

  async function selectUrl(url: string) {
    if (selectedUrl === url) return
    setSelectedUrl(url)
    setLoadingComments(true)
    const data = await getCommentsForUrl(url)
    setComments(data)
    setLoadingComments(false)
  }

  async function handleUnfollow(url: string) {
    await unfollow(url)
    if (selectedUrl === url) {
      setSelectedUrl(null)
      setComments([])
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setInputError(null)
    const raw = input.trim()
    if (!raw) return

    let url = raw
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url
    try { new URL(url) } catch {
      setInputError('Invalid URL')
      return
    }
    if (isFollowing(url)) {
      setInputError('Already following this URL')
      return
    }

    setAdding(true)
    await follow(url)
    setInput('')
    setAdding(false)
  }

  return (
    <div className="flex h-full">

      {/* Left column — URL list */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 dark:border-dark-border flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-border flex-shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Followed URLs</h1>
            {!loading && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {follows.length} page{follows.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <form onSubmit={handleAdd} className="flex gap-1.5">
            <Input
              value={input}
              onChange={e => { setInput(e.target.value); setInputError(null) }}
              placeholder="https://…"
              className="text-xs py-1.5"
              disabled={adding}
            />
            <button
              type="submit"
              disabled={adding || !input.trim()}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-6 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
              title="Follow URL"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
          {inputError && <p className="text-[11px] text-red-500">{inputError}</p>}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Spinner />
            </div>
          ) : follows.length === 0 ? (
            <EmptyState message="No followed URLs yet. Use the extension to follow a page." variant="list" />
          ) : (
            follows.map(f => (
              <button
                key={f.url}
                onClick={() => selectUrl(f.url)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-dark-border-xs hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors group ${
                  selectedUrl === f.url ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/40' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  <img
                    src={`https://icons.duckduckgo.com/ip3/${hostname(f.url)}.ico`}
                    className="w-4 h-4 mt-0.5 flex-shrink-0 rounded-3"
                    alt=""
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{hostname(f.url)}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{f.url}</p>
                  </div>
                  <IconButton
                    variant="danger"
                    onClick={e => { e.stopPropagation(); handleUnfollow(f.url) }}
                    className="opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                    title="Unfollow"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </IconButton>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right column — comments for selected URL */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedUrl ? (
          <div className="flex-1 overflow-y-auto">
            {loadingComments ? (
              <div className="flex items-center justify-center py-10">
                <Spinner />
              </div>
            ) : comments.length === 0 ? (
              <EmptyState message="No public comments on this page." variant="list" />
            ) : (
              comments.map(c => (
                <div key={c.comment_id}>
                  <CommentDetail
                    url={c.url}
                    created_at={c.created_at}
                    screenshot_url={c.screenshot_url ?? ''}
                    pin_x={c.pin_x}
                    pin_y={c.pin_y}
                    body={c.body}
                    from_username={c.from_username}
                    from_avatar_url={c.from_avatar_url}
                    from_initials={c.from_initials}
                    onOpenPage={() => window.open(c.url, '_blank')}
                  />
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Rss className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400 dark:text-gray-500">Select a URL to see its public comments</p>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
