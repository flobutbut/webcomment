import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { posthog } from '../lib/posthog'
import { Button } from './Button'

interface Props {
  initialMode?: 'signin' | 'early-access'
  onClose: () => void
  onSuccess?: () => void
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials'))   return 'Incorrect email or password.'
  if (msg.includes('Email not confirmed'))         return 'Please confirm your email address first.'
  if (msg.includes('rate limit'))                  return 'Too many attempts, please try again in a few minutes.'
  return msg
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

const INPUT = `
  w-full px-3 py-2.5 rounded-6 text-sm
  bg-dark-800 border border-dark-border text-white
  placeholder:text-zinc-700
  focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20
  transition-colors
`

export function AuthModal({ initialMode = 'signin', onClose, onSuccess }: Props) {
  const [mode, setMode]         = useState<'signin' | 'early-access'>(initialMode)
  const [email, setEmail]       = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPass]     = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [done, setDone]         = useState(false)

  function switchMode(m: 'signin' | 'early-access') {
    setMode(m)
    setError(null)
    setDone(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'early-access') {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/request-invite`,
          {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ full_name: fullName.trim(), email: email.trim() }),
          }
        )
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? 'Could not submit request.')
        }
        posthog.capture('early_access_requested')
      } else {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
        if (signInErr) throw signInErr
        if (signInData.user) {
          posthog.identify(signInData.user.id)
          posthog.capture('user_signed_in')
        }
        onSuccess?.()
      }
      setDone(true)
    } catch (err: unknown) {
      posthog.captureException(err)
      setError(err instanceof Error ? translateError(err.message) : 'An error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const EyeIcon = ({ open }: { open: boolean }) => open ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-dark-700 border border-dark-border-sm rounded-18 p-8 w-full max-w-sm mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {done && mode === 'early-access' ? (
          <div className="text-center py-4">
            <div className="w-10 h-10 rounded-full bg-blue-600/10 border border-blue-600/30 flex items-center justify-center mx-auto mb-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-white font-semibold text-lg mb-2">Request received.</h2>
            <p className="text-zinc-500 text-sm leading-relaxed mb-6">
              We'll email you at <span className="text-zinc-300">{email}</span> when your spot is ready.
            </p>
            <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors font-mono">
              // close
            </button>
          </div>
        ) : done && mode === 'signin' ? (
          <div className="text-center py-4">
            <div className="w-10 h-10 rounded-full bg-blue-600/10 border border-blue-600/30 flex items-center justify-center mx-auto mb-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-white font-semibold text-lg mb-2">Signed in.</h2>
            <p className="text-zinc-500 text-sm leading-relaxed mb-6">
              Open the extension — your session is live.
            </p>
            <Link
              to="/dashboard"
              onClick={onClose}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold transition-colors mb-3"
            >
              Open dashboard →
            </Link>
            <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors font-mono">
              // close
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-1 bg-dark-900 border border-dark-border-sm rounded-9 p-1">
                {(['signin', 'early-access'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    className={`px-3 py-1.5 rounded-6 text-sm font-medium transition-all ${
                      mode === m ? 'bg-dark-hover text-white' : 'text-zinc-600 hover:text-zinc-400'
                    }`}
                  >
                    {m === 'signin' ? 'Sign in' : 'Early access'}
                  </button>
                ))}
              </div>
              <button
                onClick={onClose}
                className="text-zinc-700 hover:text-zinc-400 transition-colors text-xl leading-none w-7 h-7 flex items-center justify-center rounded-6 hover:bg-dark-hover"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'early-access' && (
                <input
                  type="text"
                  placeholder="Full name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className={INPUT}
                  required
                  autoFocus
                  minLength={2}
                  maxLength={100}
                />
              )}

              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={INPUT}
                required
                autoFocus={mode === 'signin'}
              />

              {mode === 'signin' && (
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={e => setPass(e.target.value)}
                    className={INPUT + ' pr-10'}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
                    tabIndex={-1}
                  >
                    <EyeIcon open={showPass} />
                  </button>
                </div>
              )}

              {mode === 'early-access' && (
                <p className="font-mono text-xs text-zinc-600 px-1">
                  We'll review your request and send you an invite.
                </p>
              )}

              {error && (
                <p className="text-red-400 text-xs font-mono border border-red-900/30 bg-red-900/10 rounded-9 px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading}
                className="w-full justify-center"
              >
                {loading
                  ? <span className="font-mono text-xs">// {mode === 'signin' ? 'connecting' : 'sending'}...</span>
                  : mode === 'signin' ? 'Sign in' : 'Ask for an invite'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
