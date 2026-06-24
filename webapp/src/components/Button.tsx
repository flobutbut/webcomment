import { type ReactNode, type ButtonHTMLAttributes } from 'react'

type Variant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'success-outline'
  | 'danger'
  | 'danger-outline'
  | 'ghost-danger'
  | 'ghost'

type Size = 'xs' | 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  'primary':         'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white',
  'secondary':       'bg-white hover:bg-zinc-100 active:bg-zinc-200 text-black',
  'outline':         'border border-gray-200 text-gray-600 hover:bg-gray-50',
  'success-outline': 'border border-green-200 text-green-700 hover:bg-green-50',
  'danger':          'bg-red-600 hover:bg-red-700 text-white',
  'danger-outline':  'border border-red-100 text-red-400 hover:bg-red-50',
  'ghost-danger':    'border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50',
  'ghost':           'text-zinc-500 hover:text-white',
}

const SIZES: Record<Size, string> = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'px-6 py-2.5 text-sm font-semibold',
}

const BASE = 'inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

export function Button({ variant = 'outline', size = 'sm', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
