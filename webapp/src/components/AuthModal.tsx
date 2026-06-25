import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from './Button'

interface Props {
  initialMode?: 'signin' | 'signup'
  onClose: () => void
  onSuccess?: () => void
}

function validateUsername(u: string): string | null {
  if (u.length < 3 || u.length > 30) return 'Username must be 3–30 characters.'
  if (!/^[a-zA-Z0-9_-]+$/.test(u)) return 'Only letters, digits, _ or - allowed.'
  return null
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials'))   return 'Incorrect email or password.'
  if (msg.includes('Email not confirmed'))         return 'Please confirm your email address first.'
  if (msg.includes('User already registered'))     return 'An account with this email already exists.'
  if (msg.includes('Password should be'))          return 'Password must be at least 6 characters.'
  if (msg.includes('rate limit'))                  return 'Too many attempts, please try again in a few minutes.'
  if (msg.includes('profiles_username_key'))       return 'This username is already taken.'
  if (msg.includes('Database error'))              return 'This username is already taken.'
  return msg
}

const INPUT = `
  w-full px-3 py-2.5 rounded-6 text-sm
  bg-dark-800 border border-dark-border text-white
  placeholder:text-zinc-700
  focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20
  transition-colors
`

export function AuthModal({ initialMode = 'signin', onClose, onSuccess }: Props) {
  const [mode, setMode]             = useState<'signin' | 'signup'>(initialMode)
  const [email, setEmail]           = useState('')
  const [password, setPass]         = useState('')
  const [confirm, setConfirm]       = useState('')
  const [username, setUser]         = useState('')
  const [avatarLetters, setAvatar]  = useState('')
  const [avatarEdited, setAvatarEdited] = useState(false)
  const [showPass, setShowPass]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [done, setDone]             = useState(false)

  function switchMode(m: 'signin' | 'signup') {
    setMode(m)
    setError(null)
    setConfirm('')
    setUser('')
    setAvatar('')
    setAvatarEdited(false)
  }

  function handleUsernameChange(val: string) {
    const cleaned = val.replace(/ /g, '_')
    setUser(cleaned)
    if (!avatarEdited) {
      setAvatar(cleaned.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase())
    }
  }

  function handleAvatarChange(val: string) {
    setAvatar(val.toUpperCase().slice(0, 2))
    setAvatarEdited(true)
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
        if (password !== confirm) { setError('Passwords do not match.'); setLoading(false); return }

        const initials = avatarLetters || username.replace(/\s/g, '').slice(0, 2).toUpperCase()
        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username, initials } },
        })
        if (signUpErr) throw signUpErr
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
        if (signInErr) throw signInErr
      }
      setDone(true)
      onSuccess?.()
    } catch (err: unknown) {
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
                ? 'Now install the extension to start leaving marks.'
                : 'Open the extension — your session is live.'}
            </p>
            <Link
              to="/dashboard"
              onClick={onClose}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold transition-colors mb-3"
            >
              Open dashboard →
            </Link>
            {mode === 'signup' && (
              <a
                href="https://github.com/flobutbut/webcomment/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-6 bg-white hover:bg-zinc-100 active:bg-zinc-200 text-black text-sm font-semibold transition-colors mb-3"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                Download on GitHub
              </a>
            )}
            <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors font-mono">
              // close
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-1 bg-dark-900 border border-dark-border-sm rounded-9 p-1">
                {(['signin', 'signup'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    className={`px-3 py-1.5 rounded-6 text-sm font-medium transition-all ${
                      mode === m ? 'bg-dark-hover text-white' : 'text-zinc-600 hover:text-zinc-400'
                    }`}
                  >
                    {m === 'signin' ? 'Sign in' : 'Sign up'}
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

              {/* Username + avatar preview tile */}
              {mode === 'signup' && (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-9 bg-dark-800 border border-dark-border">
                  <div className="relative group/avatar flex-shrink-0 cursor-text">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 ${
                      avatarLetters
                        ? 'bg-blue-600/20 group-hover/avatar:bg-blue-600/30 has-[:focus]:ring-2 has-[:focus]:ring-blue-500/40 has-[:focus]:ring-offset-1 has-[:focus]:ring-offset-[#0c0c0c]'
                        : 'border-2 border-dashed border-dark-border-xl group-hover/avatar:border-zinc-500 has-[:focus]:border-blue-600 has-[:focus]:border-solid'
                    }`}>
                      <input
                        type="text"
                        value={avatarLetters}
                        onChange={e => handleAvatarChange(e.target.value)}
                        maxLength={2}
                        placeholder="AB"
                        className={`w-7 text-center font-bold text-[12px] bg-transparent focus:outline-none cursor-text ${
                          avatarLetters ? 'text-blue-400' : 'text-transparent placeholder:text-zinc-700 placeholder:font-normal'
                        }`}
                      />
                    </div>
                    {/* Pencil badge — visible on hover, hidden when editing */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-dark-subtle border border-dark-border-xl flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 group-focus-within/avatar:opacity-0 transition-opacity duration-150 pointer-events-none">
                      <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={e => handleUsernameChange(e.target.value)}
                    className="flex-1 text-sm font-medium bg-transparent focus:outline-none text-zinc-200 placeholder:font-normal placeholder:text-zinc-700 min-w-0"
                    required
                    autoFocus
                  />
                </div>
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

              {/* Password */}
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

              {/* Confirm password */}
              {mode === 'signup' && (
                <>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="Confirm password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
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
                  <p className="font-mono text-xs text-zinc-600 -mt-1 px-1">min. 6 characters</p>
                </>
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
                  ? <span className="font-mono text-xs">// connecting...</span>
                  : mode === 'signin' ? 'Sign in' : 'Create account'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
