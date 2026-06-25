import { type InputHTMLAttributes, forwardRef } from 'react'

const BASE = [
  'w-full px-3 py-2 text-sm rounded-6',
  'border border-gray-200 bg-white text-gray-900',
  'dark:border-dark-border dark:bg-dark-700 dark:text-gray-100',
  'placeholder:text-gray-400 dark:placeholder:text-gray-500',
  'focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30',
  'transition-colors',
].join(' ')

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => (
    <input ref={ref} className={`${BASE} ${className}`} {...props} />
  )
)

Input.displayName = 'Input'
