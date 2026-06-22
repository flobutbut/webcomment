import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  initialMode?: 'signin' | 'signup'
  onClose: () => void
}

function validateUsername(u: string): string | null {
  if (u.length < 3 || u.length > 30) return 'Username must be 3–30 characters.'
  if (!/^[a-zA-Z0-9_-]+$/.test(u)) return 'Only letters, digits, _ or - allowed.'
  return null
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Incorrect email or password.'
  if (msg.includes('Email not confirmed')) return 'Please confirm your email address first.'
  if (msg.includes('User already registered')) return 'An account with this email already exists.'
  if (msg.includes('Password should be')) return 'Password must be at least 6 characters.'
  return msg
}

const INPUT = `
  w-full px-3 py-2.5 rounded-lg text-sm
  bg-[#0c0c0c] border border-[#222] text-white
  placeholder:text-zinc-700
  focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20
  transition-colors
`

export function AuthModal({ initialMode = 'signin', onClose }: Props) {
  const [mode, setMode]       = useState<'signin' | 'signup'>(initialMode)
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [username, setUser]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [done, setDone]         = useState(false)
  const [showPass, setShowPass] = useState(false)

  function switchMode(m: 'signin' | 'signup') {
    setMode(m)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'signup') {
        const err = validateUsername(username)
        if (err) { setError(err); setLoading(false); return }
        if (password.length < 6) { setError('Password must be at least 6 characters.'); setLoading(false); return }

        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } },
        })
        if (signUpErr) throw signUpErr
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
        if (signInErr) throw signInErr
      }
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? translateError(err.message) : 'An error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-8 w-full max-w-sm mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {done ? (
          <div className="text-center py-4">
            <div className="w-10 h-10 rounded-full bg-blue-600/10 border border-blue-600/30 flex items-center justify-center mx-auto mb-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-white font-semibold text-lg mb-2">
              {mode === 'signup' ? 'Account created.' : 'Signed in.'}
            </h2>
            <p className="text-zinc-500 text-sm leading-relaxed mb-6">
              {mode === 'signup'
                ? 'Open the WebComment extension in Chrome to get started.'
                : 'Open the extension — your session is live.'}
            </p>
            <button
              onClick={onClose}
              className="text-blue-500 hover:text-blue-400 text-sm transition-colors font-mono"
            >
              // close
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-1 bg-[#080808] border border-[#1e1e1e] rounded-lg p-1">
                <button
                  onClick={() => switchMode('signin')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    mode === 'signin'
                      ? 'bg-[#1a1a1a] text-white'
                      : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  Sign in
                </button>
                <button
                  onClick={() => switchMode('signup')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    mode === 'signup'
                      ? 'bg-[#1a1a1a] text-white'
                      : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  Sign up
                </button>
              </div>
              <button
                onClick={onClose}
                className="text-zinc-700 hover:text-zinc-400 transition-colors text-xl leading-none w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#1a1a1a]"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'signup' && (
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={e => setUser(e.target.value)}
                  className={INPUT}
                  required
                  autoFocus
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
                  {showPass ? (
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
                  )}
                </button>
              </div>
              {mode === 'signup' && (
                <p className="font-mono text-[10px] text-zinc-600 -mt-1 px-1">min. 6 characters</p>
              )}

              {error && (
                <p className="text-red-400 text-xs font-mono border border-red-900/30 bg-red-900/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading
                  ? <span className="font-mono text-xs">// connecting...</span>
                  : mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
