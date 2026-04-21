import { describe, expect, it } from 'vitest'

import {
  calculateNormalizedStatDistance,
  quoteEquipmentFullPrice,
} from './equipmentQuotes'
import type { EquipmentStatRange } from '../types'

const sniperStatRanges: EquipmentStatRange[] = [
  { key: 'attack', min: 101, max: 130 },
  { key: 'criticalChance', min: 16, max: 20 },
]

describe('calculateNormalizedStatDistance', () => {
  it('compares normalized rolls across all configured stat ranges', () => {
    expect(
      calculateNormalizedStatDistance(
        { attack: 115, criticalChance: 18 },
        { attack: 101, criticalChance: 20 },
        sniperStatRanges,
      ),
    ).toBeCloseTo(0.49137931, 6)
  })
})

describe('quoteEquipmentFullPrice', () => {
  it('uses the closest five comparable sales and ignores distant outliers', () => {
    const quote = quoteEquipmentFullPrice(
      {
        code: 'sniper',
        maxState: 100,
        skills: { attack: 112, criticalChance: 18 },
        state: 100,
      },
      [
        { code: 'sniper', createdAt: '2026-04-21T12:00:00.000Z', maxState: 100, money: 50, skills: { attack: 110, criticalChance: 18 }, state: 100 },
        { code: 'sniper', createdAt: '2026-04-21T11:00:00.000Z', maxState: 100, money: 52, skills: { attack: 111, criticalChance: 18 }, state: 100 },
        { code: 'sniper', createdAt: '2026-04-21T10:00:00.000Z', maxState: 100, money: 54, skills: { attack: 112, criticalChance: 18 }, state: 100 },
        { code: 'sniper', createdAt: '2026-04-21T09:00:00.000Z', maxState: 100, money: 56, skills: { attack: 113, criticalChance: 18 }, state: 100 },
        { code: 'sniper', createdAt: '2026-04-21T08:00:00.000Z', maxState: 100, money: 58, skills: { attack: 114, criticalChance: 18 }, state: 100 },
        { code: 'sniper', createdAt: '2026-04-21T07:00:00.000Z', maxState: 100, money: 200, skills: { attack: 130, criticalChance: 20 }, state: 100 },
      ],
      sniperStatRanges,
      new Date('2026-04-22T00:00:00.000Z'),
    )

    expect(quote).toMatchObject({
      estimatedFullItemPrice: 54,
      lookbackDays: 14,
      sampleSize: 5,
      unavailable: false,
      usedFallbackPricing: false,
    })
  })

  it('falls back to the same-code median when fewer than three recent sales survive', () => {
    const quote = quoteEquipmentFullPrice(
      {
        code: 'helmet4',
        maxState: 100,
        skills: { criticalDamages: 80 },
        state: 100,
      },
      [
        { code: 'helmet4', createdAt: '2026-04-20T12:00:00.000Z', maxState: 100, money: 60, skills: { criticalDamages: 79 }, state: 100 },
        { code: 'helmet4', createdAt: '2026-03-29T12:00:00.000Z', maxState: 100, money: 80, skills: { criticalDamages: 82 }, state: 100 },
      ],
      [{ key: 'criticalDamages', min: 71, max: 90 }],
      new Date('2026-04-22T00:00:00.000Z'),
    )

    expect(quote).toMatchObject({
      estimatedFullItemPrice: 70,
      lookbackDays: 30,
      sampleSize: 2,
      unavailable: false,
      usedFallbackPricing: true,
    })
  })

  it('marks an item as unpriced when no recent sales exist', () => {
    const quote = quoteEquipmentFullPrice(
      {
        code: 'boots4',
        maxState: 100,
        skills: { dodge: 22 },
        state: 100,
      },
      [
        { code: 'boots4', createdAt: '2026-02-20T12:00:00.000Z', maxState: 100, money: 45, skills: { dodge: 22 }, state: 100 },
      ],
      [{ key: 'dodge', min: 21, max: 25 }],
      new Date('2026-04-22T00:00:00.000Z'),
    )

    expect(quote).toEqual({
      lookbackDays: 30,
      sampleSize: 0,
      unavailable: true,
      usedFallbackPricing: true,
    })
  })

  it('ignores non-full-durability sales', () => {
    const quote = quoteEquipmentFullPrice(
      {
        code: 'gun',
        maxState: 100,
        skills: { attack: 55, criticalChance: 8 },
        state: 100,
      },
      [
        { code: 'gun', createdAt: '2026-04-21T10:00:00.000Z', maxState: 100, money: 10, skills: { attack: 55, criticalChance: 8 }, state: 80 },
        { code: 'gun', createdAt: '2026-04-21T09:00:00.000Z', maxState: 100, money: 11, skills: { attack: 55, criticalChance: 8 }, state: 100 },
        { code: 'gun', createdAt: '2026-04-21T08:00:00.000Z', maxState: 100, money: 12, skills: { attack: 55, criticalChance: 8 }, state: 100 },
      ],
      [
        { key: 'attack', min: 51, max: 60 },
        { key: 'criticalChance', min: 6, max: 10 },
      ],
      new Date('2026-04-22T00:00:00.000Z'),
    )

    expect(quote).toMatchObject({
      estimatedFullItemPrice: 11.5,
      lookbackDays: 30,
      sampleSize: 2,
      unavailable: false,
      usedFallbackPricing: true,
    })
  })
})
