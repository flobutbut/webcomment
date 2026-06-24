export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
  return (
    <div className={`${dim} border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0`} />
  )
}
