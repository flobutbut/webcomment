import { useEffect, useRef, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { Check, TriangleAlert } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { PageHeader } from '../../components/PageHeader'
import type { DashboardContext } from '../../lib/types'

export function SettingsPage() {
  const { userId, profile } = useOutletContext<DashboardContext>()
  const navigate = useNavigate()

  const [baseline, setBaseline] = useState('')
  const [initials, setInitials] = useState('')
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const [deleteOpen,    setDeleteOpen]    = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting,      setDeleting]      = useState(false)
  const [deleteError,   setDeleteError]   = useState<string | null>(null)
  const deleteInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!profile) return
    setBaseline(profile.baseline ?? '')
    setInitials(profile.initials ?? '')
  }, [profile])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { error: err } = await supabase
      .from('profiles')
      .update({ baseline: baseline.trim() || null, initials: initials.trim() || null })
      .eq('id', userId)

    setSaving(false)
    if (err) {
      setError('Failed to save. Please try again.')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  const username = profile?.username ?? '…'

  function openDeleteModal() {
    setDeleteConfirm('')
    setDeleteError(null)
    setDeleteOpen(true)
    setTimeout(() => deleteInputRef.current?.focus(), 50)
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== username) return
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

              {/* Avatar + username read-only */}
              <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 bg-gray-50">
                <Avatar
                  username={username}
                  initials={initials || profile?.initials}
                  avatarUrl={profile?.avatar_url}
                  size="lg"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{username}</p>
                  <p className="text-xs text-gray-400">{profile?.email}</p>
                </div>
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
                <p className="text-xs text-gray-400 flex justify-between">
                  <span>Shown on your contact card instead of your email.</span>
                  <span>{baseline.length}/80</span>
                </p>
              </div>

              {/* Initials */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">Avatar initials</label>
                <Input
                  type="text"
                  value={initials}
                  onChange={e => setInitials(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2))}
                  placeholder="AB"
                  maxLength={2}
                  className="max-w-[80px] text-center font-semibold tracking-wider"
                />
                <p className="text-xs text-gray-400">2 characters, shown in your avatar when no photo is set.</p>
              </div>

              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}

              <div className="flex items-center gap-3">
                <Button type="submit" variant="primary" size="md" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
                {saved && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600">
                    <Check className="w-3.5 h-3.5" /> Saved
                  </span>
                )}
              </div>
            </form>
          </section>

          {/* Account section — read-only info */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Account</h2>
            <div className="rounded-xl border border-gray-200 divide-y divide-gray-200">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-gray-500">Username</span>
                <span className="text-xs font-medium text-gray-900">@{username}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-gray-500">Email</span>
                <span className="text-xs font-medium text-gray-900">{profile?.email}</span>
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
                Type <span className="font-mono font-bold text-gray-900">{username}</span> to confirm
              </label>
              <Input
                ref={deleteInputRef}
                type="text"
                value={deleteConfirm}
                onChange={e => { setDeleteConfirm(e.target.value); setDeleteError(null) }}
                placeholder={username}
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
                disabled={deleteConfirm !== username || deleting}
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
