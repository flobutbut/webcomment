import { useState } from 'react'
import { avatarColor, avatarInitials } from '../../shared/utils'

interface AvatarProps {
  username:  string
  initials?: string | null
  avatarUrl?: string | null
  className?: string
}

export function Avatar({ username, initials, avatarUrl, className = 'w-9 h-9 text-[13px]' }: AvatarProps) {
  const [imgError, setImgError] = useState(false)
  const letters = avatarInitials(username, initials)

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        className={`${className} rounded-full object-cover flex-shrink-0`}
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div
      className={`${className} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
      style={{ background: avatarColor(username) }}
    >
      {letters}
    </div>
  )
}
