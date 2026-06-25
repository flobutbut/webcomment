export function hostname(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export function commentLinkUrl(commentId: string): string {
  return `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/get-comment-page?id=${commentId}`
}

export function resolveBody(body: string, mentions: { id: string; username: string }[] = []): string {
  const map = new Map(mentions.map(m => [m.id, m.username]))
  return body.replace(/@\[([0-9a-f-]{36})\]/g, (_, id) => `@${map.get(id) ?? '[unknown]'}`)
}

export const AVATAR_COLORS = [
  '#2563EB', '#7C3AED', '#DB2777', '#DC2626',
  '#D97706', '#059669', '#0891B2', '#4F46E5',
]

export function avatarColor(username: string): string {
  let hash = 0
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function avatarInitials(username: string, initials?: string | null): string {
  if (initials) return initials
  const parts = username.trim().split(/[\s._-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return username.slice(0, 2).toUpperCase()
}
