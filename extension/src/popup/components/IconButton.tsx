import type { ButtonHTMLAttributes } from 'react'
import { Tooltip } from './Tooltip'

type Variant = 'default' | 'danger'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  tooltip?: string
}

const variantClasses: Record<Variant, string> = {
  'default': 'text-gray-400 hover:text-gray-600',
  'danger':  'text-gray-400 hover:text-red-500',
}

export function IconButton({ variant = 'default', className = '', tooltip, ...props }: IconButtonProps) {
  const btn = (
    <button
      {...props}
      className={`p-1 rounded-3 flex items-center justify-center transition-colors duration-150 disabled:opacity-50 ${variantClasses[variant]} ${className}`}
    />
  )
  if (!tooltip) return btn
  return <Tooltip text={tooltip}>{btn}</Tooltip>
}
