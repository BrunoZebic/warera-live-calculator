import { describe, expect, it } from 'vitest'

import {
  calculateSpendEstimate,
  mergeProjectionResourceUsages,
} from './spendEstimate'
import type { PricingQuoteResponse } from './types'

const pricingQuote: PricingQuoteResponse = {
  generatedAt: '2026-04-22T00:00:00.000Z',
  consumablePrices: {
    lightAmmo: 0.2,
    ammo: 0.6,
    heavyAmmo: 2.4,
    bread: 1.7,
    steak: 3.4,
    cookedFish: 7.1,
    cocain: 33,
  },
  equipmentQuotes: {
    'player-a:0:weapon:sniper:100:attack:112|criticalChance:18': {
      code: 'sniper',
      estimatedFullItemPrice: 54,
      itemId: 'player-a:0:weapon:sniper:100:attack:112|criticalChance:18',
      lookbackDays: 14,
      sampleSize: 5,
      unavailable: false,
      usedFallbackPricing: false,
    },
    'player-b:0:weapon:helmet4:100:criticalDamages:81': {
      code: 'helmet4',
      itemId: 'player-b:0:weapon:helmet4:100:criticalDamages:81',
      lookbackDays: 30,
      sampleSize: 0,
      unavailable: true,
      usedFallbackPricing: true,
    },
  },
}

describe('mergeProjectionResourceUsages', () => {
  it('sums consumables and preserves distinct equipment records', () => {
    const merged = mergeProjectionResourceUsages([
      {
        ammoUsed: { lightAmmo: 1, ammo: 2, heavyAmmo: 0 },
        foodUsed: { bread: 1, steak: 0, cookedFish: 0 },
        pillCount: 1,
        equipmentUsed: [],
      },
      {
        ammoUsed: { lightAmmo: 0, ammo: 0, heavyAmmo: 1 },
        foodUsed: { bread: 0, steak: 1, cookedFish: 1 },
        pillCount: 0,
        equipmentUsed: [],
      },
    ])

    expect(merged).toEqual({
      ammoUsed: { lightAmmo: 1, ammo: 2, heavyAmmo: 1 },
      foodUsed: { bread: 1, steak: 1, cookedFish: 1 },
      pillCount: 1,
      equipmentUsed: [],
    })
  })
})

describe('calculateSpendEstimate', () => {
  it('computes a partial total when some equipment items are unpriced', () => {
    const estimate = calculateSpendEstimate(
      {
        ammoUsed: { lightAmmo: 0, ammo: 10, heavyAmmo: 2 },
        foodUsed: { bread: 1, steak: 1, cookedFish: 0 },
        pillCount: 1,
        equipmentUsed: [
          {
            itemId: 'player-a:0:weapon:sniper:100:attack:112|criticalChance:18',
            selectionKey: 'player-a',
            rowIndex: 0,
            slot: 'weapon',
            code: 'sniper',
            skills: { attack: 112, criticalChance: 18 },
            state: 100,
            maxState: 100,
            durabilityUsed: 50,
          },
          {
            itemId: 'player-b:0:weapon:helmet4:100:criticalDamages:81',
            selectionKey: 'player-b',
            rowIndex: 0,
            slot: 'helmet',
            code: 'helmet4',
            skills: { criticalDamages: 81 },
            state: 100,
            maxState: 100,
            durabilityUsed: 20,
          },
        ],
      },
      pricingQuote,
      2_000,
    )

    expect(estimate).toMatchObject({
      ammoSpent: 10.8,
      costPer1kDamage: 37.95,
      foodSpent: 5.1,
      pillSpent: 33,
      equipmentSpent: 27,
      totalSpent: 75.9,
      isPartial: true,
      unpricedEquipmentCount: 1,
    })
  })

  it('returns no normalized metric when damage is zero', () => {
    const estimate = calculateSpendEstimate(
      {
        ammoUsed: { lightAmmo: 0, ammo: 1, heavyAmmo: 0 },
        foodUsed: { bread: 0, steak: 0, cookedFish: 0 },
        pillCount: 0,
        equipmentUsed: [],
      },
      pricingQuote,
      0,
    )

    expect(estimate).toMatchObject({
      ammoSpent: 0.6,
      totalSpent: 0.6,
      costPer1kDamage: null,
      isPartial: false,
      unpricedEquipmentCount: 0,
    })
  })
})
