import { describe, expect, it } from 'vitest'

import { createCountryWealthSnapshot } from './aggregation'
import type {
  CountryWealthCompany,
  CountryWealthRankingItem,
  CountryWealthSourceCountry,
} from './types'

const countries: CountryWealthSourceCountry[] = [
  {
    _id: 'country-a',
    name: 'Alpha',
    rankings: {
      countryActivePopulation: { value: 15 },
      countryWealth: { value: 150 },
    },
  },
  {
    _id: 'country-b',
    name: 'Beta',
    rankings: {
      countryActivePopulation: { value: 9 },
      countryWealth: { value: 80 },
    },
  },
  {
    _id: 'country-c',
    name: 'Gamma',
    rankings: {
      countryActivePopulation: { value: 0 },
      countryWealth: { value: 0 },
    },
  },
]

describe('createCountryWealthSnapshot', () => {
  it('aggregates total and liquid wealth, including zero-user countries', () => {
    const rankings: CountryWealthRankingItem[] = [
      { country: 'country-a', user: 'user-1', value: 100 },
      { country: 'country-a', user: 'user-2', value: 50 },
      { country: 'country-b', user: 'user-3', value: 80 },
    ]
    const companies: CountryWealthCompany[] = [
      { _id: 'company-1', estimatedValue: 20, user: 'user-1' },
      { _id: 'company-2', estimatedValue: 10, user: 'user-3' },
    ]

    const snapshot = createCountryWealthSnapshot({
      companies,
      countries,
      generatedAt: '2026-04-19T19:00:00.000Z',
      userWealthRankings: rankings,
    })

    expect(snapshot.rowCount).toBe(3)
    expect(snapshot.generatedAt).toBe('2026-04-19T19:00:00.000Z')
    expect(snapshot.rows).toEqual([
      {
        countryId: 'country-a',
        countryName: 'Alpha',
        missingCompanyValueCount: 0,
        population: 15,
        totalCompanyValue: 20,
        totalNetWorth: 150,
        totalNetWorthWithoutCompanies: 130,
      },
      {
        countryId: 'country-b',
        countryName: 'Beta',
        missingCompanyValueCount: 0,
        population: 9,
        totalCompanyValue: 10,
        totalNetWorth: 80,
        totalNetWorthWithoutCompanies: 70,
      },
      {
        countryId: 'country-c',
        countryName: 'Gamma',
        missingCompanyValueCount: 0,
        population: 0,
        totalCompanyValue: 0,
        totalNetWorth: 0,
        totalNetWorthWithoutCompanies: 0,
      },
    ])
    expect(snapshot.warningCount).toBe(0)
  })

  it('resolves owner countries outside the wealth ranking and sums multiple companies', () => {
    const rankings: CountryWealthRankingItem[] = [
      { country: 'country-a', user: 'user-1', value: 100 },
      { country: 'country-b', user: 'user-3', value: 80 },
    ]
    const companies: CountryWealthCompany[] = [
      { _id: 'company-1', estimatedValue: 20, user: 'user-1' },
      { _id: 'company-2', estimatedValue: 5, user: 'user-1' },
      { _id: 'company-3', estimatedValue: 7, user: 'user-4' },
    ]

    const snapshot = createCountryWealthSnapshot({
      companies,
      countries: countries.map((country) =>
        country._id === 'country-a'
          ? country
          : country._id === 'country-b'
            ? {
                ...country,
                rankings: {
                  ...country.rankings,
                  countryWealth: { value: 80 },
                },
              }
            : country,
      ).map((country) =>
        country._id === 'country-a'
          ? {
              ...country,
              rankings: {
                ...country.rankings,
                countryWealth: { value: 100 },
              },
            }
          : country,
      ),
      userCountryById: {
        'user-4': 'country-b',
      },
      userWealthRankings: rankings,
    })

    const alphaRow = snapshot.rows.find((row) => row.countryId === 'country-a')
    const betaRow = snapshot.rows.find((row) => row.countryId === 'country-b')

    expect(alphaRow?.totalCompanyValue).toBe(25)
    expect(alphaRow?.totalNetWorthWithoutCompanies).toBe(75)
    expect(betaRow?.totalCompanyValue).toBe(7)
    expect(betaRow?.totalNetWorthWithoutCompanies).toBe(73)
    expect(snapshot.warningCount).toBe(0)
  })

  it('treats missing company values as zero and clamps negative liquid wealth', () => {
    const rankings: CountryWealthRankingItem[] = [
      { country: 'country-a', user: 'user-1', value: 15 },
    ]
    const companies: CountryWealthCompany[] = [
      { _id: 'company-1', estimatedValue: undefined, user: 'user-1' },
      { _id: 'company-2', estimatedValue: 25, user: 'user-1' },
    ]

    const snapshot = createCountryWealthSnapshot({
      companies,
      countries: [
        {
          _id: 'country-a',
          name: 'Alpha',
          rankings: {
            countryActivePopulation: { value: 2 },
            countryWealth: { value: 12 },
          },
        },
      ],
      userWealthRankings: rankings,
    })

    expect(snapshot.rows).toEqual([
      {
        countryId: 'country-a',
        countryName: 'Alpha',
        missingCompanyValueCount: 1,
        population: 2,
        totalCompanyValue: 25,
        totalNetWorth: 15,
        totalNetWorthWithoutCompanies: 0,
      },
    ])
    expect(snapshot.warningCount).toBe(3)
    expect(snapshot.warnings).toContain(
      'Alpha has 1 company value entries missing an estimated value; those were treated as 0.',
    )
    expect(snapshot.warnings).toContain(
      'Alpha had company value above total wealth, so liquid wealth was clamped to 0.',
    )
    expect(snapshot.warnings).toContain(
      'Alpha computed wealth (15.00) does not match country ranking wealth (12.00).',
    )
  })
})
