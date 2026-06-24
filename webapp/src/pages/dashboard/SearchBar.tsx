import { Search, X } from 'lucide-react'
import type { FilterType } from '../../lib/types'

const FILTERS: { type: FilterType; label: string }[] = [
  { type: 'url',  label: 'url'   },
  { type: 'user', label: '@user' },
  { type: 'tag',  label: '#tag'  },
]

export function SearchBar({ query, setQuery, filterTypes, toggleFilter }: {
  query:        string
  setQuery:     (q: string) => void
  filterTypes:  Set<FilterType>
  toggleFilter: (f: FilterType) => void
}) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 h-9 w-full max-w-lg
                    focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400/30 transition-colors">
      <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />

      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search…"
        className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none min-w-0"
      />

      {query && (
        <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="w-px h-4 bg-gray-200 flex-shrink-0" />

      <div className="flex items-center gap-1 flex-shrink-0">
        {FILTERS.map(f => (
          <button
            key={f.type}
            onClick={() => toggleFilter(f.type)}
            className={`px-2 py-0.5 rounded text-xs font-mono transition-colors duration-100 ${
              filterTypes.has(f.type)
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  )
}
