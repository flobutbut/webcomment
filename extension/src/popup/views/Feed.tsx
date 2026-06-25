import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import bookmarkIcon      from '@iconify-icons/lucide/bookmark'
import bookmarkCheckIcon from '@iconify-icons/lucide/bookmark-check'
import arrowLeftIcon     from '@iconify-icons/lucide/arrow-left'
import arrowRightIcon    from '@iconify-icons/lucide/arrow-right'
import imageOffIcon      from '@iconify-icons/lucide/image-off'
import { Loading }     from '../components/Loading'
import { IconButton }  from '../components/IconButton'
import { BodyText } from '../components/BodyText'
import { Button }   from '../components/Button'
import { supabase } from '../../shared/supabase'
import { hostname, timeAgo } from '../../shared/utils'

interface FeedComment {
  comment_id:      string
  url:             string
  body:            string
  tags:            string[] | null
  created_at:      string
  screenshot_url:  string | null
  pin_x:           number
  pin_y:           number
  from_user_id:    string
  from_username:   string
  from_avatar_url: string | null
  from_initials:   string | null
}

interface UrlFollow {
  url:        string
  created_at: string
}

function CommentDetail({
  comment,
  onBack,
}: {
  comment: FeedComment
  onBack:  () => void
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <IconButton onClick={onBack}>
          <Icon icon={arrowLeftIcon} width={18} height={18} />
        </IconButton>
        <span className="text-[12px] text-gray-500 truncate">{hostname(comment.url)}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="relative rounded-9 overflow-hidden border border-gray-200">
          {imgError || !comment.screenshot_url ? (
            <div className="w-full h-32 bg-gray-50 flex flex-col items-center justify-center gap-2 text-gray-400">
              <Icon icon={imageOffIcon} width={20} height={20} />
              <span className="text-[12px]">No screenshot</span>
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
          <BodyText body={comment.body} mentions={[]} />
        </div>

        <Button
          variant="secondary"
          onClick={() => chrome.tabs.create({ url: comment.url })}
          className="flex items-center justify-center gap-1.5"
        >
          Open page <Icon icon={arrowRightIcon} width={14} height={14} />
        </Button>
      </div>
    </div>
  )
}

export function Feed({ userId }: { userId: string }) {
  const [follows,    setFollows]    = useState<UrlFollow[]>([])
  const [comments,   setComments]   = useState<FeedComment[]>([])
  const [selected,   setSelected]   = useState<FeedComment | null>(null)
  const [currentUrl, setCurrentUrl] = useState<string | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [toggling,   setToggling]   = useState(false)

  const isFollowing = currentUrl ? follows.some(f => f.url === currentUrl) : false

  // Get current tab URL
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const url = tabs[0]?.url ?? null
      if (
        url &&
        !url.startsWith('chrome://') &&
        !url.startsWith('chrome-extension://') &&
        !url.startsWith('about:') &&
        !url.startsWith('edge://')
      ) {
        setCurrentUrl(url)
      }
    })
  }, [])

  // Load follows + feed
  useEffect(() => {
    async function load() {
      const { data: followData } = await supabase
        .from('url_follows')
        .select('url, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      const f = (followData ?? []) as UrlFollow[]
      setFollows(f)

      if (f.length === 0) {
        setComments([])
        setLoading(false)
        return
      }

      const { data: feedData } = await supabase
        .rpc('get_feed_comments', { p_user_id: userId })

      setComments((feedData ?? []) as FeedComment[])
      setLoading(false)
    }
    load()
  }, [userId])

  async function toggleFollow() {
    if (!currentUrl || toggling) return
    setToggling(true)
    if (isFollowing) {
      await supabase.from('url_follows').delete().eq('user_id', userId).eq('url', currentUrl)
      setFollows(prev => prev.filter(f => f.url !== currentUrl))
      setComments(prev => prev.filter(c => c.url !== currentUrl))
    } else {
      const { data } = await supabase
        .from('url_follows')
        .insert({ user_id: userId, url: currentUrl })
        .select('url, created_at')
        .single()
      if (data) {
        setFollows(prev => [data as UrlFollow, ...prev])
        // Reload feed to include new URL's comments
        const { data: feedData } = await supabase
          .rpc('get_feed_comments', { p_user_id: userId })
        setComments((feedData ?? []) as FeedComment[])
      }
    }
    setToggling(false)
  }

  if (selected) {
    return <CommentDetail comment={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className="flex flex-col h-full">

      {/* Follow toggle for current page */}
      {currentUrl && (
        <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between gap-2 flex-shrink-0">
          <p className="text-[11px] text-gray-500 truncate">{hostname(currentUrl)}</p>
          <button
            onClick={toggleFollow}
            disabled={toggling}
            className={`flex items-center gap-1 px-2 py-1 text-[11px] rounded-6 border transition-colors flex-shrink-0 ${
              isFollowing
                ? 'border-blue-200 bg-blue-50 text-blue-600'
                : 'border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600'
            } disabled:opacity-50`}
          >
            <Icon icon={isFollowing ? bookmarkCheckIcon : bookmarkIcon} width={11} height={11} />
            {isFollowing ? 'Following' : 'Follow page'}
          </button>
        </div>
      )}

      {/* Feed list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <Loading />
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <p className="text-[12px] text-gray-400 font-medium">No comments yet</p>
            <p className="text-[11px] text-gray-300 mt-1">Follow pages to see their public comments here</p>
          </div>
        ) : (
          comments.map(c => (
            <button
              key={c.comment_id}
              onClick={() => setSelected(c)}
              className="w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-[11px] text-gray-400 truncate">{hostname(c.url)}</span>
                <span className="text-[10px] text-gray-300 flex-shrink-0">{timeAgo(c.created_at)}</span>
              </div>
              <p className="text-[12px] font-medium text-gray-900 truncate">{c.from_username}</p>
              <p className="text-[11px] text-gray-500 line-clamp-2 break-words">{c.body}</p>
            </button>
          ))
        )}
      </div>

    </div>
  )
}
