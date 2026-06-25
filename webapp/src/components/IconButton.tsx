import type { ButtonHTMLAttributes } from 'react'

type Variant = 'default' | 'danger'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const variantClasses: Record<Variant, string> = {
  'default': 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200',
  'danger':  'text-gray-400 hover:text-red-500',
}

export function IconButton({ variant = 'default', className = '', ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={`p-1 rounded-3 flex items-center justify-center transition-colors duration-150 disabled:opacity-50 ${variantClasses[variant]} ${className}`}
    />
  )
}
