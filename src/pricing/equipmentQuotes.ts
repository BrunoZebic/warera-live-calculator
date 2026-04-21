import type { EquipmentStatRange, EquipmentStatValues } from '../types'

export const PRIMARY_EQUIPMENT_PRICE_LOOKBACK_DAYS = 14
export const FALLBACK_EQUIPMENT_PRICE_LOOKBACK_DAYS = 30
export const EQUIPMENT_COMPARABLE_SAMPLE_SIZE = 5
export const MIN_COMPARABLE_EQUIPMENT_SALES = 3

export interface EquipmentQuoteComparableSale {
  code: string
  createdAt: string
  maxState: number
  money: number
  skills: EquipmentStatValues
  state: number
}

export interface EquipmentQuoteTargetItem {
  code: string
  maxState: number
  skills: EquipmentStatValues
  state: number
}

export interface EquipmentPriceQuote {
  estimatedFullItemPrice?: number
  lookbackDays: number
  sampleSize: number
  unavailable: boolean
  usedFallbackPricing: boolean
}

function normalizeStatValue(value: number, range: EquipmentStatRange): number {
  if (range.max <= range.min) {
    return 0
  }

  return (value - range.min) / (range.max - range.min)
}

function isFinitePositiveNumber(value: number) {
  return Number.isFinite(value) && value > 0
}

export function normalizeFullDurabilityPrice(
  money: number,
  state: number,
  maxState: number,
): number {
  if (!isFinitePositiveNumber(money) || !isFinitePositiveNumber(maxState)) {
    return 0
  }

  return money * (maxState / Math.max(state, 1))
}

export function calculateNormalizedStatDistance(
  targetSkills: EquipmentStatValues,
  comparableSkills: EquipmentStatValues,
  statRanges: EquipmentStatRange[],
): number {
  if (statRanges.length === 0) {
    return 0
  }

  let totalDistance = 0

  for (const range of statRanges) {
    const targetValue = normalizeStatValue(targetSkills[range.key] ?? range.min, range)
    const comparableValue = normalizeStatValue(
      comparableSkills[range.key] ?? range.min,
      range,
    )

    totalDistance += Math.abs(targetValue - comparableValue)
  }

  return totalDistance / statRanges.length
}

export function median(values: number[]): number {
  if (values.length === 0) {
    return 0
  }

  const sortedValues = [...values].sort((left, right) => left - right)
  const middleIndex = Math.floor(sortedValues.length / 2)

  if (sortedValues.length % 2 === 1) {
    return sortedValues[middleIndex]
  }

  return (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2
}

function filterComparableSalesByAge(
  sales: EquipmentQuoteComparableSale[],
  now: Date,
  lookbackDays: number,
): EquipmentQuoteComparableSale[] {
  const lookbackThresholdMs =
    now.getTime() - lookbackDays * 24 * 60 * 60 * 1000

  return sales.filter((sale) => {
    const createdAtMs = new Date(sale.createdAt).getTime()

    return (
      Number.isFinite(createdAtMs) &&
      createdAtMs >= lookbackThresholdMs &&
      isFinitePositiveNumber(sale.money) &&
      isFinitePositiveNumber(sale.maxState)
    )
  })
}

export function quoteEquipmentFullPrice(
  targetItem: EquipmentQuoteTargetItem,
  sales: EquipmentQuoteComparableSale[],
  statRanges: EquipmentStatRange[],
  now = new Date(),
): EquipmentPriceQuote {
  const primaryWindowSales = filterComparableSalesByAge(
    sales,
    now,
    PRIMARY_EQUIPMENT_PRICE_LOOKBACK_DAYS,
  )
  const retainedSales =
    primaryWindowSales.length >= MIN_COMPARABLE_EQUIPMENT_SALES
      ? primaryWindowSales
      : filterComparableSalesByAge(
          sales,
          now,
          FALLBACK_EQUIPMENT_PRICE_LOOKBACK_DAYS,
        )
  const lookbackDays =
    primaryWindowSales.length >= MIN_COMPARABLE_EQUIPMENT_SALES
      ? PRIMARY_EQUIPMENT_PRICE_LOOKBACK_DAYS
      : FALLBACK_EQUIPMENT_PRICE_LOOKBACK_DAYS

  if (retainedSales.length === 0) {
    return {
      lookbackDays,
      sampleSize: 0,
      unavailable: true,
      usedFallbackPricing: true,
    }
  }

  const normalizedPrices = retainedSales.map((sale) =>
    normalizeFullDurabilityPrice(sale.money, sale.state, sale.maxState),
  )

  if (retainedSales.length < MIN_COMPARABLE_EQUIPMENT_SALES) {
    return {
      estimatedFullItemPrice: median(normalizedPrices),
      lookbackDays,
      sampleSize: retainedSales.length,
      unavailable: false,
      usedFallbackPricing: true,
    }
  }

  const closestComparableSales = [...retainedSales]
    .sort(
      (left, right) =>
        calculateNormalizedStatDistance(targetItem.skills, left.skills, statRanges) -
        calculateNormalizedStatDistance(targetItem.skills, right.skills, statRanges),
    )
    .slice(0, EQUIPMENT_COMPARABLE_SAMPLE_SIZE)

  return {
    estimatedFullItemPrice: median(
      closestComparableSales.map((sale) =>
        normalizeFullDurabilityPrice(sale.money, sale.state, sale.maxState),
      ),
    ),
    lookbackDays,
    sampleSize: closestComparableSales.length,
    unavailable: false,
    usedFallbackPricing: false,
  }
}
