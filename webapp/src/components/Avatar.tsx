import { avatarColor, avatarInitials } from '../lib/utils'

type AvatarSize = 'sm' | 'md' | 'lg'

const SIZES: Record<AvatarSize, string> = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-xs',
  lg: 'w-12 h-12 text-lg',
}

export function Avatar({ username, initials, avatarUrl, size = 'sm' }: {
  username:   string
  initials?:  string | null
  avatarUrl?: string | null
  size?:      AvatarSize
}) {
  const cls = SIZES[size]
  if (avatarUrl) {
    return <img src={avatarUrl} alt={username} className={`${cls} rounded-full object-cover flex-shrink-0`} />
  }
  return (
    <div
      className={`${cls} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}
      style={{ backgroundColor: avatarColor(username) }}
    >
      {avatarInitials(username, initials)}
    </div>
  )
}
