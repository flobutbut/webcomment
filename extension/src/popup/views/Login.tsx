import { useState } from 'react'
import { Button } from '../components/Button'
import { supabase } from '../../shared/supabase'

export function Login() {
  const [email,        setEmail]        = useState('')
  const [username,     setUsername]     = useState('')
  const [avatarLetters, setAvatarLetters] = useState('')
  const [avatarEdited, setAvatarEdited] = useState(false)
  const [password,     setPassword]     = useState('')
  const [confirm,      setConfirm]      = useState('')
  const [showPwd,      setShowPwd]      = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [info,         setInfo]         = useState<string | null>(null)
  const [isSignUp,     setIsSignUp]     = useState(false)

  function handleUsernameChange(val: string) {
    setUsername(val)
    if (!avatarEdited) {
      setAvatarLetters(val.replace(/\s/g, '').slice(0, 2).toUpperCase())
    }
  }

  function handleAvatarLettersChange(val: string) {
    setAvatarLetters(val.toUpperCase().slice(0, 2))
    setAvatarEdited(true)
  }

  function translateAuthError(message: string): string {
    if (message.includes('Password should be at least'))  return 'Password must be at least 6 characters.'
    if (message.includes('Invalid login credentials'))    return 'Incorrect email or password.'
    if (message.includes('Email not confirmed'))          return 'Please confirm your email before signing in.'
    if (message.includes('User already registered'))      return 'An account already exists with this email.'
    if (message.includes('rate limit'))                   return 'Too many attempts, please try again in a few minutes.'
    if (message.includes('profiles_username_key'))        return 'This username is already taken.'
    if (message.includes('Database error'))               return 'This username is already taken.'
    return message
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (isSignUp) {
      if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
        setError('Invalid username (3–30 characters, letters, digits, _ or -).')
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.')
        return
      }
      if (password !== confirm) {
        setError('Passwords do not match.')
        return
      }
    }

    setLoading(true)

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username, initials: avatarLetters || username.replace(/\s/g, '').slice(0, 2).toUpperCase() } } })
      if (error) {
        setError(translateAuthError(error.message || `Error ${(error as { status?: number }).status ?? 'unknown'}`))
      } else if (!data.session) {
        setInfo('Check your inbox and click the confirmation link.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(translateAuthError(error.message || `Error ${(error as { status?: number }).status ?? 'unknown'}`))
      }
    }
    setLoading(false)
  }

  function switchMode() {
    setIsSignUp(v => !v)
    setError(null)
    setInfo(null)
    setConfirm('')
    setUsername('')
    setAvatarLetters('')
    setAvatarEdited(false)
  }

  return (
    <div className="w-full h-full flex flex-col justify-center px-6 py-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-gray-900 mb-1">WebComment</h1>
        <p className="text-[13px] text-gray-500">Anchored comments on the web</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Preview tile — replaces the username field on signup */}
        {isSignUp && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-9 bg-gray-50 border border-gray-200">
            <div className={`group w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-150 cursor-text
              ${avatarLetters
                ? 'bg-blue-100 hover:bg-blue-200 has-[:focus]:ring-2 has-[:focus]:ring-blue-400 has-[:focus]:ring-offset-1'
                : 'border-2 border-dashed border-gray-300 hover:border-gray-400 has-[:focus]:border-blue-400 has-[:focus]:border-solid'
              }`}>
              <input
                type="text"
                value={avatarLetters}
                onChange={e => handleAvatarLettersChange(e.target.value)}
                maxLength={2}
                placeholder="AB"
                className={`w-7 text-center font-bold text-[12px] bg-transparent focus:outline-none cursor-text ${avatarLetters ? 'text-blue-600' : 'text-transparent placeholder:text-gray-300 placeholder:font-normal'}`}
                title="Edit initials"
              />
            </div>
            <input
              type="text"
              name="username"
              autoComplete="username"
              placeholder="Username"
              value={username}
              onChange={e => handleUsernameChange(e.target.value)}
              className="flex-1 text-[13px] font-medium bg-transparent focus:outline-none text-gray-700 placeholder:font-normal placeholder:text-gray-400 min-w-0"
              required
            />
          </div>
        )}

        {/* Identity block */}
        <div className="rounded-9 border border-gray-200 divide-y divide-gray-200">
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={`w-full px-3 py-2 text-[13px] bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/40 ${isSignUp ? 'rounded-6' : 'rounded-t-6'}`}
            required
          />
        </div>

        {/* Password block */}
        <div className="rounded-9 border border-gray-200 divide-y divide-gray-200">
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              name="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={`w-full px-3 py-2 pr-16 text-[13px] bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/40 ${isSignUp ? 'rounded-t-6' : 'rounded-6'}`}
              required
            />
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-[11px] select-none"
            >
              {showPwd ? 'Hide' : 'Show'}
            </button>
          </div>
          {isSignUp && (
            <input
              type={showPwd ? 'text' : 'password'}
              name="confirm-password"
              autoComplete="new-password"
              placeholder="Confirm password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-full px-3 py-2 text-[13px] bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/40 rounded-b-6"
              required
            />
          )}
        </div>

        {isSignUp && (
          <p className="text-[11px] text-gray-400">Password: minimum 6 characters</p>
        )}

        {error && <p className="text-red-500 text-[12px]">{error}</p>}
        {info  && <p className="text-blue-500 text-[12px]">{info}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? '...' : isSignUp ? 'Create account' : 'Sign in'}
        </Button>
      </form>

      <button
        onClick={switchMode}
        className="mt-4 w-full text-center text-[12px] text-gray-400 hover:text-blue-600 transition-colors duration-150"
      >
        {isSignUp ? 'Already have an account? Sign in' : "No account yet? Sign up"}
      </button>
    </div>
  )
}
