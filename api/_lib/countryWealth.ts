import { get, put } from '@vercel/blob'
import { createAPIClient } from '@wareraprojects/api'

import { createCountryWealthSnapshot } from '../../src/countryWealth/aggregation.ts'
import type {
  CountryWealthCompany,
  CountryWealthSnapshot,
} from '../../src/countryWealth/types.ts'

const COUNTRY_WEALTH_SNAPSHOT_PATH = 'country-wealth/latest.json'
const BLOB_ACCESS = 'public'
const COMPANY_PAGE_SIZE = 100
const COMPANY_DETAIL_BATCH_SIZE = 100
const USER_LOOKUP_BATCH_SIZE = 50
const WARERA_API_BASE =
  process.env.WARERA_API_BASE ??
  process.env.VITE_API_BASE ??
  'https://api2.warera.io/trpc'

interface RankingResponseItem {
  country: string
  user: string
  value: number
}

interface RankingResponse {
  items: RankingResponseItem[]
}

interface CompanyListResponse {
  items: string[]
  nextCursor?: string
}

interface CompanyByIdResponse {
  _id: string
  estimatedValue?: number
  user: string
}

interface UserLiteResponse {
  _id: string
  country: string
}

function createWarEraApiClient() {
  return createAPIClient({
    url: WARERA_API_BASE,
  })
}

async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  mapper: (item: T) => Promise<R>,
) {
  const results: R[] = []

  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize)
    const batchResults = await Promise.all(batch.map(mapper))

    results.push(...batchResults)
  }

  return results
}

function ensureBlobToken() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN is required to read and write country wealth snapshots.',
    )
  }
}

async function getAllCompanyIds(client: ReturnType<typeof createWarEraApiClient>) {
  const companyIds: string[] = []
  let cursor: string | undefined

  do {
    const page = (await client.company.getCompanies({
      cursor,
      perPage: COMPANY_PAGE_SIZE,
    })) as CompanyListResponse

    companyIds.push(...page.items)
    cursor = page.nextCursor
  } while (cursor)

  return companyIds
}

async function loadCompanies(
  client: ReturnType<typeof createWarEraApiClient>,
  warnings: string[],
) {
  const companyIds = await getAllCompanyIds(client)

  const companies = await mapInBatches(
    companyIds,
    COMPANY_DETAIL_BATCH_SIZE,
    async (companyId) => {
      try {
        return (await client.company.getById({
          companyId,
        })) as CompanyByIdResponse
      } catch {
        warnings.push(
          `Failed to load company ${companyId}; it was excluded from company totals.`,
        )
        return null
      }
    },
  )

  return companies.filter(
    (company): company is CompanyByIdResponse => company !== null,
  )
}

async function resolveFallbackUserCountries(
  client: ReturnType<typeof createWarEraApiClient>,
  companies: CountryWealthCompany[],
  rankingItems: RankingResponseItem[],
  warnings: string[],
) {
  const rankedUserIds = new Set(rankingItems.map((item) => item.user))
  const unresolvedOwnerIds = [...new Set(
    companies
      .map((company) => company.user)
      .filter((userId) => !rankedUserIds.has(userId)),
  )]

  const resolvedUsers = await mapInBatches(
    unresolvedOwnerIds,
    USER_LOOKUP_BATCH_SIZE,
    async (userId) => {
      try {
        const user = (await client.user.getUserLite({
          userId,
        })) as UserLiteResponse

        return [userId, user.country] as const
      } catch {
        warnings.push(
          `Failed to resolve a fallback country for user ${userId}; their company value was skipped if no wealth ranking entry existed.`,
        )
        return null
      }
    },
  )

  return new Map(
    resolvedUsers.filter(
      (entry): entry is readonly [string, string] => entry !== null,
    ),
  )
}

export async function readCountryWealthSnapshot() {
  ensureBlobToken()

  try {
    const result = await get(COUNTRY_WEALTH_SNAPSHOT_PATH, {
      access: BLOB_ACCESS,
    })

    if (!result || result.statusCode !== 200) {
      return null
    }

    return (await new Response(result.stream).json()) as CountryWealthSnapshot
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'BlobNotFoundError'
    ) {
      return null
    }

    throw error
  }
}

export async function writeCountryWealthSnapshot(snapshot: CountryWealthSnapshot) {
  ensureBlobToken()

  await put(COUNTRY_WEALTH_SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), {
    access: BLOB_ACCESS,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    contentType: 'application/json; charset=utf-8',
  })
}

export async function refreshCountryWealthSnapshot() {
  const client = createWarEraApiClient()
  const warnings: string[] = []
  const [countries, rankingResponse, companies] = await Promise.all([
    client.country.getAllCountries(),
    client.ranking.getRanking({
      rankingType: 'userWealth',
    }) as unknown as Promise<RankingResponse>,
    loadCompanies(client, warnings),
  ])

  const userCountryById = await resolveFallbackUserCountries(
    client,
    companies,
    rankingResponse.items,
    warnings,
  )

  const snapshot = createCountryWealthSnapshot({
    companies,
    countries,
    generatedAt: new Date().toISOString(),
    userCountryById,
    userWealthRankings: rankingResponse.items,
  })

  const nextSnapshot =
    warnings.length > 0
      ? {
          ...snapshot,
          warningCount: snapshot.warningCount + warnings.length,
          warnings: [...warnings, ...snapshot.warnings],
        }
      : snapshot

  await writeCountryWealthSnapshot(nextSnapshot)

  return nextSnapshot
}
