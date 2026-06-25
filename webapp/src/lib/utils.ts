import type { FilterType } from './types'

export function matchesSearch(
  q: string,
  active: Set<FilterType>,
  fields: { url?: string; user?: string; tags?: string[] | null }
): boolean {
  if (active.has('url')  && fields.url  && fields.url.toLowerCase().includes(q))                    return true
  if (active.has('user') && fields.user && fields.user.toLowerCase().includes(q))                   return true
  if (active.has('tag')  && (fields.tags ?? []).some(t => t.toLowerCase().includes(q)))             return true
  return false
}

export function resolveBody(body: string, mentions: { id: string; username: string }[] = []): string {
  const map = new Map(mentions.map(m => [m.id, m.username]))
  return body.replace(/@\[([0-9a-f-]{36})\]/g, (_, id) => `@${map.get(id) ?? '[unknown]'}`)
}

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

const AVATAR_COLORS = [
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
