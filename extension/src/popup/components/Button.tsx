import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'danger-filled'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const variantClasses: Record<Variant, string> = {
  'primary':       'bg-blue-600 text-white font-medium hover:bg-blue-700 active:bg-blue-800',
  'secondary':     'border border-gray-200 text-gray-600 hover:bg-gray-50',
  'danger':        'border border-red-200 text-red-500 hover:bg-red-50',
  'danger-filled': 'bg-red-500 text-white font-medium hover:bg-red-600',
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`w-full py-2 rounded-lg text-[13px] disabled:opacity-50 transition-colors duration-150 ${variantClasses[variant]} ${className}`}
    />
  )
}
