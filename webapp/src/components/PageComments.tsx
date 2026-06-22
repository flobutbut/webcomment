import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

interface DemoComment {
  id: string
  x_pct: number
  y_pct: number
  message: string
  author: string | null
  created_at: string
}

interface ComposerState {
  xPct: number
  yPct: number
  clientX: number
  clientY: number
}

const STATIC_PINS: DemoComment[] = [
  { id: 'static-1', x_pct: 22, y_pct: 14, message: "The 'dead drop' framing is perfect — immediately sets the tone.", author: "Sarah K.", created_at: '' },
  { id: 'static-2', x_pct: 70, y_pct: 28, message: "Would love a video showing the pin in action.", author: "Marc", created_at: '' },
  { id: 'static-3', x_pct: 38, y_pct: 55, message: "This section convinced me. Dropping comments on Notion is the use case.", author: "dev@acme", created_at: '' },
]

const RATE_LIMIT_KEY = 'wc_demo_last_post'
const RATE_LIMIT_MS = 5 * 60 * 1000

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function PageComments() {
  const [comments, setComments] = useState<DemoComment[]>([])
  const [activePin, setActivePin] = useState<string | null>(null)
  const [composer, setComposer] = useState<ComposerState | null>(null)
  const [author, setAuthor] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [postError, setPostError] = useState('')
  const composerRef = useRef(composer)

  useEffect(() => { composerRef.current = composer }, [composer])

  useEffect(() => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    supabase
      .from('demo_comments')
      .select('*')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setComments(data) })

    const channel = supabase
      .channel('demo_comments_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'demo_comments' }, payload => {
        setComments(prev => [...prev, payload.new as DemoComment])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-pin]') || target.closest('[data-composer]')) return

      if (composerRef.current) {
        setComposer(null)
        return
      }

      if (target.closest('button, a, input, textarea, select')) return

      const scrollW = document.documentElement.scrollWidth
      const scrollH = document.documentElement.scrollHeight
      setComposer({
        xPct: (e.pageX / scrollW) * 100,
        yPct: (e.pageY / scrollH) * 100,
        clientX: e.clientX,
        clientY: e.clientY,
      })
      setActivePin(null)
      setPostError('')
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setComposer(null)
    }

    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const handleSubmit = async () => {
    if (!message.trim() || !composer) return

    const lastPost = localStorage.getItem(RATE_LIMIT_KEY)
    if (lastPost && Date.now() - parseInt(lastPost) < RATE_LIMIT_MS) {
      setPostError('Wait a few minutes before posting again.')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.from('demo_comments').insert({
      x_pct: composer.xPct,
      y_pct: composer.yPct,
      message: message.trim().slice(0, 200),
      author: author.trim().slice(0, 30) || null,
    })

    if (error) {
      setPostError('Failed to post. Try again.')
    } else {
      localStorage.setItem(RATE_LIMIT_KEY, String(Date.now()))
      setComposer(null)
      setMessage('')
      setAuthor('')
    }
    setSubmitting(false)
  }

  const allPins = [...STATIC_PINS, ...comments]

  const composerLeft = composer
    ? clamp(composer.clientX + 16, 16, window.innerWidth - 272)
    : 0
  const composerTop = composer
    ? clamp(composer.clientY + 16, 72, window.innerHeight - 220)
    : 0

  return (
    <>
      {/* Absolute overlay — pins anchored to page coordinates */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 35 }}>
        {allPins.map(pin => {
          const isStatic = pin.id.startsWith('static-')
          const isActive = activePin === pin.id
          const tooltipBelow = pin.y_pct < 60

          return (
            <div
              key={pin.id}
              data-pin="true"
              className="absolute pointer-events-auto"
              style={{
                left: `${pin.x_pct}%`,
                top: `${pin.y_pct}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onClick={e => {
                e.stopPropagation()
                setActivePin(isActive ? null : pin.id)
                setComposer(null)
              }}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full border-2 cursor-pointer transition-transform duration-100 hover:scale-125 ${
                  isStatic
                    ? 'bg-zinc-700 border-zinc-500'
                    : 'bg-blue-600 border-blue-400 shadow-[0_0_8px_rgba(37,99,235,0.45)]'
                }`}
              />
              {isActive && (
                <div
                  className={`absolute left-1/2 -translate-x-1/2 w-56 bg-[#111] border border-[#252525] rounded-lg p-3 shadow-2xl pointer-events-none ${
                    tooltipBelow ? 'top-5' : 'bottom-5'
                  }`}
                >
                  {pin.author && (
                    <p className="font-mono text-[10px] text-zinc-500 mb-1">{pin.author}</p>
                  )}
                  <p className="text-xs text-zinc-300 leading-relaxed">{pin.message}</p>
                  {!isStatic && (
                    <p className="font-mono text-[9px] text-zinc-600 mt-2">
                      {new Date(pin.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {' · '}disappears in 24h
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Fixed composer — follows viewport */}
      {composer && (
        <div
          data-composer="true"
          className="fixed z-50 w-64 bg-[#111] border border-[#252525] rounded-xl p-4 shadow-2xl"
          style={{ left: composerLeft, top: composerTop }}
          onClick={e => e.stopPropagation()}
        >
          <p className="font-mono text-[10px] text-zinc-500 mb-3">// drop a comment here</p>
          <input
            type="text"
            placeholder="Your name (optional)"
            value={author}
            onChange={e => setAuthor(e.target.value.slice(0, 30))}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 mb-2 focus:outline-none focus:border-blue-600/50 transition-colors"
          />
          <textarea
            placeholder="Leave a comment…"
            value={message}
            onChange={e => setMessage(e.target.value.slice(0, 200))}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 mb-2 resize-none h-20 focus:outline-none focus:border-blue-600/50 transition-colors"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit() }}
          />
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] text-zinc-600">{message.length}/200</span>
            <div className="flex gap-2">
              <button
                onClick={() => setComposer(null)}
                className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!message.trim() || submitting}
                className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-3 py-1 rounded-lg transition-colors"
              >
                {submitting ? '…' : 'Post'}
              </button>
            </div>
          </div>
          {postError && (
            <p className="font-mono text-[10px] text-red-500 mt-2">{postError}</p>
          )}
        </div>
      )}
    </>
  )
}
