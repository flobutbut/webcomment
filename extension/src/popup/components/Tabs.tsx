interface TabItem<T extends string> {
  value: T
  label: string
}

interface TabsProps<T extends string> {
  tabs:     TabItem<T>[]
  active:   T
  onChange: (value: T) => void
}

export function Tabs<T extends string>({ tabs, active, onChange }: TabsProps<T>) {
  return (
    <div className="flex border-b border-gray-100 flex-shrink-0">
      {tabs.map(tab => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`flex-1 py-2.5 text-[13px] font-medium transition-colors duration-150 border-b-2 ${
            active === tab.value
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
