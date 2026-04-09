import { useDeferredValue, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { searchUsers } from '../api/user'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import type { SearchResult } from '../types'

interface SearchBoxProps {
  disabled?: boolean
  label: string
  onSelect: (result: SearchResult) => void | Promise<void>
  placeholder?: string
}

export function SearchBox({
  disabled = false,
  label,
  onSelect,
  placeholder = 'Search username...',
}: SearchBoxProps) {
  const [value, setValue] = useState('')
  const deferredValue = useDeferredValue(value.trim())
  const debouncedSearch = useDebouncedValue(deferredValue, 250)

  const searchQuery = useQuery({
    queryKey: ['search-users', debouncedSearch],
    queryFn: () => searchUsers(debouncedSearch),
    enabled: debouncedSearch.length >= 2,
    staleTime: 30_000,
  })

  const showResults = debouncedSearch.length >= 2 && !disabled

  return (
    <div className="search-box">
      <label className="field-label">
        <span>{label}</span>
        <input
          autoComplete="off"
          className="text-input"
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          type="search"
          value={value}
        />
      </label>

      {showResults ? (
        <div className="search-results">
          {searchQuery.isLoading ? (
            <div className="search-result-empty">Searching WarEra...</div>
          ) : null}

          {!searchQuery.isLoading &&
          searchQuery.data &&
          searchQuery.data.length > 0 ? (
            searchQuery.data.map((result) => (
              <button
                className="search-result-item"
                key={result.id}
                onClick={async () => {
                  await onSelect(result)
                  setValue('')
                }}
                type="button"
              >
                <span className="avatar-chip" aria-hidden="true">
                  {result.avatarUrl ? (
                    <img alt="" src={result.avatarUrl} />
                  ) : (
                    result.username.slice(0, 1).toUpperCase()
                  )}
                </span>
                <span>
                  <strong>{result.username}</strong>
                  <small>{result.id}</small>
                </span>
              </button>
            ))
          ) : null}

          {!searchQuery.isLoading &&
          searchQuery.data &&
          searchQuery.data.length === 0 ? (
            <div className="search-result-empty">No users found.</div>
          ) : null}

          {searchQuery.isError ? (
            <div className="search-result-empty">
              Search failed. Manual mode still works.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
