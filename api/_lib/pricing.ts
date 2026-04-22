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
const EQUIPMENT_PRICE_SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000
const GAME_CONFIG_CACHE_TTL_MS = 30 * 60 * 1000
const EQUIPMENT_PRICE_REFRESH_BATCH_SIZE = 6
const CONSUMABLE_PRICES_CACHE_PATH = 'pricing-cache/consumables.json'
const EQUIPMENT_PRICE_SNAPSHOT_CACHE_PATH = 'pricing-cache/equipment-snapshot.json'
const EQUIPMENT_USAGES = new Set([
  'weapon',
  'helmet',
  'chest',
  'pants',
  'boots',
  'gloves',
])
const WARERA_API_BASE =
  process.env.WARERA_API_BASE ??
  process.env.VITE_API_BASE ??
  'https://api2.warera.io/trpc'

interface CacheEntry<TValue> {
  expiresAt: number
  value: TValue
}

export interface EquipmentPriceSnapshot {
  generatedAt: string
  salesByCode: Record<string, EquipmentQuoteComparableSale[]>
}

interface PricingQuoteBuildOptions {
  apiKey?: string
  fetchComparableSalesByCodes?: (
    itemCodes: string[],
    apiKey: string,
  ) => Promise<Record<string, EquipmentQuoteComparableSale[]>>
  persistSnapshot?: (snapshot: EquipmentPriceSnapshot) => void
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

function createCacheEntry<TValue>(
  value: TValue,
  ttlMs: number,
): CacheEntry<TValue> {
  return {
    expiresAt: Date.now() + ttlMs,
    value,
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
  const entry = createCacheEntry(value, ttlMs)

  memoryCache.set(key, entry)
  await writeBlobCache(path, entry)
}

function writeCachedValueInBackground<TValue>(
  key: string,
  path: string,
  value: TValue,
  ttlMs: number,
) {
  const entry = createCacheEntry(value, ttlMs)

  memoryCache.set(key, entry)
  void writeBlobCache(path, entry)
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

function getEquipmentItemCodes(
  gameConfig: GameConfigGetGameConfigResponse,
) {
  return Object.values(gameConfig.items)
    .flatMap((item) => {
      const candidate = item as {
        code?: string
        dynamicStats?: Partial<Record<string, number[]>>
        usage?: string
      }

      if (
        !candidate.code ||
        !candidate.dynamicStats ||
        !candidate.usage ||
        !EQUIPMENT_USAGES.has(candidate.usage)
      ) {
        return []
      }

      return [candidate.code]
    })
    .sort()
}

function mapComparableSales(
  response: TransactionGetPaginatedTransactionsResponse,
  itemCode: string,
): EquipmentQuoteComparableSale[] {
  return response.items.flatMap((item) => {
    if (
      !item.item ||
      item.item.code !== itemCode ||
      item.item.state !== item.item.maxState
    ) {
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

async function fetchComparableSalesForItemCode(
  client: ReturnType<typeof createWarEraApiClient>,
  itemCode: string,
) {
  try {
    const response = (await client.transaction.getPaginatedTransactions({
      itemCode,
      limit: 30,
      transactionType: 'itemMarket',
    })) as TransactionGetPaginatedTransactionsResponse

    return [itemCode, mapComparableSales(response, itemCode)] as const
  } catch (error) {
    console.warn(`Refreshing equipment snapshot failed for ${itemCode}.`, error)
    return [itemCode, []] as const
  }
}

async function fetchComparableSalesByCodes(
  itemCodes: string[],
  apiKey: string,
): Promise<Record<string, EquipmentQuoteComparableSale[]>> {
  if (itemCodes.length === 0) {
    return {}
  }

  const client = createWarEraApiClient(apiKey)
  const entries = await mapInBatches(
    [...new Set(itemCodes)],
    EQUIPMENT_PRICE_REFRESH_BATCH_SIZE,
    (itemCode) => fetchComparableSalesForItemCode(client, itemCode),
  )

  return Object.fromEntries(entries)
}

async function buildEquipmentPriceSnapshot(
  gameConfig: GameConfigGetGameConfigResponse,
): Promise<EquipmentPriceSnapshot> {
  const apiKey = process.env.WARERA_API_KEY

  if (!apiKey) {
    return {
      generatedAt: new Date().toISOString(),
      salesByCode: {},
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    salesByCode: await fetchComparableSalesByCodes(
      getEquipmentItemCodes(gameConfig),
      apiKey,
    ),
  }
}

async function getEquipmentPriceSnapshot(
  gameConfig: GameConfigGetGameConfigResponse,
) {
  const cacheKey = 'equipment-price-snapshot'
  const cachedSnapshot = await readCachedValue<EquipmentPriceSnapshot>(
    cacheKey,
    EQUIPMENT_PRICE_SNAPSHOT_CACHE_PATH,
  )

  if (cachedSnapshot) {
    return cachedSnapshot
  }

  return refreshEquipmentPriceSnapshot(gameConfig)
}

function createUnavailableEquipmentQuote(): EquipmentPriceQuote {
  return {
    lookbackDays: 0,
    sampleSize: 0,
    unavailable: true,
    usedFallbackPricing: true,
  }
}

function quoteEquipmentItem(
  item: PricingQuoteRequest['equipmentItems'][number],
  gameConfig: GameConfigGetGameConfigResponse,
  equipmentSnapshot: EquipmentPriceSnapshot,
): EquipmentPriceQuote {
  const sales = equipmentSnapshot.salesByCode[item.code] ?? []

  return sales.length > 0
    ? quoteEquipmentFullPrice(
        item,
        sales,
        getItemStatRanges(gameConfig, item.code),
      )
    : createUnavailableEquipmentQuote()
}

function buildEquipmentQuotes(
  equipmentItems: PricingQuoteRequest['equipmentItems'],
  gameConfig: GameConfigGetGameConfigResponse,
  equipmentSnapshot: EquipmentPriceSnapshot,
): PricingQuoteResponse['equipmentQuotes'] {
  return equipmentItems.reduce<PricingQuoteResponse['equipmentQuotes']>(
    (accumulator, item) => {
      accumulator[item.itemId] = {
        ...quoteEquipmentItem(item, gameConfig, equipmentSnapshot),
        code: item.code,
        itemId: item.itemId,
      }

      return accumulator
    },
    {},
  )
}

function mergeEquipmentSalesIntoSnapshot(
  equipmentSnapshot: EquipmentPriceSnapshot,
  nextSalesByCode: Record<string, EquipmentQuoteComparableSale[]>,
): EquipmentPriceSnapshot {
  const mergedEntries = Object.entries(nextSalesByCode).filter(
    ([, sales]) => sales.length > 0,
  )

  if (mergedEntries.length === 0) {
    return equipmentSnapshot
  }

  return {
    generatedAt: new Date().toISOString(),
    salesByCode: {
      ...equipmentSnapshot.salesByCode,
      ...Object.fromEntries(mergedEntries),
    },
  }
}

export async function buildPricingQuoteResponse(
  request: PricingQuoteRequest,
  consumablePrices: ConsumablePriceTable,
  gameConfig: GameConfigGetGameConfigResponse,
  equipmentSnapshot: EquipmentPriceSnapshot,
  options: PricingQuoteBuildOptions = {},
): Promise<PricingQuoteResponse> {
  const apiKey = options.apiKey ?? process.env.WARERA_API_KEY
  const fetchSalesByCode =
    options.fetchComparableSalesByCodes ?? fetchComparableSalesByCodes
  const persistSnapshot = options.persistSnapshot ?? (() => {})
  let activeSnapshot = equipmentSnapshot
  const equipmentQuotes = buildEquipmentQuotes(
    request.equipmentItems,
    gameConfig,
    activeSnapshot,
  )
  const unavailableItems = request.equipmentItems.filter(
    (item) => equipmentQuotes[item.itemId]?.unavailable,
  )

  if (unavailableItems.length > 0 && apiKey) {
    const liveSalesByCode = await fetchSalesByCode(
      unavailableItems.map((item) => item.code),
      apiKey,
    )
    const mergedSnapshot = mergeEquipmentSalesIntoSnapshot(
      activeSnapshot,
      liveSalesByCode,
    )

    if (mergedSnapshot !== activeSnapshot) {
      activeSnapshot = mergedSnapshot
      persistSnapshot(activeSnapshot)

      const fallbackQuotes = buildEquipmentQuotes(
        unavailableItems,
        gameConfig,
        activeSnapshot,
      )

      for (const item of unavailableItems) {
        equipmentQuotes[item.itemId] = fallbackQuotes[item.itemId]
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    consumablePrices,
    equipmentQuotes,
  }
}

export async function refreshEquipmentPriceSnapshot(
  gameConfigInput?: GameConfigGetGameConfigResponse,
) {
  const gameConfig = gameConfigInput ?? (await getGameConfig())
  const snapshot = await buildEquipmentPriceSnapshot(gameConfig)

  await writeCachedValue(
    'equipment-price-snapshot',
    EQUIPMENT_PRICE_SNAPSHOT_CACHE_PATH,
    snapshot,
    EQUIPMENT_PRICE_SNAPSHOT_TTL_MS,
  )

  return snapshot
}

export async function getPricingQuote(
  request: PricingQuoteRequest,
): Promise<PricingQuoteResponse> {
  const [consumablePrices, gameConfig] = await Promise.all([
    getConsumablePrices(),
    getGameConfig(),
  ])
  const equipmentSnapshot = await getEquipmentPriceSnapshot(gameConfig)

  return buildPricingQuoteResponse(
    request,
    consumablePrices,
    gameConfig,
    equipmentSnapshot,
    {
      persistSnapshot: (nextSnapshot) =>
        writeCachedValueInBackground(
          'equipment-price-snapshot',
          EQUIPMENT_PRICE_SNAPSHOT_CACHE_PATH,
          nextSnapshot,
          EQUIPMENT_PRICE_SNAPSHOT_TTL_MS,
        ),
    },
  )
}
