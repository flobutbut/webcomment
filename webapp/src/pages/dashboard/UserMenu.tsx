import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { Avatar } from '../../components/Avatar'
import type { Profile } from '../../lib/types'

function resolveUsername(profile: Profile | null, session: Session): string {
  return (
    profile?.username ??
    (session.user.user_metadata?.username as string | undefined) ??
    session.user.email ??
    ''
  )
}

export function UserMenu({ profile, session }: { profile: Profile | null; session: Session }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const username = resolveUsername(profile, session)

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Avatar username={username} initials={profile?.initials} avatarUrl={profile?.avatar_url} size="sm" />
        <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">{username}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[160px]">
            <div className="px-3 py-2 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-900 truncate">{username}</p>
              <p className="text-[11px] text-gray-400 truncate">{session.user.email}</p>
            </div>
            <NavLink
              to="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </NavLink>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
