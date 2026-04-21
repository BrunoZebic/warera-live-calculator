import type {
  CountryWealthRow,
  CountryWealthSort,
  CountryWealthSortDirection,
  CountryWealthSortKey,
} from './types'

export const DEFAULT_COUNTRY_WEALTH_SORT: CountryWealthSort = {
  direction: 'desc',
  key: 'totalNetWorth',
}

function compareValues(
  left: string | number,
  right: string | number,
  direction: CountryWealthSortDirection,
) {
  const modifier = direction === 'asc' ? 1 : -1

  if (typeof left === 'string' && typeof right === 'string') {
    return left.localeCompare(right, undefined, { sensitivity: 'base' }) * modifier
  }

  return ((left as number) - (right as number)) * modifier
}

function getSortValue(row: CountryWealthRow, key: CountryWealthSortKey) {
  switch (key) {
    case 'countryName':
      return row.countryName
    case 'population':
      return row.population
    case 'totalNetWorth':
      return row.totalNetWorth
    case 'totalNetWorthWithoutCompanies':
      return row.totalNetWorthWithoutCompanies
    default:
      return row.totalNetWorth
  }
}

export function sortCountryWealthRows(
  rows: CountryWealthRow[],
  sort: CountryWealthSort,
) {
  return [...rows].sort((left, right) => {
    const primary = compareValues(
      getSortValue(left, sort.key),
      getSortValue(right, sort.key),
      sort.direction,
    )

    if (primary !== 0) {
      return primary
    }

    return left.countryName.localeCompare(right.countryName, undefined, {
      sensitivity: 'base',
    })
  })
}

export function toggleCountryWealthSort(
  currentSort: CountryWealthSort,
  nextKey: CountryWealthSortKey,
): CountryWealthSort {
  if (currentSort.key === nextKey) {
    return {
      direction: currentSort.direction === 'asc' ? 'desc' : 'asc',
      key: nextKey,
    }
  }

  return {
    direction: nextKey === 'countryName' ? 'asc' : 'desc',
    key: nextKey,
  }
}
