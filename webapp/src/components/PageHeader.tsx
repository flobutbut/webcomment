export function PageHeader({ title, right }: {
  title: string
  right?: React.ReactNode
}) {
  return (
    <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
      <h1 className="text-sm font-semibold text-gray-900">{title}</h1>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  )
}
