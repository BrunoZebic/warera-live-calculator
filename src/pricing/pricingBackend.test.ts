import type { GameConfigGetGameConfigResponse } from '@wareraprojects/api'
import { describe, expect, it, vi } from 'vitest'

import {
  buildPricingQuoteResponse,
  type EquipmentPriceSnapshot,
} from '../../api/_lib/pricing.ts'
import type {
  ConsumablePriceTable,
  PricingQuoteRequest,
} from './types'

const consumablePrices: ConsumablePriceTable = {
  lightAmmo: 0.2,
  ammo: 0.6,
  heavyAmmo: 2.4,
  bread: 1.7,
  steak: 3.4,
  cookedFish: 7.1,
  cocain: 33,
}

const gameConfig = {
  items: {
    sniper: {
      code: 'sniper',
      dynamicStats: {
        attack: [101, 130],
        criticalChance: [16, 20],
      },
      usage: 'weapon',
    },
    helmet4: {
      code: 'helmet4',
      dynamicStats: {
        criticalDamages: [71, 90],
      },
      usage: 'helmet',
    },
  },
} as unknown as GameConfigGetGameConfigResponse

const request: PricingQuoteRequest = {
  equipmentItems: [
    {
      itemId: 'player-a:0:weapon:sniper:100:attack:112|criticalChance:18',
      code: 'sniper',
      maxState: 100,
      skills: { attack: 112, criticalChance: 18 },
      state: 100,
    },
    {
      itemId: 'player-b:0:helmet:helmet4:100:criticalDamages:81',
      code: 'helmet4',
      maxState: 100,
      skills: { criticalDamages: 81 },
      state: 100,
    },
  ],
}

const snapshotWithMissingHelmet: EquipmentPriceSnapshot = {
  generatedAt: '2026-04-22T00:00:00.000Z',
  salesByCode: {
    sniper: [
      {
        code: 'sniper',
        createdAt: '2026-04-21T12:00:00.000Z',
        maxState: 100,
        money: 50,
        skills: { attack: 110, criticalChance: 18 },
        state: 100,
      },
      {
        code: 'sniper',
        createdAt: '2026-04-21T11:00:00.000Z',
        maxState: 100,
        money: 52,
        skills: { attack: 111, criticalChance: 18 },
        state: 100,
      },
      {
        code: 'sniper',
        createdAt: '2026-04-21T10:00:00.000Z',
        maxState: 100,
        money: 54,
        skills: { attack: 112, criticalChance: 18 },
        state: 100,
      },
    ],
  },
}

describe('buildPricingQuoteResponse', () => {
  it('uses snapshot quotes without hitting live fallback when prices already exist', async () => {
    const fetchComparableSalesByCodes = vi.fn()

    const response = await buildPricingQuoteResponse(
      {
        equipmentItems: [request.equipmentItems[0]],
      },
      consumablePrices,
      gameConfig,
      snapshotWithMissingHelmet,
      {
        apiKey: 'token',
        fetchComparableSalesByCodes,
      },
    )

    expect(fetchComparableSalesByCodes).not.toHaveBeenCalled()
    expect(response.equipmentQuotes[request.equipmentItems[0].itemId]).toMatchObject({
      estimatedFullItemPrice: 52,
      unavailable: false,
    })
  })

  it('fetches live sales only for unavailable items and persists successful fallback data', async () => {
    const fetchComparableSalesByCodes = vi.fn().mockResolvedValue({
      helmet4: [
        {
          code: 'helmet4',
          createdAt: '2026-04-21T12:00:00.000Z',
          maxState: 100,
          money: 70,
          skills: { criticalDamages: 80 },
          state: 100,
        },
        {
          code: 'helmet4',
          createdAt: '2026-04-20T12:00:00.000Z',
          maxState: 100,
          money: 80,
          skills: { criticalDamages: 82 },
          state: 100,
        },
      ],
    })
    const persistSnapshot = vi.fn()

    const response = await buildPricingQuoteResponse(
      request,
      consumablePrices,
      gameConfig,
      snapshotWithMissingHelmet,
      {
        apiKey: 'token',
        fetchComparableSalesByCodes,
        persistSnapshot,
      },
    )

    expect(fetchComparableSalesByCodes).toHaveBeenCalledTimes(1)
    expect(fetchComparableSalesByCodes).toHaveBeenCalledWith(['helmet4'], 'token')
    expect(response.equipmentQuotes[request.equipmentItems[0].itemId]).toMatchObject({
      estimatedFullItemPrice: 52,
      unavailable: false,
    })
    expect(response.equipmentQuotes[request.equipmentItems[1].itemId]).toMatchObject({
      estimatedFullItemPrice: 75,
      unavailable: false,
      usedFallbackPricing: true,
    })
    expect(persistSnapshot).toHaveBeenCalledTimes(1)
    expect(persistSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        salesByCode: expect.objectContaining({
          sniper: snapshotWithMissingHelmet.salesByCode.sniper,
          helmet4: expect.any(Array),
        }),
      }),
    )
  })

  it('keeps equipment unavailable without crashing when no API key is configured', async () => {
    const fetchComparableSalesByCodes = vi.fn()

    const response = await buildPricingQuoteResponse(
      {
        equipmentItems: [request.equipmentItems[1]],
      },
      consumablePrices,
      gameConfig,
      snapshotWithMissingHelmet,
      {
        fetchComparableSalesByCodes,
      },
    )

    expect(fetchComparableSalesByCodes).not.toHaveBeenCalled()
    expect(response.equipmentQuotes[request.equipmentItems[1].itemId]).toMatchObject({
      unavailable: true,
    })
  })

  it('keeps equipment unavailable when live fallback finds no comparable sales', async () => {
    const fetchComparableSalesByCodes = vi.fn().mockResolvedValue({
      helmet4: [],
    })
    const persistSnapshot = vi.fn()

    const response = await buildPricingQuoteResponse(
      {
        equipmentItems: [request.equipmentItems[1]],
      },
      consumablePrices,
      gameConfig,
      snapshotWithMissingHelmet,
      {
        apiKey: 'token',
        fetchComparableSalesByCodes,
        persistSnapshot,
      },
    )

    expect(fetchComparableSalesByCodes).toHaveBeenCalledWith(['helmet4'], 'token')
    expect(response.equipmentQuotes[request.equipmentItems[1].itemId]).toMatchObject({
      unavailable: true,
    })
    expect(persistSnapshot).not.toHaveBeenCalled()
  })
})
