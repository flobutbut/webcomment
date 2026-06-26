import type { ReactNode } from 'react'

export function Tooltip({ children, text }: { children: ReactNode; text: string }) {
  return (
    <div className="relative group/tip inline-flex">
      {children}
      <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-1.5 py-0.5 rounded-3 bg-gray-900 text-white text-[10px] whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity duration-100 z-50">
        {text}
      </span>
    </div>
  )
}
