import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'danger-filled' | 'success'
type Size    = 'md' | 'sm'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?:    Size
}

const variantClasses: Record<Variant, string> = {
  'primary':       'bg-blue-600 text-white font-medium hover:bg-blue-700 active:bg-blue-800',
  'secondary':     'border border-gray-200 text-gray-600 hover:bg-gray-50',
  'danger':        'border border-red-200 text-red-500 hover:bg-red-50',
  'danger-filled': 'bg-red-500 text-white font-medium hover:bg-red-600',
  'success':       'border border-green-600 text-green-600 hover:bg-green-50',
}

const sizeClasses: Record<Size, string> = {
  'md': 'w-full py-2 text-[13px]',
  'sm': 'px-2.5 py-1 text-[11px]',
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`rounded-6 disabled:opacity-50 transition-colors duration-150 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    />
  )
}
