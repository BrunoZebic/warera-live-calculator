import type {
  CountryWealthCompany,
  CountryWealthRankingItem,
  CountryWealthRow,
  CountryWealthSnapshot,
  CountryWealthSourceCountry,
  CreateCountryWealthSnapshotInput,
} from './types'

const COUNTRY_WEALTH_WARNING_TOLERANCE = 0.01

function addToMap(map: Map<string, number>, key: string, value: number) {
  map.set(key, (map.get(key) ?? 0) + value)
}

function normalizeUserCountryMap(
  value: CreateCountryWealthSnapshotInput['userCountryById'],
): Map<string, string> {
  if (!value) {
    return new Map()
  }

  if (value instanceof Map) {
    return value
  }

  return new Map(Object.entries(value))
}

function buildWealthMaps(rankings: CountryWealthRankingItem[]) {
  const totalNetWorthByCountry = new Map<string, number>()
  const countryByUserId = new Map<string, string>()

  for (const entry of rankings) {
    addToMap(totalNetWorthByCountry, entry.country, entry.value)
    countryByUserId.set(entry.user, entry.country)
  }

  return {
    countryByUserId,
    totalNetWorthByCountry,
  }
}

function buildCompanyMaps(
  companies: CountryWealthCompany[],
  countryByUserId: Map<string, string>,
  userCountryById: Map<string, string>,
) {
  const totalCompanyValueByCountry = new Map<string, number>()
  const missingCompanyValueCountByCountry = new Map<string, number>()
  const warnings: string[] = []

  for (const company of companies) {
    const countryId =
      countryByUserId.get(company.user) ?? userCountryById.get(company.user)

    if (!countryId) {
      warnings.push(
        `Skipped company ${company._id} because its owner's country could not be resolved.`,
      )
      continue
    }

    const hasEstimatedValue =
      typeof company.estimatedValue === 'number' &&
      Number.isFinite(company.estimatedValue)
    const estimatedValue = hasEstimatedValue ? (company.estimatedValue as number) : 0

    addToMap(totalCompanyValueByCountry, countryId, estimatedValue)

    if (!hasEstimatedValue) {
      addToMap(missingCompanyValueCountByCountry, countryId, 1)
    }
  }

  return {
    missingCompanyValueCountByCountry,
    totalCompanyValueByCountry,
    warnings,
  }
}

function buildRows(
  countries: CountryWealthSourceCountry[],
  totalNetWorthByCountry: Map<string, number>,
  totalCompanyValueByCountry: Map<string, number>,
) {
  const clampedCountryIds = new Set<string>()

  const rows = countries.map((country) => {
    const totalNetWorth = totalNetWorthByCountry.get(country._id) ?? 0
    const totalCompanyValue = totalCompanyValueByCountry.get(country._id) ?? 0
    const rawLiquidNetWorth = totalNetWorth - totalCompanyValue
    const totalNetWorthWithoutCompanies = Math.max(0, rawLiquidNetWorth)

    if (rawLiquidNetWorth < 0) {
      clampedCountryIds.add(country._id)
    }

    return {
      countryId: country._id,
      countryName: country.name,
      missingCompanyValueCount: 0,
      population: country.rankings.countryActivePopulation.value,
      totalCompanyValue,
      totalNetWorth,
      totalNetWorthWithoutCompanies,
    } satisfies CountryWealthRow
  })

  return {
    clampedCountryIds,
    rows,
  }
}

export function createCountryWealthSnapshot({
  countries,
  companies,
  generatedAt = new Date().toISOString(),
  userCountryById,
  userWealthRankings,
}: CreateCountryWealthSnapshotInput): CountryWealthSnapshot {
  const warnings: string[] = []
  const normalizedUserCountryById = normalizeUserCountryMap(userCountryById)
  const { countryByUserId, totalNetWorthByCountry } =
    buildWealthMaps(userWealthRankings)
  const {
    missingCompanyValueCountByCountry,
    totalCompanyValueByCountry,
    warnings: companyWarnings,
  } = buildCompanyMaps(companies, countryByUserId, normalizedUserCountryById)
  const { clampedCountryIds, rows } = buildRows(
    countries,
    totalNetWorthByCountry,
    totalCompanyValueByCountry,
  )

  warnings.push(...companyWarnings)

  for (const row of rows) {
    row.missingCompanyValueCount =
      missingCompanyValueCountByCountry.get(row.countryId) ?? 0

    if (row.missingCompanyValueCount > 0) {
      warnings.push(
        `${row.countryName} has ${row.missingCompanyValueCount} company value entries missing an estimated value; those were treated as 0.`,
      )
    }

    if (clampedCountryIds.has(row.countryId)) {
      warnings.push(
        `${row.countryName} had company value above total wealth, so liquid wealth was clamped to 0.`,
      )
    }
  }

  for (const country of countries) {
    const computedTotalNetWorth = totalNetWorthByCountry.get(country._id) ?? 0
    const rankedCountryWealth = country.rankings.countryWealth.value

    if (
      Math.abs(computedTotalNetWorth - rankedCountryWealth) >
      COUNTRY_WEALTH_WARNING_TOLERANCE
    ) {
      warnings.push(
        `${country.name} computed wealth (${computedTotalNetWorth.toFixed(2)}) does not match country ranking wealth (${rankedCountryWealth.toFixed(2)}).`,
      )
    }
  }

  return {
    generatedAt,
    rowCount: rows.length,
    rows,
    warningCount: warnings.length,
    warnings,
  }
}
