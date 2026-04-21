import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import './CountryWealthPage.css'
import {
  CountryWealthApiError,
  getCountryWealthSnapshot,
  refreshCountryWealthSnapshot,
  unlockCountryWealthAdmin,
} from '../api/countryWealth'
import {
  DEFAULT_COUNTRY_WEALTH_SORT,
  sortCountryWealthRows,
  toggleCountryWealthSort,
} from '../countryWealth/sort'
import type {
  CountryWealthRow,
  CountryWealthSort,
  CountryWealthSortKey,
} from '../countryWealth/types'

const SNAPSHOT_QUERY_KEY = ['country-wealth-snapshot']

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
})

const populationFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatWealth(value: number) {
  return numberFormatter.format(value)
}

function formatPopulation(value: number) {
  return populationFormatter.format(value)
}

function getSortLabel(sort: CountryWealthSort, key: CountryWealthSortKey) {
  if (sort.key !== key) {
    return 'none'
  }

  return sort.direction === 'asc' ? 'ascending' : 'descending'
}

function SortableHeader({
  children,
  columnKey,
  onSortChange,
  sort,
}: {
  children: string
  columnKey: CountryWealthSortKey
  onSortChange: (key: CountryWealthSortKey) => void
  sort: CountryWealthSort
}) {
  const isActive = sort.key === columnKey

  return (
    <th aria-sort={getSortLabel(sort, columnKey)} scope="col">
      <button
        className={`table-sort-button ${isActive ? 'table-sort-button-active' : ''}`}
        onClick={() => onSortChange(columnKey)}
        type="button"
      >
        <span>{children}</span>
        <span aria-hidden="true" className="table-sort-indicator">
          {isActive ? (sort.direction === 'asc' ? '^' : 'v') : '+/-'}
        </span>
      </button>
    </th>
  )
}

function CountryCell({ row }: { row: CountryWealthRow }) {
  return (
    <td className="country-cell">
      <strong>{row.countryName}</strong>
      {row.missingCompanyValueCount > 0 ? (
        <small>
          Partial company data: {row.missingCompanyValueCount} missing value
          {row.missingCompanyValueCount === 1 ? '' : 's'}
        </small>
      ) : null}
    </td>
  )
}

export function CountryWealthPage() {
  const queryClient = useQueryClient()
  const [password, setPassword] = useState('')
  const [sort, setSort] = useState<CountryWealthSort>(
    DEFAULT_COUNTRY_WEALTH_SORT,
  )
  const [unlockError, setUnlockError] = useState<string | null>(null)
  const [unlocked, setUnlocked] = useState(false)

  const snapshotQuery = useQuery({
    queryKey: SNAPSHOT_QUERY_KEY,
    queryFn: getCountryWealthSnapshot,
    retry: false,
  })

  const unlockMutation = useMutation({
    mutationFn: unlockCountryWealthAdmin,
    onError: (error) => {
      if (error instanceof CountryWealthApiError) {
        setUnlockError(error.message)
        return
      }

      setUnlockError('Unlocking admin refresh failed.')
    },
    onSuccess: () => {
      setUnlockError(null)
      setUnlocked(true)
      setPassword('')
    },
  })

  const refreshMutation = useMutation({
    mutationFn: refreshCountryWealthSnapshot,
    onError: (error) => {
      if (
        error instanceof CountryWealthApiError &&
        error.status === 401
      ) {
        setUnlocked(false)
        setUnlockError('Admin session expired. Re-enter the password.')
      }
    },
    onSuccess: (snapshot) => {
      queryClient.setQueryData(SNAPSHOT_QUERY_KEY, snapshot)
      setUnlockError(null)
    },
  })

  const sortedRows = useMemo(
    () =>
      snapshotQuery.data
        ? sortCountryWealthRows(snapshotQuery.data.rows, sort)
        : [],
    [snapshotQuery.data, sort],
  )

  const activeErrorMessage =
    unlockError ??
    (snapshotQuery.error instanceof Error ? snapshotQuery.error.message : null) ??
    (refreshMutation.error instanceof Error ? refreshMutation.error.message : null)

  return (
    <div className="app-shell">
      <section className="panel top-strip country-wealth-top-strip">
        <div className="country-wealth-header-copy">
          <strong>Country wealth snapshot</strong>
          <p>
            Shared country totals with a manual admin refresh for the latest
            snapshot.
          </p>
        </div>

        <Link className="ghost-button" to="/">
          Back to calculator
        </Link>
      </section>

      {activeErrorMessage ? (
        <section className="panel error-panel">{activeErrorMessage}</section>
      ) : null}

      <section className="panel country-wealth-auth-panel">
        {!unlocked ? (
          <form
            className="country-wealth-auth-form"
            onSubmit={(event) => {
              event.preventDefault()

              const trimmedPassword = password.trim()

              if (!trimmedPassword) {
                setUnlockError('Enter the admin password to unlock refresh.')
                return
              }

              unlockMutation.mutate(trimmedPassword)
            }}
          >
            <div>
              <h2>Admin refresh</h2>
              <p>
                The table is public, but manual refresh stays locked behind the
                admin password.
              </p>
            </div>

            <label className="field-label">
              <span>Admin password</span>
              <input
                autoComplete="current-password"
                className="text-input"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter admin password"
                type="password"
                value={password}
              />
            </label>

            <button
              className="ghost-button"
              disabled={unlockMutation.isPending}
              type="submit"
            >
              {unlockMutation.isPending ? 'Unlocking...' : 'Unlock refresh'}
            </button>
          </form>
        ) : (
          <div className="country-wealth-auth-ready">
            <div>
              <h2>Admin refresh unlocked</h2>
              <p>
                Trigger a fresh shared snapshot. This can take a while because it
                recomputes country totals from live WarEra data.
              </p>
            </div>

            <button
              className="ghost-button"
              disabled={refreshMutation.isPending}
              onClick={() => refreshMutation.mutate()}
              type="button"
            >
              {refreshMutation.isPending ? 'Refreshing data...' : 'Refresh data'}
            </button>
          </div>
        )}
      </section>

      {refreshMutation.isPending ? (
        <section className="panel empty-panel">
          Refreshing the shared country wealth snapshot. This may take a minute.
        </section>
      ) : null}

      {snapshotQuery.isLoading ? (
        <section className="panel empty-panel">
          Loading the latest country wealth snapshot...
        </section>
      ) : null}

      {!snapshotQuery.isLoading && !snapshotQuery.data ? (
        <section className="panel empty-panel">
          No country wealth snapshot has been generated yet. Unlock admin refresh
          to create the first shared table.
        </section>
      ) : null}

      {snapshotQuery.data ? (
        <>
          <section className="panel country-wealth-summary-panel">
            <div className="country-wealth-summary-grid">
              <div className="metric-card">
                <span>Last updated</span>
                <strong>
                  {dateFormatter.format(new Date(snapshotQuery.data.generatedAt))}
                </strong>
              </div>
              <div className="metric-card">
                <span>Countries</span>
                <strong>{snapshotQuery.data.rowCount}</strong>
              </div>
              <div className="metric-card">
                <span>Warnings</span>
                <strong>{snapshotQuery.data.warningCount}</strong>
              </div>
            </div>

            {snapshotQuery.data.warningCount > 0 ? (
              <details className="country-wealth-warnings">
                <summary>Show warning details</summary>
                <ul className="country-wealth-warning-list">
                  {snapshotQuery.data.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </section>

          <section className="panel country-wealth-table-panel">
            <div className="country-wealth-table-wrap">
              <table className="country-wealth-table">
                <thead>
                  <tr>
                    <SortableHeader
                      columnKey="countryName"
                      onSortChange={(key) =>
                        setSort((current) => toggleCountryWealthSort(current, key))
                      }
                      sort={sort}
                    >
                      Country
                    </SortableHeader>
                    <SortableHeader
                      columnKey="population"
                      onSortChange={(key) =>
                        setSort((current) => toggleCountryWealthSort(current, key))
                      }
                      sort={sort}
                    >
                      Population
                    </SortableHeader>
                    <SortableHeader
                      columnKey="totalNetWorth"
                      onSortChange={(key) =>
                        setSort((current) => toggleCountryWealthSort(current, key))
                      }
                      sort={sort}
                    >
                      Total net worth
                    </SortableHeader>
                    <SortableHeader
                      columnKey="totalNetWorthWithoutCompanies"
                      onSortChange={(key) =>
                        setSort((current) => toggleCountryWealthSort(current, key))
                      }
                      sort={sort}
                    >
                      Net worth without companies
                    </SortableHeader>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row) => (
                    <tr
                      className={
                        row.missingCompanyValueCount > 0
                          ? 'country-wealth-row-partial'
                          : ''
                      }
                      key={row.countryId}
                    >
                      <CountryCell row={row} />
                      <td>{formatPopulation(row.population)}</td>
                      <td>{formatWealth(row.totalNetWorth)}</td>
                      <td>{formatWealth(row.totalNetWorthWithoutCompanies)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
