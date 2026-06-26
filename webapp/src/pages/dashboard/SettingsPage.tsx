import { useEffect, useRef, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { Check, TriangleAlert, Sun, Moon, Monitor } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { PageHeader } from '../../components/PageHeader'
import type { DashboardContext, Theme } from '../../lib/types'

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'light',  label: 'Light',  icon: <Sun     className="w-3.5 h-3.5" /> },
  { value: 'dark',   label: 'Dark',   icon: <Moon    className="w-3.5 h-3.5" /> },
  { value: 'system', label: 'System', icon: <Monitor className="w-3.5 h-3.5" /> },
]

function NotifToggle({
  label, description, checked, disabled, onChange,
}: {
  label: string
  description: string
  checked: boolean
  disabled: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className={`flex items-center justify-between px-4 py-3 gap-4 cursor-pointer ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
          checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-dark-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  )
}

export function SettingsPage() {
  const { userId, profile, refreshProfile, theme, setTheme } = useOutletContext<DashboardContext>()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [baseline, setBaseline] = useState('')
  const [initials, setInitials] = useState('')
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const [notifyOnComment, setNotifyOnComment] = useState(true)
  const [notifyOnContact, setNotifyOnContact] = useState(true)
  const [savingNotif,     setSavingNotif]     = useState(false)

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
    setNotifyOnComment(profile.notify_on_comment ?? true)
    setNotifyOnContact(profile.notify_on_contact ?? true)
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

  async function handleNotifToggle(field: 'notify_on_comment' | 'notify_on_contact', value: boolean) {
    if (field === 'notify_on_comment') setNotifyOnComment(value)
    else setNotifyOnContact(value)
    setSavingNotif(true)
    await supabase.from('profiles').update({ [field]: value }).eq('id', userId)
    await refreshProfile()
    setSavingNotif(false)
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

          {/* Appearance */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">Appearance</h2>
            <div className="inline-flex bg-gray-100 dark:bg-dark-700 rounded-9 p-0.5 gap-0.5">
              {THEME_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-6 text-xs font-medium transition-all duration-150 ${
                    theme === opt.value
                      ? 'bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Profile card */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">Profile</h2>

            <form onSubmit={handleSave} className="space-y-5">

              {/* Avatar tile — editable initials inline + username read-only */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-12 border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-700">
                <div className="relative group/avatar flex-shrink-0 cursor-text">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 ${
                    initials
                      ? 'bg-blue-600/15 group-hover/avatar:bg-blue-600/20 has-[:focus]:ring-2 has-[:focus]:ring-blue-500/30 has-[:focus]:ring-offset-1 has-[:focus]:ring-offset-gray-50'
                      : 'border-2 border-dashed border-gray-300 dark:border-dark-border-lg group-hover/avatar:border-gray-400 has-[:focus]:border-blue-500 has-[:focus]:border-solid'
                  }`}>
                    <input
                      type="text"
                      value={initials}
                      onChange={e => setInitials(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2))}
                      maxLength={2}
                      placeholder="AB"
                      className={`w-8 text-center font-bold text-[13px] bg-transparent focus:outline-none cursor-text ${
                        initials ? 'text-blue-600' : 'text-transparent placeholder:text-gray-300 dark:placeholder:text-gray-600 placeholder:font-normal'
                      }`}
                    />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-border flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 group-focus-within/avatar:opacity-0 transition-opacity duration-150 pointer-events-none">
                    <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 dark:text-gray-400">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{username || savedUsername}</p>
                  {baseline && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{baseline}</p>}
                </div>
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Username</label>
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
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Baseline</label>
                <Input
                  type="text"
                  value={baseline}
                  onChange={e => setBaseline(e.target.value.slice(0, 80))}
                  placeholder="Designer · Paris · Open to feedback"
                  maxLength={80}
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 text-right">{baseline.length}/80</p>
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

          {/* Notifications */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">Notifications</h2>
            <div className="rounded-9 border border-gray-200 dark:border-dark-border divide-y divide-gray-200 dark:divide-dark-border">
              <NotifToggle
                label="New comment received"
                description="Get an email when someone sends you a comment."
                checked={notifyOnComment}
                disabled={savingNotif}
                onChange={v => handleNotifToggle('notify_on_comment', v)}
              />
              <NotifToggle
                label="Contact request"
                description="Get an email when someone sends you a contact request."
                checked={notifyOnContact}
                disabled={savingNotif}
                onChange={v => handleNotifToggle('notify_on_contact', v)}
              />
            </div>
          </section>

          {/* Account section — read-only info */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">Account</h2>
            <div className="rounded-9 border border-gray-200 dark:border-dark-border divide-y divide-gray-200 dark:divide-dark-border">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">Username</span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">@{savedUsername}</span>
              </div>
              <div className="px-4 py-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Email</span>
                  {!emailEditOpen && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{profile?.email}</span>
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
                    <span className="text-xs text-gray-400 dark:text-gray-500">{profile?.email}</span>
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
                  <div className="flex items-start gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-9 px-3 py-2">
                    <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>Confirmation sent to <strong>{newEmail}</strong>. Click the link to apply the change.</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">Member since</span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
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
            <div className="rounded-12 border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10 px-4 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Delete my account</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Permanently removes your account. Comments you sent are kept and attributed to "Deleted user".</p>
              </div>
              <Button variant="danger" size="md" onClick={openDeleteModal} className="flex-shrink-0 w-auto px-4">
                Delete account
              </Button>
            </div>
          </section>

        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-800 rounded-18 shadow-2xl border border-gray-200 dark:border-dark-border w-full max-w-md mx-4 p-6 space-y-5">

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <TriangleAlert className="w-4.5 h-4.5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Delete your account?</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1.5 pl-1">
              <li className="flex gap-2"><span className="text-gray-400 dark:text-gray-500 mt-0.5">•</span><span>Your profile, contacts, and share links will be <strong>deleted</strong>.</span></li>
              <li className="flex gap-2"><span className="text-gray-400 dark:text-gray-500 mt-0.5">•</span><span>Comments you sent will be <strong>kept</strong> and shown as "Deleted user" to recipients.</span></li>
            </ul>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Type <span className="font-mono font-bold text-gray-900 dark:text-gray-100">{savedUsername}</span> to confirm
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
