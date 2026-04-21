import { createEmptyFoodInventory } from '../lib/players'
import type {
  EquipmentUsageRecord,
  ProjectionResourceUsage,
} from '../types'
import type { PricingQuoteRequest, PricingQuoteResponse } from './types'

function createEmptyProjectionResourceUsage(): ProjectionResourceUsage {
  return {
    ammoUsed: {
      lightAmmo: 0,
      ammo: 0,
      heavyAmmo: 0,
    },
    foodUsed: createEmptyFoodInventory(),
    pillCount: 0,
    equipmentUsed: [],
  }
}

function mergeEquipmentUsage(
  currentItems: EquipmentUsageRecord[],
  nextItems: EquipmentUsageRecord[],
): EquipmentUsageRecord[] {
  const usageByItemId = new Map<string, EquipmentUsageRecord>()

  for (const item of [...currentItems, ...nextItems]) {
    const current = usageByItemId.get(item.itemId)

    if (current) {
      current.durabilityUsed += item.durabilityUsed
      continue
    }

    usageByItemId.set(item.itemId, { ...item })
  }

  return [...usageByItemId.values()]
}

export interface SpendEstimate {
  ammoSpent: number
  equipmentSpent: number
  foodSpent: number
  isPartial: boolean
  pillSpent: number
  totalSpent: number
  unpricedEquipmentCount: number
}

export function mergeProjectionResourceUsages(
  resourceUsages: ProjectionResourceUsage[],
): ProjectionResourceUsage {
  return resourceUsages.reduce<ProjectionResourceUsage>((accumulator, current) => {
    accumulator.ammoUsed.lightAmmo += current.ammoUsed.lightAmmo
    accumulator.ammoUsed.ammo += current.ammoUsed.ammo
    accumulator.ammoUsed.heavyAmmo += current.ammoUsed.heavyAmmo
    accumulator.foodUsed.bread += current.foodUsed.bread
    accumulator.foodUsed.steak += current.foodUsed.steak
    accumulator.foodUsed.cookedFish += current.foodUsed.cookedFish
    accumulator.pillCount += current.pillCount
    accumulator.equipmentUsed = mergeEquipmentUsage(
      accumulator.equipmentUsed,
      current.equipmentUsed,
    )

    return accumulator
  }, createEmptyProjectionResourceUsage())
}

export function buildPricingQuoteRequest(
  resourceUsage: ProjectionResourceUsage,
): PricingQuoteRequest {
  return {
    equipmentItems: resourceUsage.equipmentUsed.map((item) => ({
      itemId: item.itemId,
      code: item.code,
      maxState: item.maxState,
      skills: item.skills,
      state: item.state,
    })),
  }
}

export function calculateSpendEstimate(
  resourceUsage: ProjectionResourceUsage,
  pricingQuote: PricingQuoteResponse,
): SpendEstimate {
  const ammoSpent =
    resourceUsage.ammoUsed.lightAmmo * pricingQuote.consumablePrices.lightAmmo +
    resourceUsage.ammoUsed.ammo * pricingQuote.consumablePrices.ammo +
    resourceUsage.ammoUsed.heavyAmmo * pricingQuote.consumablePrices.heavyAmmo
  const foodSpent =
    resourceUsage.foodUsed.bread * pricingQuote.consumablePrices.bread +
    resourceUsage.foodUsed.steak * pricingQuote.consumablePrices.steak +
    resourceUsage.foodUsed.cookedFish * pricingQuote.consumablePrices.cookedFish
  const pillSpent = resourceUsage.pillCount * pricingQuote.consumablePrices.cocain
  let equipmentSpent = 0
  let unpricedEquipmentCount = 0

  for (const equipmentItem of resourceUsage.equipmentUsed) {
    const quote = pricingQuote.equipmentQuotes[equipmentItem.itemId]

    if (quote?.unavailable || !quote?.estimatedFullItemPrice) {
      unpricedEquipmentCount += 1
      continue
    }

    equipmentSpent +=
      quote.estimatedFullItemPrice *
      (equipmentItem.durabilityUsed / Math.max(equipmentItem.maxState, 1))
  }

  return {
    ammoSpent,
    equipmentSpent,
    foodSpent,
    isPartial: unpricedEquipmentCount > 0,
    pillSpent,
    totalSpent: ammoSpent + foodSpent + pillSpent + equipmentSpent,
    unpricedEquipmentCount,
  }
}
