import { resolveBody } from '../../shared/utils'
import type { Mention } from '../../shared/types'

export function BodyText({ body, mentions = [], className = '' }: {
  body:       string
  mentions?:  Mention[]
  className?: string
}) {
  const resolved = resolveBody(body, mentions)
  const parts    = resolved.split(/(#[A-Za-z0-9_]+|@[A-Za-z0-9_]+)/g)
  return (
    <p className={`text-[13px] text-gray-700 leading-relaxed ${className}`}>
      {parts.map((part, i) =>
        /^#[A-Za-z0-9_]+$/.test(part)
          ? <span key={i} className="text-blue-600 font-medium">{part}</span>
          : /^@[A-Za-z0-9_]+$/.test(part)
            ? <span key={i} className="text-violet-600 font-medium">{part}</span>
            : part
      )}
    </p>
  )
}
