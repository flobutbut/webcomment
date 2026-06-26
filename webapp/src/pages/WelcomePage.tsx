import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '../components/Button'
import type { User } from '@supabase/supabase-js'

const INPUT = `
  w-full px-3 py-2.5 rounded-6 text-sm
  bg-dark-800 border border-dark-border text-white
  placeholder:text-zinc-700
  focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20
  transition-colors
`

function validateUsername(u: string): string | null {
  if (u.length < 3 || u.length > 30) return 'Username must be 3–30 characters.'
  if (!/^[a-zA-Z0-9_-]+$/.test(u)) return 'Only letters, digits, _ or - allowed.'
  return null
}

export default function WelcomePage() {
  const navigate = useNavigate()
  const [user,     setUser]     = useState<User | null>(null)
  const [loading,  setLoading]  = useState(true)

  const [username,  setUsername]  = useState('')
  const [initials,  setInitials]  = useState('')
  const [initialsEdited, setInitialsEdited] = useState(false)
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [done,      setDone]      = useState(false)

  useEffect(() => {
    const hasHashTokens = window.location.hash.includes('access_token=')

    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !hasHashTokens) {
        navigate('/dashboard', { replace: true })
      } else if (!hasHashTokens) {
        navigate('/', { replace: true })
      }
      // else: wait for onAuthStateChange to process the hash
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        const fullName: string = session.user.user_metadata?.full_name ?? ''
        if (fullName) {
          const derived = fullName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30).toLowerCase()
          setUsername(derived)
          setInitials(fullName.split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2))
        }
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  function handleUsernameChange(val: string) {
    const cleaned = val.replace(/ /g, '_')
    setUsername(cleaned)
    if (!initialsEdited) {
      setInitials(cleaned.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase())
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const usernameErr = validateUsername(username)
    if (usernameErr) { setError(usernameErr); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setSubmitting(true)
    try {
      const derivedInitials = initials || username.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase()

      const { error: authErr } = await supabase.auth.updateUser({
        password,
        data: { username, initials: derivedInitials },
      })
      if (authErr) throw authErr

      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ username, initials: derivedInitials })
        .eq('id', user!.id)

      if (profileErr) {
        if (profileErr.code === '23505') throw new Error('This username is already taken.')
        throw profileErr
      }

      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
      <div className="bg-dark-700 border border-dark-border-sm rounded-18 p-8 w-full max-w-sm shadow-2xl">
        {done ? (
          <div className="text-center py-4">
            <div className="w-10 h-10 rounded-full bg-blue-600/10 border border-blue-600/30 flex items-center justify-center mx-auto mb-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-white font-semibold text-lg mb-2">You're in.</h2>
            <p className="text-zinc-500 text-sm leading-relaxed mb-6">
              Account set up. Install the extension to start leaving marks.
            </p>
            <Button
              variant="primary"
              size="lg"
              className="w-full justify-center mb-3"
              onClick={() => navigate('/dashboard')}
            >
              Open dashboard →
            </Button>
            <a
              href="https://github.com/flobutbut/webcomment/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-6 bg-white hover:bg-zinc-100 active:bg-zinc-200 text-black text-sm font-semibold transition-colors"
            >
              Download extension
            </a>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-white font-semibold text-lg mb-1">Set up your account</h1>
              <p className="text-zinc-500 text-sm">Choose a username and password to get started.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Username + initials tile */}
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-9 bg-dark-800 border border-dark-border">
                <div className="relative group/avatar flex-shrink-0 cursor-text">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 ${
                    initials
                      ? 'bg-blue-600/20 group-hover/avatar:bg-blue-600/30'
                      : 'border-2 border-dashed border-dark-border-xl group-hover/avatar:border-zinc-500'
                  }`}>
                    <input
                      type="text"
                      value={initials}
                      onChange={e => { setInitials(e.target.value.toUpperCase().slice(0, 2)); setInitialsEdited(true) }}
                      maxLength={2}
                      placeholder="AB"
                      className={`w-7 text-center font-bold text-[12px] bg-transparent focus:outline-none cursor-text ${
                        initials ? 'text-blue-400' : 'text-transparent placeholder:text-zinc-700 placeholder:font-normal'
                      }`}
                    />
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

              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
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
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className={INPUT + ' pr-10'}
                  required
                />
              </div>
              <p className="font-mono text-xs text-zinc-600 px-1">min. 6 characters</p>

              {error && (
                <p className="text-red-400 text-xs font-mono border border-red-900/30 bg-red-900/10 rounded-9 px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={submitting}
                className="w-full justify-center"
              >
                {submitting
                  ? <span className="font-mono text-xs">// creating account...</span>
                  : 'Create account'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
