import { useState } from 'react'
import { Button } from '../components/Button'
import { supabase } from '../../shared/supabase'

export function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  function translateAuthError(message: string): string {
    if (message.includes('Invalid login credentials')) return 'Incorrect email or password.'
    if (message.includes('Email not confirmed'))       return 'Please confirm your email before signing in.'
    if (message.includes('rate limit'))                return 'Too many attempts, please try again later.'
    return message
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(translateAuthError(error.message))
    setLoading(false)
  }

  return (
    <div className="w-full h-full flex flex-col justify-center px-6 py-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-gray-900 mb-1">VoidMark</h1>
        <p className="text-[13px] text-gray-500">Anchored comments on the web</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-9 border border-gray-200 divide-y divide-gray-200">
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2 text-[13px] bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/40 rounded-t-6"
            required
            autoFocus
          />
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 pr-16 text-[13px] bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/40 rounded-b-6"
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
        </div>

        {error && <p className="text-red-500 text-[12px]">{error}</p>}

        <Button type="submit" disabled={loading}>
          {loading ? '...' : 'Sign in'}
        </Button>
      </form>

      <div className="mt-6 pt-5 border-t border-gray-100 text-center">
        <p className="text-[12px] text-gray-400 mb-2">No account yet?</p>
        <a
          href="https://voidmark.app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          Request early access at voidmark.app →
        </a>
      </div>
    </div>
  )
}
