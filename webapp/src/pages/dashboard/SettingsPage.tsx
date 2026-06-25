import { useEffect, useRef, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { Check, TriangleAlert } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { PageHeader } from '../../components/PageHeader'
import type { DashboardContext } from '../../lib/types'

export function SettingsPage() {
  const { userId, profile, refreshProfile } = useOutletContext<DashboardContext>()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [baseline, setBaseline] = useState('')
  const [initials, setInitials] = useState('')
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const [emailEditOpen,  setEmailEditOpen]  = useState(false)
  const [newEmail,       setNewEmail]       = useState('')
  const [emailSending,   setEmailSending]   = useState(false)
  const [emailSent,      setEmailSent]      = useState(false)
  const [emailError,     setEmailError]     = useState<string | null>(null)
  const newEmailInputRef = useRef<HTMLInputElement>(null)

  const [deleteOpen,    setDeleteOpen]    = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting,      setDeleting]      = useState(false)
  const [deleteError,   setDeleteError]   = useState<string | null>(null)
  const deleteInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!profile) return
    setUsername(profile.username ?? '')
    setBaseline(profile.baseline ?? '')
    setInitials(profile.initials ?? '')
  }, [profile])

  const savedUsername = profile?.username ?? '…'

  const isDirty = username !== (profile?.username ?? '')
    || baseline !== (profile?.baseline ?? '')
    || initials !== (profile?.initials ?? '')

  function handleDiscard() {
    if (!profile) return
    setUsername(profile.username ?? '')
    setBaseline(profile.baseline ?? '')
    setInitials(profile.initials ?? '')
    setError(null)
  }

  function validateUsername(u: string): string | null {
    if (u.length < 3 || u.length > 30) return 'Username must be 3–30 characters.'
    if (!/^[a-zA-Z0-9_-]+$/.test(u)) return 'Only letters, digits, _ or - allowed.'
    return null
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const usernameErr = validateUsername(username)
    if (usernameErr) { setError(usernameErr); return }

    setSaving(true)

    const { error: err } = await supabase
      .from('profiles')
      .update({
        username: username.trim(),
        baseline: baseline.trim() || null,
        initials: initials.trim() || null,
      })
      .eq('id', userId)

    setSaving(false)
    if (err) {
      if (err.code === '23505') {
        setError('This username is already taken.')
      } else {
        setError('Failed to save. Please try again.')
      }
    } else {
      await refreshProfile()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  function openEmailEdit() {
    setNewEmail('')
    setEmailError(null)
    setEmailSent(false)
    setEmailEditOpen(true)
    setTimeout(() => newEmailInputRef.current?.focus(), 50)
  }

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmail || newEmail === profile?.email) return
    setEmailSending(true)
    setEmailError(null)

    const { error: err } = await supabase.auth.updateUser({ email: newEmail })

    setEmailSending(false)
    if (err) {
      setEmailError(err.message.includes('already registered')
        ? 'This email is already in use.'
        : 'Failed to send confirmation. Please try again.')
    } else {
      setEmailSent(true)
    }
  }

  function openDeleteModal() {
    if (!profile) return
    setDeleteConfirm('')
    setDeleteError(null)
    setDeleteOpen(true)
    setTimeout(() => deleteInputRef.current?.focus(), 50)
  }

  async function handleDeleteAccount() {
    if (!profile || deleteConfirm !== savedUsername) return
    setDeleting(true)
    setDeleteError(null)

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
      setDeleteError('Session expired. Please sign in again.')
      setDeleting(false)
      return
    }

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
      {
        method: 'POST',
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!res.ok) {
      setDeleteError('Failed to delete your account. Please try again.')
      setDeleting(false)
      return
    }

    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Settings" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-6 py-8 space-y-8">

          {/* Profile card */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Profile</h2>

            <form onSubmit={handleSave} className="space-y-5">

              {/* Avatar tile — editable initials inline + username read-only */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50">
                <div className="relative group/avatar flex-shrink-0 cursor-text">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 ${
                    initials
                      ? 'bg-blue-600/15 group-hover/avatar:bg-blue-600/20 has-[:focus]:ring-2 has-[:focus]:ring-blue-500/30 has-[:focus]:ring-offset-1 has-[:focus]:ring-offset-gray-50'
                      : 'border-2 border-dashed border-gray-300 group-hover/avatar:border-gray-400 has-[:focus]:border-blue-500 has-[:focus]:border-solid'
                  }`}>
                    <input
                      type="text"
                      value={initials}
                      onChange={e => setInitials(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2))}
                      maxLength={2}
                      placeholder="AB"
                      className={`w-8 text-center font-bold text-[13px] bg-transparent focus:outline-none cursor-text ${
                        initials ? 'text-blue-600' : 'text-transparent placeholder:text-gray-300 placeholder:font-normal'
                      }`}
                    />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white border border-gray-200 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 group-focus-within/avatar:opacity-0 transition-opacity duration-150 pointer-events-none">
                    <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{username || savedUsername}</p>
                  {baseline && <p className="text-xs text-gray-400 truncate">{baseline}</p>}
                </div>
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">Username</label>
                <Input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value.replace(/ /g, '_').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30))}
                  placeholder="your_username"
                  maxLength={30}
                />
              </div>

              {/* Baseline */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">Baseline</label>
                <Input
                  type="text"
                  value={baseline}
                  onChange={e => setBaseline(e.target.value.slice(0, 80))}
                  placeholder="Designer · Paris · Open to feedback"
                  maxLength={80}
                />
                <p className="text-xs text-gray-400 text-right">{baseline.length}/80</p>
              </div>

              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}

              <div className="flex items-center justify-end gap-3">
                {saved && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 mr-auto">
                    <Check className="w-3.5 h-3.5" /> Saved
                  </span>
                )}
                {isDirty && !saving && (
                  <Button type="button" variant="outline" size="md" onClick={handleDiscard}>
                    Discard
                  </Button>
                )}
                <Button type="submit" variant="primary" size="md" disabled={saving || !isDirty}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </form>
          </section>

          {/* Account section — read-only info */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Account</h2>
            <div className="rounded-xl border border-gray-200 divide-y divide-gray-200">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-gray-500">Username</span>
                <span className="text-xs font-medium text-gray-900">@{savedUsername}</span>
              </div>
              <div className="px-4 py-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Email</span>
                  {!emailEditOpen && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-900">{profile?.email}</span>
                      <button
                        type="button"
                        onClick={openEmailEdit}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                  {emailEditOpen && !emailSent && (
                    <span className="text-xs text-gray-400">{profile?.email}</span>
                  )}
                </div>

                {emailEditOpen && !emailSent && (
                  <form onSubmit={handleEmailChange} className="space-y-2">
                    <Input
                      ref={newEmailInputRef}
                      type="email"
                      value={newEmail}
                      onChange={e => { setNewEmail(e.target.value); setEmailError(null) }}
                      placeholder="new@email.com"
                      required
                    />
                    {emailError && <p className="text-xs text-red-500">{emailError}</p>}
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEmailEditOpen(false)}
                        disabled={emailSending}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={emailSending || !newEmail || newEmail === profile?.email}
                      >
                        {emailSending ? 'Sending…' : 'Send confirmation'}
                      </Button>
                    </div>
                  </form>
                )}

                {emailSent && (
                  <div className="flex items-start gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>Confirmation sent to <strong>{newEmail}</strong>. Click the link to apply the change.</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-gray-500">Member since</span>
                <span className="text-xs font-medium text-gray-900">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
                    : '—'}
                </span>
              </div>
            </div>
          </section>

          {/* Danger zone */}
          <section>
            <h2 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-4">Danger zone</h2>
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Delete my account</p>
                <p className="text-xs text-gray-500 mt-0.5">Permanently removes your account. Comments you sent are kept and attributed to "Deleted user".</p>
              </div>
              <Button variant="danger" size="sm" onClick={openDeleteModal} className="flex-shrink-0">
                Delete account
              </Button>
            </div>
          </section>

        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 p-6 space-y-5">

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                <TriangleAlert className="w-4.5 h-4.5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Delete your account?</h3>
                <p className="text-xs text-gray-500 mt-1">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <ul className="text-xs text-gray-600 space-y-1.5 pl-1">
              <li className="flex gap-2"><span className="text-gray-400 mt-0.5">•</span><span>Your profile, contacts, and share links will be <strong>deleted</strong>.</span></li>
              <li className="flex gap-2"><span className="text-gray-400 mt-0.5">•</span><span>Comments you sent will be <strong>kept</strong> and shown as "Deleted user" to recipients.</span></li>
            </ul>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">
                Type <span className="font-mono font-bold text-gray-900">{savedUsername}</span> to confirm
              </label>
              <Input
                ref={deleteInputRef}
                type="text"
                value={deleteConfirm}
                onChange={e => { setDeleteConfirm(e.target.value); setDeleteError(null) }}
                placeholder={savedUsername}
                autoComplete="off"
              />
              {deleteError && <p className="text-xs text-red-500">{deleteError}</p>}
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== savedUsername || deleting}
              >
                {deleting ? 'Deleting…' : 'Delete my account'}
              </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
