import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'

function SearchBar({ disabled, items, onSelect }) {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    if (!normalized) {
      return items.slice(0, 6)
    }

    return items
      .filter((item) => item.name.toLowerCase().includes(normalized))
      .slice(0, 8)
  }, [items, query])

  const showDropdown = isFocused && results.length > 0

  return (
    <div className="search-shell panel-card">
      <div className="search-input-row">
        <Search size={18} />
        <input
          disabled={disabled}
          onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Search districts, tehsils, villages..."
          type="search"
          value={query}
        />
        {query ? (
          <button aria-label="Clear search" onClick={() => setQuery('')} type="button">
            <X size={16} />
          </button>
        ) : null}
      </div>
      {!query && !showDropdown ? (
        <p className="search-helper-text">Try Gurugram, Karnal, Ambala, or Rampura.</p>
      ) : null}

      {showDropdown ? (
        <div className="search-results">
          {results.map((item) => (
            <button
              key={item.id}
              className="search-result-item"
              onClick={() => {
                onSelect(item)
                setQuery(item.name)
                setIsFocused(false)
              }}
              type="button"
            >
              <span>{item.name}</span>
              <small>{item.subtitle}</small>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default SearchBar
