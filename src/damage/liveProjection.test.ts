import { describe, expect, it } from 'vitest'

import { calculateSelectionProjection } from './liveProjection'
import {
  createDefaultWeaponAmmoLoadout,
  createEmptyEquipmentRow,
  createEquipmentCellFromMeta,
} from '../lib/equipmentRows'
import type {
  EquipmentCell,
  EquipmentItemMeta,
  EquipmentRow,
  PlayerSelection,
  PlayerSnapshot,
  RuntimeConfig,
  WeaponAmmoLoadout,
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

const lowWeaponMeta: EquipmentItemMeta = {
  code: 'knife',
  slot: 'weapon',
  rarity: 'common',
  statRanges: [
    { key: 'attack', min: 20, max: 20 },
    { key: 'criticalChance', min: 1, max: 1 },
  ],
}

const highWeaponMeta: EquipmentItemMeta = {
  code: 'sniper',
  slot: 'weapon',
  rarity: 'epic',
  statRanges: [
    { key: 'attack', min: 100, max: 100 },
    { key: 'criticalChance', min: 10, max: 10 },
  ],
}

const glovesMeta: EquipmentItemMeta = {
  code: 'gloves3',
  slot: 'gloves',
  rarity: 'rare',
  statRanges: [{ key: 'precision', min: 10, max: 10 }],
}

const bootsMeta: EquipmentItemMeta = {
  code: 'boots4',
  slot: 'boots',
  rarity: 'epic',
  statRanges: [{ key: 'dodge', min: 40, max: 40 }],
}

function makeCell(
  meta: EquipmentItemMeta,
  overrides: Partial<EquipmentCell> = {},
): EquipmentCell {
  return {
    ...createEquipmentCellFromMeta(meta),
    ...overrides,
  }
}

function makeRow(overrides: Partial<EquipmentRow>): EquipmentRow {
  return {
    ...createEmptyEquipmentRow(),
    ...overrides,
  }
}

function makeLiveSelection(
  rows: EquipmentRow[],
  overrides: Partial<PlayerSnapshot> = {},
  weaponAmmoLoadouts?: WeaponAmmoLoadout[],
): PlayerSelection {
  const snapshot: PlayerSnapshot = {
    source: 'live',
    id: 'live-player',
    username: 'live-player',
    currentHealth: 15,
    maxHealth: 100,
    currentHunger: 0,
    maxHunger: 4,
    healthHourlyRegen: 0,
    hungerHourlyRegen: 0,
    attackPreAmmo: 120,
    detectedAttackModifierPct: 0,
    precisionPct: 60,
    criticalChancePct: 11,
    critDamagePct: 100,
    armorPct: 0,
    dodgePct: 50,
    currentAmmoType: 'none',
    weaponCode: 'knife',
    attackTotal: 120,
    liveAmmoPercent: 0,
    equipment: [],
    liveCombatBase: {
      attackBaseValue: 100,
      attackPercentMultiplier: 1,
      precisionBaseValue: 50,
      criticalChanceBaseValue: 10,
      critDamageBaseValue: 100,
      armorBaseValue: 0,
      dodgeBaseValue: 0,
    },
    ...overrides,
  }

  return {
    key: 'live-player',
    snapshot,
    ammoType: 'none',
    foodType: 'none',
    attackModifier: 'none',
    equipmentRows: rows,
    weaponAmmoLoadouts,
  }
}

describe('live equipment helpers', () => {
  it('uses floor midpoint defaults for manually selected equipment', () => {
    const cell = createEquipmentCellFromMeta({
      code: 'gun',
      slot: 'weapon',
      rarity: 'uncommon',
      statRanges: [
        { key: 'attack', min: 51, max: 60 },
        { key: 'criticalChance', min: 6, max: 10 },
      ],
    })

    expect(cell.skills.attack).toBe(55)
    expect(cell.skills.criticalChance).toBe(8)
    expect(cell.state).toBe(100)
    expect(cell.maxState).toBe(100)
  })
})

describe('calculateSelectionProjection', () => {
  it('matches the opening projection when row 1 does not break before health runs out', () => {
    const selection = makeLiveSelection([
      makeRow({
        weapon: makeCell(lowWeaponMeta, { state: 100, isManual: false }),
        gloves: makeCell(glovesMeta, { state: 100, isManual: false }),
        boots: makeCell(bootsMeta, { state: 100, isManual: false }),
      }),
    ])

    const result = calculateSelectionProjection({
      battleBonusPct: 0,
      config: runtimeConfig,
      foodRestorePct: 0,
      pillAttackBonusPct: 0,
      selection,
    })

    expect(result.projection.totalDamage).toBeCloseTo(
      result.openingProjection.totalDamage,
      5,
    )
    expect(result.projection.estimatedAttempts).toBe(
      result.openingProjection.estimatedAttempts,
    )
  })

  it('activates row 2 weapon while row 1 non-weapon slots stay active', () => {
    const rowOne = makeRow({
      weapon: makeCell(lowWeaponMeta, { state: 1, isManual: false }),
      gloves: makeCell(glovesMeta, { state: 100, isManual: false }),
      boots: makeCell(bootsMeta, { state: 100, isManual: false }),
    })
    const rowTwo = makeRow({
      weapon: makeCell(highWeaponMeta),
    })

    const selection = makeLiveSelection([rowOne, rowTwo])
    const result = calculateSelectionProjection({
      battleBonusPct: 0,
      config: runtimeConfig,
      foodRestorePct: 0,
      pillAttackBonusPct: 0,
      selection,
    })
    const rowOneProjection = result.openingProjection

    const postBreakSelection = makeLiveSelection([
      makeRow({
        weapon: makeCell(highWeaponMeta),
        gloves: makeCell(glovesMeta, { state: 100, isManual: false }),
        boots: makeCell(bootsMeta, { state: 100, isManual: false }),
      }),
    ])
    const postBreakProjection = calculateSelectionProjection({
      battleBonusPct: 0,
      config: runtimeConfig,
      foodRestorePct: 0,
      pillAttackBonusPct: 0,
      selection: postBreakSelection,
    }).openingProjection

    expect(result.projection.estimatedAttempts).toBe(3)
    expect(result.projection.totalDamage).toBeCloseTo(
      rowOneProjection.expectedDamagePerAttempt +
        postBreakProjection.expectedDamagePerAttempt * 2,
      5,
    )
  })

  it('skips empty backup rows when advancing a spent slot column', () => {
    const rowOne = makeRow({
      weapon: makeCell(lowWeaponMeta, { state: 1, isManual: false }),
      gloves: makeCell(glovesMeta, { state: 100, isManual: false }),
      boots: makeCell(bootsMeta, { state: 100, isManual: false }),
    })
    const emptyRow = createEmptyEquipmentRow()
    const rowThree = makeRow({
      weapon: makeCell(highWeaponMeta),
    })

    const selection = makeLiveSelection([rowOne, emptyRow, rowThree])
    const result = calculateSelectionProjection({
      battleBonusPct: 0,
      config: runtimeConfig,
      foodRestorePct: 0,
      pillAttackBonusPct: 0,
      selection,
    })
    const postBreakProjection = calculateSelectionProjection({
      battleBonusPct: 0,
      config: runtimeConfig,
      foodRestorePct: 0,
      pillAttackBonusPct: 0,
      selection: makeLiveSelection([
        makeRow({
          weapon: makeCell(highWeaponMeta),
          gloves: makeCell(glovesMeta, { state: 100, isManual: false }),
          boots: makeCell(bootsMeta, { state: 100, isManual: false }),
        }),
      ]),
    }).openingProjection

    expect(result.projection.totalDamage).toBeCloseTo(
      result.openingProjection.expectedDamagePerAttempt +
        postBreakProjection.expectedDamagePerAttempt * 2,
      5,
    )
  })

  it('uses the strongest remaining ammo on the current weapon row first', () => {
    const rowOne = makeRow({
      weapon: makeCell(lowWeaponMeta, { state: 2, isManual: false }),
      gloves: makeCell(glovesMeta, { state: 100, isManual: false }),
    })
    const selection = makeLiveSelection(
      [rowOne],
      {
        currentHealth: 20,
        currentAmmoType: 'ammo',
        dodgePct: 0,
      },
      [
        {
          ...createDefaultWeaponAmmoLoadout('ammo', 1),
          heavyAmmo: 1,
          ammo: 1,
        },
      ],
    )

    const result = calculateSelectionProjection({
      battleBonusPct: 0,
      config: runtimeConfig,
      foodRestorePct: 0,
      pillAttackBonusPct: 0,
      selection,
    })
    const heavyOpening = calculateSelectionProjection({
      battleBonusPct: 0,
      config: runtimeConfig,
      foodRestorePct: 0,
      pillAttackBonusPct: 0,
      selection: makeLiveSelection(
        [
          makeRow({
            weapon: makeCell(lowWeaponMeta, { state: 1, isManual: false }),
            gloves: makeCell(glovesMeta, { state: 100, isManual: false }),
          }),
        ],
        {
          currentHealth: 20,
          currentAmmoType: 'heavyAmmo',
          dodgePct: 0,
        },
        [createDefaultWeaponAmmoLoadout('heavyAmmo', 1)],
      ),
    }).openingProjection
    const standardOpening = calculateSelectionProjection({
      battleBonusPct: 0,
      config: runtimeConfig,
      foodRestorePct: 0,
      pillAttackBonusPct: 0,
      selection: makeLiveSelection(
        [
          makeRow({
            weapon: makeCell(lowWeaponMeta, { state: 1, isManual: false }),
            gloves: makeCell(glovesMeta, { state: 100, isManual: false }),
          }),
        ],
        {
          currentHealth: 20,
          currentAmmoType: 'ammo',
          dodgePct: 0,
        },
        [createDefaultWeaponAmmoLoadout('ammo', 1)],
      ),
    }).openingProjection

    expect(result.openingInput.ammoType).toBe('heavyAmmo')
    expect(result.projection.estimatedAttempts).toBe(2)
    expect(result.projection.totalDamage).toBeCloseTo(
      heavyOpening.expectedDamagePerAttempt +
        standardOpening.expectedDamagePerAttempt,
      5,
    )
  })
})
