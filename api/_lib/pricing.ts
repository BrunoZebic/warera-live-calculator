import { get, put } from '@vercel/blob'
import {
  createAPIClient,
  type GameConfigGetGameConfigResponse,
  type ItemTradingGetPricesResponse,
  type TransactionGetPaginatedTransactionsResponse,
} from '@wareraprojects/api'

import {
  quoteEquipmentFullPrice,
  type EquipmentPriceQuote,
  type EquipmentQuoteComparableSale,
} from '../../src/pricing/equipmentQuotes.ts'
import type {
  ConsumablePriceTable,
  PricingQuoteRequest,
  PricingQuoteResponse,
} from '../../src/pricing/types.ts'
import type { EquipmentStatRange } from '../../src/types.ts'

const BLOB_ACCESS = 'public'
const CONSUMABLE_PRICES_CACHE_TTL_MS = 5 * 60 * 1000
const EQUIPMENT_SALES_CACHE_TTL_MS = 15 * 60 * 1000
const GAME_CONFIG_CACHE_TTL_MS = 30 * 60 * 1000
const CONSUMABLE_PRICES_CACHE_PATH = 'pricing-cache/consumables.json'
const EQUIPMENT_SALES_CACHE_PREFIX = 'pricing-cache/equipment-sales'
const WARERA_API_BASE =
  process.env.WARERA_API_BASE ??
  process.env.VITE_API_BASE ??
  'https://api2.warera.io/trpc'

interface CacheEntry<TValue> {
  expiresAt: number
  value: TValue
}

const memoryCache = new Map<string, CacheEntry<unknown>>()

let gameConfigCache:
  | {
      expiresAt: number
      value: GameConfigGetGameConfigResponse
    }
  | null = null

function createWarEraApiClient(apiKey?: string) {
  return createAPIClient({
    url: WARERA_API_BASE,
    apiKey,
  })
}

function hasBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

function getEquipmentSalesCachePath(itemCode: string) {
  return `${EQUIPMENT_SALES_CACHE_PREFIX}/${itemCode}.json`
}

async function readBlobCache<TValue>(path: string): Promise<CacheEntry<TValue> | null> {
  if (!hasBlobStorage()) {
    return null
  }

  try {
    const result = await get(path, {
      access: BLOB_ACCESS,
    })

    if (!result || result.statusCode !== 200) {
      return null
    }

    return (await new Response(result.stream).json()) as CacheEntry<TValue>
  } catch (error) {
    if (error instanceof Error && error.name === 'BlobNotFoundError') {
      return null
    }

    console.warn('Reading pricing cache from blob failed.', error)
    return null
  }
}

async function writeBlobCache<TValue>(
  path: string,
  entry: CacheEntry<TValue>,
) {
  if (!hasBlobStorage()) {
    return
  }

  try {
    await put(path, JSON.stringify(entry), {
      access: BLOB_ACCESS,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
      contentType: 'application/json; charset=utf-8',
    })
  } catch (error) {
    console.warn('Writing pricing cache to blob failed.', error)
  }
}

async function readCachedValue<TValue>(
  key: string,
  path: string,
): Promise<TValue | null> {
  const now = Date.now()
  const memoryEntry = memoryCache.get(key) as CacheEntry<TValue> | undefined

  if (memoryEntry && memoryEntry.expiresAt > now) {
    return memoryEntry.value
  }

  const blobEntry = await readBlobCache<TValue>(path)
  if (blobEntry && blobEntry.expiresAt > now) {
    memoryCache.set(key, blobEntry)
    return blobEntry.value
  }

  return null
}

async function writeCachedValue<TValue>(
  key: string,
  path: string,
  value: TValue,
  ttlMs: number,
) {
  const entry: CacheEntry<TValue> = {
    expiresAt: Date.now() + ttlMs,
    value,
  }

  memoryCache.set(key, entry)
  await writeBlobCache(path, entry)
}

function mapConsumablePrices(
  prices: ItemTradingGetPricesResponse,
): ConsumablePriceTable {
  return {
    lightAmmo: prices.lightAmmo,
    ammo: prices.ammo,
    heavyAmmo: prices.heavyAmmo,
    bread: prices.bread,
    steak: prices.steak,
    cookedFish: prices.cookedFish,
    cocain: prices.cocain,
  }
}

async function getConsumablePrices(): Promise<ConsumablePriceTable> {
  const cacheKey = 'consumable-prices'
  const cachedPrices = await readCachedValue<ConsumablePriceTable>(
    cacheKey,
    CONSUMABLE_PRICES_CACHE_PATH,
  )

  if (cachedPrices) {
    return cachedPrices
  }

  const client = createWarEraApiClient()
  const prices = mapConsumablePrices(
    (await client.itemTrading.getPrices({})) as ItemTradingGetPricesResponse,
  )

  await writeCachedValue(
    cacheKey,
    CONSUMABLE_PRICES_CACHE_PATH,
    prices,
    CONSUMABLE_PRICES_CACHE_TTL_MS,
  )

  return prices
}

async function getGameConfig() {
  const now = Date.now()

  if (gameConfigCache && gameConfigCache.expiresAt > now) {
    return gameConfigCache.value
  }

  const client = createWarEraApiClient()
  const value = (await client.gameConfig.getGameConfig()) as GameConfigGetGameConfigResponse

  gameConfigCache = {
    expiresAt: now + GAME_CONFIG_CACHE_TTL_MS,
    value,
  }

  return value
}

function getItemStatRanges(
  gameConfig: GameConfigGetGameConfigResponse,
  itemCode: string,
): EquipmentStatRange[] {
  const item = gameConfig.items[itemCode as keyof typeof gameConfig.items] as {
    dynamicStats?: Partial<Record<string, number[]>>
  } | undefined

  if (!item?.dynamicStats) {
    return []
  }

  return Object.entries(item.dynamicStats).flatMap(([key, value]) => {
    if (!Array.isArray(value) || value.length < 2) {
      return []
    }

    return [
      {
        key: key as EquipmentStatRange['key'],
        min: value[0],
        max: value[1],
      },
    ]
  })
}

function mapComparableSales(
  response: TransactionGetPaginatedTransactionsResponse,
  itemCode: string,
): EquipmentQuoteComparableSale[] {
  return response.items.flatMap((item) => {
    if (!item.item || item.item.code !== itemCode) {
      return []
    }

    return [
      {
        code: item.item.code,
        createdAt: item.createdAt,
        maxState: item.item.maxState,
        money: item.money ?? 0,
        skills: item.item.skills ?? {},
        state: item.item.state,
      },
    ]
  })
}

async function getEquipmentComparableSales(
  itemCode: string,
  apiKey: string | undefined,
) {
  if (!apiKey) {
    return null
  }

  const cacheKey = `equipment-sales:${itemCode}`
  const cachePath = getEquipmentSalesCachePath(itemCode)
  const cachedSales = await readCachedValue<EquipmentQuoteComparableSale[]>(
    cacheKey,
    cachePath,
  )

  if (cachedSales) {
    return cachedSales
  }

  const client = createWarEraApiClient(apiKey)
  const sales = mapComparableSales(
    (await client.transaction.getPaginatedTransactions({
      itemCode,
      limit: 30,
      transactionType: 'itemMarket',
    })) as TransactionGetPaginatedTransactionsResponse,
    itemCode,
  )

  await writeCachedValue(
    cacheKey,
    cachePath,
    sales,
    EQUIPMENT_SALES_CACHE_TTL_MS,
  )

  return sales
}

function createUnavailableEquipmentQuote(): EquipmentPriceQuote {
  return {
    lookbackDays: 0,
    sampleSize: 0,
    unavailable: true,
    usedFallbackPricing: true,
  }
}

export async function getPricingQuote(
  request: PricingQuoteRequest,
): Promise<PricingQuoteResponse> {
  const [consumablePrices, gameConfig] = await Promise.all([
    getConsumablePrices(),
    getGameConfig(),
  ])
  const itemCodes = [...new Set(request.equipmentItems.map((item) => item.code))]
  const apiKey = process.env.WARERA_API_KEY
  const quotesByCode = new Map<string, EquipmentPriceQuote | null>()
  const salesByCode = new Map<string, EquipmentQuoteComparableSale[] | null>()

  await Promise.all(
    itemCodes.map(async (itemCode) => {
      try {
        const sales = await getEquipmentComparableSales(itemCode, apiKey)
        salesByCode.set(itemCode, sales)
      } catch (error) {
        console.warn(`Loading equipment sales for ${itemCode} failed.`, error)
        salesByCode.set(itemCode, null)
      }
    }),
  )

  const equipmentQuotes = request.equipmentItems.reduce<
    PricingQuoteResponse['equipmentQuotes']
  >((accumulator, item) => {
    const sales = salesByCode.get(item.code)

    if (!sales) {
      accumulator[item.itemId] = {
        ...createUnavailableEquipmentQuote(),
        code: item.code,
        itemId: item.itemId,
      }
      return accumulator
    }

    let quote = quotesByCode.get(`${item.code}:${item.itemId}`)

    if (!quote) {
      quote = quoteEquipmentFullPrice(
        item,
        sales,
        getItemStatRanges(gameConfig, item.code),
      )
      quotesByCode.set(`${item.code}:${item.itemId}`, quote)
    }

    accumulator[item.itemId] = {
      ...quote,
      code: item.code,
      itemId: item.itemId,
    }
    return accumulator
  }, {})

  return {
    generatedAt: new Date().toISOString(),
    consumablePrices,
    equipmentQuotes,
  }
}
