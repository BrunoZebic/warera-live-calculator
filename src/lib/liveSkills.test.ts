import { describe, expect, it } from 'vitest'

import {
  buildLiveSkillOverrides,
  resolveLiveSkillPlan,
} from './liveSkills'
import type {
  LiveSkillMap,
  PlayerSnapshot,
  RuntimeConfig,
} from '../types'

const runtimeConfig: RuntimeConfig = {
  cachedAt: Date.now(),
  configSource: 'fallback',
  foodRestorePct: {
    bread: 10,
    steak: 15,
    cookedFish: 20,
  },
  pillAttackBonusPct: 60,
  pillBuffDurationHours: 8,
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
  skillLevelValues: {
    attack: { 2: 102, 3: 103, 4: 104 },
    precision: {},
    criticalChance: {},
    criticalDamages: {},
    armor: {},
    dodge: {},
    health: { 0: 100, 2: 120 },
    hunger: { 0: 4, 2: 6 },
    energy: {},
    entrepreneurship: {},
    production: {},
    companies: { 1: 1, 3: 3 },
    management: {},
    lootChance: {},
  },
}

function makeLiveSkills(
  overrides: Partial<LiveSkillMap> = {},
): LiveSkillMap {
  return {
    attack: { level: 2, value: 102 },
    precision: { level: 0, value: 50 },
    criticalChance: { level: 0, value: 10 },
    criticalDamages: { level: 0, value: 100 },
    armor: { level: 0, value: 0 },
    dodge: { level: 0, value: 0 },
    health: { level: 0, value: 100 },
    hunger: { level: 0, value: 4 },
    energy: { level: 0, value: 10 },
    entrepreneurship: { level: 0, value: 0 },
    production: { level: 0, value: 0 },
    companies: { level: 1, value: 1 },
    management: { level: 0, value: 0 },
    lootChance: { level: 0, value: 0 },
    ...overrides,
  }
}

function makeSnapshot(
  overrides: Partial<PlayerSnapshot> = {},
): PlayerSnapshot {
  return {
    source: 'live',
    id: 'planner-player',
    username: 'planner-player',
    level: 5,
    totalSkillPoints: 20,
    availableSkillPoints: 5,
    spentSkillPoints: 15,
    currentHealth: 50,
    maxHealth: 100,
    currentHunger: 2,
    maxHunger: 4,
    healthHourlyRegen: 10,
    hungerHourlyRegen: 0.4,
    attackPreAmmo: 102,
    detectedAttackModifierPct: 0,
    precisionPct: 50,
    criticalChancePct: 10,
    critDamagePct: 100,
    armorPct: 0,
    dodgePct: 0,
    currentAmmoType: 'none',
    attackTotal: 102,
    liveAmmoPercent: 0,
    equipment: [],
    liveSkills: makeLiveSkills(),
    liveCombatBase: {
      attackBaseValue: 102,
      attackPercentMultiplier: 1,
      precisionBaseValue: 50,
      criticalChanceBaseValue: 10,
      critDamageBaseValue: 100,
      armorBaseValue: 0,
      dodgeBaseValue: 0,
    },
    ...overrides,
  }
}

describe('resolveLiveSkillPlan', () => {
  it('keeps the live totals unchanged when no overrides are applied', () => {
    const snapshot = makeSnapshot()
    const plan = resolveLiveSkillPlan(snapshot, undefined, runtimeConfig)

    expect(plan.playerLevel).toBe(5)
    expect(plan.totalSkillPoints).toBe(20)
    expect(plan.spentSkillPoints).toBe(15)
    expect(plan.availableSkillPoints).toBe(5)
    expect(plan.skillLevels.attack).toBe(2)
    expect(plan.skillValues.attack).toBe(102)
  })

  it('spends additional points using the in-game increasing cost rule', () => {
    const snapshot = makeSnapshot()
    const plan = resolveLiveSkillPlan(
      snapshot,
      {
        playerLevel: 6,
        skillLevels: {
          attack: 3,
          companies: 2,
        },
      },
      runtimeConfig,
    )

    expect(plan.totalSkillPoints).toBe(24)
    expect(plan.spentSkillPoints).toBe(20)
    expect(plan.availableSkillPoints).toBe(4)
    expect(plan.skillValues.attack).toBe(103)
    expect(plan.skillValues.companies).toBe(2)
  })

  it('rebuilds health and hunger bars from the edited skill values', () => {
    const snapshot = makeSnapshot()
    const plan = resolveLiveSkillPlan(
      snapshot,
      {
        skillLevels: {
          health: 2,
          hunger: 2,
        },
      },
      runtimeConfig,
    )

    expect(plan.bars.maxHealth).toBe(120)
    expect(plan.bars.currentHealth).toBe(60)
    expect(plan.bars.healthHourlyRegen).toBe(12)
    expect(plan.bars.maxHunger).toBe(6)
    expect(plan.bars.currentHunger).toBe(3)
    expect(plan.bars.hungerHourlyRegen).toBeCloseTo(0.6, 5)
  })

  it('caps planned skills at level 10', () => {
    const snapshot = makeSnapshot({
      liveSkills: makeLiveSkills({
        attack: { level: 10, value: 110 },
      }),
      liveCombatBase: {
        attackBaseValue: 110,
        attackPercentMultiplier: 1,
        precisionBaseValue: 50,
        criticalChanceBaseValue: 10,
        critDamageBaseValue: 100,
        armorBaseValue: 0,
        dodgeBaseValue: 0,
      },
    })

    const plan = resolveLiveSkillPlan(
      snapshot,
      {
        skillLevels: {
          attack: 14,
        },
      },
      runtimeConfig,
    )

    expect(plan.skillLevels.attack).toBe(10)
  })
})

describe('buildLiveSkillOverrides', () => {
  it('returns only the changed level and skill entries', () => {
    const snapshot = makeSnapshot()

    expect(
      buildLiveSkillOverrides(snapshot, snapshot.level, {
        attack: 2,
        precision: 0,
        criticalChance: 0,
        criticalDamages: 0,
        armor: 0,
        dodge: 0,
        health: 0,
        hunger: 0,
        energy: 0,
        entrepreneurship: 0,
        production: 0,
        companies: 1,
        management: 0,
        lootChance: 0,
      }),
    ).toBeUndefined()

    expect(
      buildLiveSkillOverrides(snapshot, 7, {
        attack: 4,
        precision: 0,
        criticalChance: 0,
        criticalDamages: 0,
        armor: 0,
        dodge: 0,
        health: 0,
        hunger: 0,
        energy: 0,
        entrepreneurship: 0,
        production: 0,
        companies: 1,
        management: 0,
        lootChance: 0,
      }),
    ).toEqual({
      playerLevel: 7,
      skillLevels: {
        attack: 4,
      },
    })
  })
})
