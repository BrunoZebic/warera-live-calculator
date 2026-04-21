export interface CountryWealthRow {
  countryId: string
  countryName: string
  population: number
  totalNetWorth: number
  totalNetWorthWithoutCompanies: number
  totalCompanyValue: number
  missingCompanyValueCount: number
}

export interface CountryWealthSnapshot {
  generatedAt: string
  rowCount: number
  warningCount: number
  warnings: string[]
  rows: CountryWealthRow[]
}

export interface CountryWealthSourceCountry {
  _id: string
  name: string
  rankings: {
    countryActivePopulation: {
      value: number
    }
    countryWealth: {
      value: number
    }
  }
}

export interface CountryWealthRankingItem {
  country: string
  user: string
  value: number
}

export interface CountryWealthCompany {
  _id: string
  estimatedValue?: number | null
  user: string
}

export interface CreateCountryWealthSnapshotInput {
  countries: CountryWealthSourceCountry[]
  companies: CountryWealthCompany[]
  generatedAt?: string
  userCountryById?: Map<string, string> | Record<string, string>
  userWealthRankings: CountryWealthRankingItem[]
}

export type CountryWealthSortKey =
  | 'countryName'
  | 'population'
  | 'totalNetWorth'
  | 'totalNetWorthWithoutCompanies'

export type CountryWealthSortDirection = 'asc' | 'desc'

export interface CountryWealthSort {
  direction: CountryWealthSortDirection
  key: CountryWealthSortKey
}
