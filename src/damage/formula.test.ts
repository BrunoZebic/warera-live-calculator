import { describe, expect, it } from 'vitest'

import { calculateGroupProjection, calculatePlayerProjection } from './formula'
import { projectFutureBars } from './projection'
import { calculateFoodRecovery, createEmptyFoodInventory } from '../lib/players'
import type { CalcInput, RuntimeConfig } from '../types'

const runtimeConfig: RuntimeConfig = {
  cachedAt: Date.now(),
  configSource: 'fallback',
  foodRestorePct: {
    bread: 10,
    steak: 15,
    cookedFish: 20,
  },
  pillAttackBonusPct: 60,
  itemMetaByCode: {},
  equipmentMetaBySlot: {
    weapon: [],
    helmet: [],
    chest: [],
    pants: [],
    boots: [],
    gloves: [],
  },
  combatRules: {
    armorSoftCap: 40,
    dodgeSoftCap: 40,
    precisionOverflowTarget: 'attack',
    precisionOverflowValue: 4,
    criticalChanceOverflowTarget: 'criticalDamages',
    criticalChanceOverflowValue: 4,
  },
  defaultBars: {
    maxHealth: 100,
    maxHunger: 4,
    healthHourlyRegen: 10,
    hungerHourlyRegen: 0.4,
  },
  defaultCombat: {
    attackPreAmmo: 100,
    precisionPct: 50,
    criticalChancePct: 10,
    critDamagePct: 100,
    armorPct: 0,
    dodgePct: 0,
  },
}

function makeInput(overrides: Partial<CalcInput> = {}): CalcInput {
  return {
    id: 'test-player',
    username: 'test-player',
    currentHealth: 100,
    maxHealth: 100,
    currentHunger: 5,
    maxHunger: 7,
    healthHourlyRegen: 10,
    hungerHourlyRegen: 0.7,
    attackPreAmmo: 300,
    detectedAttackModifierPct: 0,
    precisionPct: 90,
    criticalChancePct: 25,
    critDamagePct: 50,
    armorPct: 20,
    dodgePct: 10,
    battleBonusPct: 20,
    ammoType: 'lightAmmo',
    pillAttackBonusPct: 0,
    foodUsesAvailable: 5,
    recoverableHpFromFood: 100,
    ...overrides,
  }
}

describe('calculatePlayerProjection', () => {
  it('computes expected damage, health pool, and attempts', () => {
    const result = calculatePlayerProjection(makeInput())

    expect(result.attackWithSelectedModifiers).toBeCloseTo(330, 5)
    expect(result.expectedDamagePerAttempt).toBeCloseTo(420.75, 5)
    expect(result.expectedHpLossPerAttempt).toBeCloseTo(7.2, 5)
    expect(result.foodUsesAvailable).toBe(5)
    expect(result.recoverableHpFromFood).toBeCloseTo(100, 5)
    expect(result.effectiveHealthPool).toBeCloseTo(200, 5)
    expect(result.estimatedAttempts).toBe(27)
    expect(result.totalDamage).toBeCloseTo(11360.25, 5)
  })

  it('returns zero attempts when there is not enough health and no food selected', () => {
    const result = calculatePlayerProjection(
      makeInput({
        currentHealth: 5,
        currentHunger: 0,
        foodUsesAvailable: 0,
        recoverableHpFromFood: 0,
      }),
    )

    expect(result.effectiveHealthPool).toBeCloseTo(5, 5)
    expect(result.estimatedAttempts).toBe(0)
    expect(result.totalDamage).toBe(0)
  })

  it('only counts full hunger points for food uses and supports buff removal', () => {
    const result = calculatePlayerProjection(
      makeInput({
        currentHealth: 41.4,
        currentHunger: 1.8,
        maxHealth: 120,
        attackPreAmmo: 300,
        detectedAttackModifierPct: 60,
        pillAttackBonusPct: 0,
        foodUsesAvailable: 1,
        recoverableHpFromFood: 12,
      }),
    )

    expect(result.attackWithSelectedModifiers).toBeCloseTo(206.25, 5)
    expect(result.foodUsesAvailable).toBe(1)
    expect(result.recoverableHpFromFood).toBeCloseTo(12, 5)
    expect(result.effectiveHealthPool).toBeCloseTo(53.4, 5)
  })

  it('removes a detected debuff before applying a selected debuff state', () => {
    const result = calculatePlayerProjection(
      makeInput({
        attackPreAmmo: 120,
        detectedAttackModifierPct: -20,
        pillAttackBonusPct: -60,
        ammoType: 'none',
        battleBonusPct: 0,
        precisionPct: 100,
        criticalChancePct: 0,
        critDamagePct: 0,
        armorPct: 0,
        dodgePct: 0,
        currentHunger: 0,
        foodUsesAvailable: 0,
        recoverableHpFromFood: 0,
      }),
    )

    expect(result.attackWithSelectedModifiers).toBeCloseTo(60, 5)
  })
})

describe('calculateFoodRecovery', () => {
  it('consumes the best available food first up to the hunger limit', () => {
    const result = calculateFoodRecovery(
      {
        ...createEmptyFoodInventory(),
        bread: 3,
        steak: 2,
        cookedFish: 1,
      },
      3.8,
      100,
      runtimeConfig,
    )

    expect(result.foodUsesAvailable).toBe(3)
    expect(result.recoverableHpFromFood).toBeCloseTo(50, 5)
  })
})

describe('projectFutureBars', () => {
  it('caps regenerated bars at their maximum values', () => {
    const projected = projectFutureBars(
      {
        currentHealth: 75,
        maxHealth: 100,
        currentHunger: 2,
        maxHunger: 7,
        healthHourlyRegen: 10,
        hungerHourlyRegen: 0.7,
      },
      4,
      runtimeConfig,
    )

    expect(projected.currentHealth).toBe(100)
    expect(projected.currentHunger).toBeCloseTo(4.8, 5)
  })
})

describe('calculateGroupProjection', () => {
  it('sums total damage and attempts from each player projection', () => {
    const playerA = makeInput()
    const playerB = makeInput({
      id: 'second-player',
      username: 'second-player',
      attackPreAmmo: 200,
      ammoType: 'ammo',
      currentHealth: 60,
      currentHunger: 2,
      foodUsesAvailable: 2,
      recoverableHpFromFood: 30,
    })

    const singleA = calculatePlayerProjection(playerA)
    const singleB = calculatePlayerProjection(playerB)
    const group = calculateGroupProjection([playerA, playerB])

    expect(group.totalDamage).toBeCloseTo(
      singleA.totalDamage + singleB.totalDamage,
      5,
    )
    expect(group.totalAttempts).toBe(
      singleA.estimatedAttempts + singleB.estimatedAttempts,
    )
    expect(group.playerCount).toBe(2)
  })
})
