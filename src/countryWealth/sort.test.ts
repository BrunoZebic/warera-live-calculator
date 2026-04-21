import { describe, expect, it } from 'vitest'

import {
  DEFAULT_COUNTRY_WEALTH_SORT,
  sortCountryWealthRows,
  toggleCountryWealthSort,
} from './sort'
import type { CountryWealthRow } from './types'

const rows: CountryWealthRow[] = [
  {
    countryId: '1',
    countryName: 'Beta',
    missingCompanyValueCount: 0,
    population: 12,
    totalCompanyValue: 10,
    totalNetWorth: 120,
    totalNetWorthWithoutCompanies: 110,
  },
  {
    countryId: '2',
    countryName: 'Alpha',
    missingCompanyValueCount: 0,
    population: 4,
    totalCompanyValue: 5,
    totalNetWorth: 200,
    totalNetWorthWithoutCompanies: 190,
  },
  {
    countryId: '3',
    countryName: 'Gamma',
    missingCompanyValueCount: 0,
    population: 20,
    totalCompanyValue: 50,
    totalNetWorth: 80,
    totalNetWorthWithoutCompanies: 30,
  },
]

describe('sortCountryWealthRows', () => {
  it('uses total net worth descending as the default sort', () => {
    expect(
      sortCountryWealthRows(rows, DEFAULT_COUNTRY_WEALTH_SORT).map(
        (row) => row.countryName,
      ),
    ).toEqual(['Alpha', 'Beta', 'Gamma'])
  })

  it('sorts by country name', () => {
    expect(
      sortCountryWealthRows(rows, {
        direction: 'asc',
        key: 'countryName',
      }).map((row) => row.countryName),
    ).toEqual(['Alpha', 'Beta', 'Gamma'])
  })

  it('sorts by population and liquid wealth', () => {
    expect(
      sortCountryWealthRows(rows, {
        direction: 'desc',
        key: 'population',
      }).map((row) => row.countryName),
    ).toEqual(['Gamma', 'Beta', 'Alpha'])

    expect(
      sortCountryWealthRows(rows, {
        direction: 'asc',
        key: 'totalNetWorthWithoutCompanies',
      }).map((row) => row.countryName),
    ).toEqual(['Gamma', 'Beta', 'Alpha'])
  })
})

describe('toggleCountryWealthSort', () => {
  it('toggles the direction when the same header is clicked', () => {
    expect(
      toggleCountryWealthSort(
        { direction: 'desc', key: 'totalNetWorth' },
        'totalNetWorth',
      ),
    ).toEqual({
      direction: 'asc',
      key: 'totalNetWorth',
    })
  })

  it('uses column-aware defaults when switching headers', () => {
    expect(
      toggleCountryWealthSort(DEFAULT_COUNTRY_WEALTH_SORT, 'countryName'),
    ).toEqual({
      direction: 'asc',
      key: 'countryName',
    })

    expect(
      toggleCountryWealthSort(DEFAULT_COUNTRY_WEALTH_SORT, 'population'),
    ).toEqual({
      direction: 'desc',
      key: 'population',
    })
  })
})
