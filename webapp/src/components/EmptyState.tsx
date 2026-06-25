export function EmptyState({ message, variant = 'center' }: {
  message: string
  variant?: 'center' | 'list'
}) {
  if (variant === 'list') {
    return <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-20">{message}</p>
  }
  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-sm text-gray-300 dark:text-gray-600">{message}</p>
    </div>
  )
}
