import { describe, expect, it } from 'vitest'

import {
  createSelection,
  mergeSelectionWithSnapshot,
} from './players'
import type {
  EquipmentRow,
  LiveSkillMap,
  PlayerSelection,
  PlayerSnapshot,
} from '../types'

function makeLiveSkills(
  overrides: Partial<LiveSkillMap> = {},
): LiveSkillMap {
  return {
    attack: { level: 0, value: 100 },
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
    companies: { level: 0, value: 0 },
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
    id: 'player-1',
    username: 'player-1',
    level: 1,
    totalSkillPoints: 4,
    availableSkillPoints: 4,
    spentSkillPoints: 0,
    currentHealth: 25,
    maxHealth: 100,
    currentHunger: 2,
    maxHunger: 4,
    healthHourlyRegen: 10,
    hungerHourlyRegen: 0.4,
    attackPreAmmo: 120,
    detectedAttackModifierPct: 0,
    precisionPct: 60,
    criticalChancePct: 11,
    critDamagePct: 100,
    armorPct: 0,
    dodgePct: 0,
    currentAmmoType: 'ammo',
    weaponCode: 'rifle',
    attackTotal: 132,
    liveAmmoPercent: 10,
    equipment: [
      {
        slot: 'weapon',
        code: 'rifle',
        state: 90,
        maxState: 100,
        skills: { attack: 80, criticalChance: 8 },
      },
    ],
    liveSkills: makeLiveSkills(),
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
}

describe('mergeSelectionWithSnapshot', () => {
  it('preserves local live edits when the same player is reloaded', () => {
    const initialSelection = createSelection(makeSnapshot())
    const editedRows = [
      {
        ...initialSelection.equipmentRows?.[0],
        weapon: {
          code: 'sniper',
          isManual: true,
          maxState: 100,
          skills: { attack: 120, criticalChance: 10 },
          state: 100,
        },
      },
    ] as EquipmentRow[]
    const editedSelection: PlayerSelection = {
      ...initialSelection,
      ammoType: 'heavyAmmo',
      attackModifier: 'buff',
      foodInventory: {
        bread: 1,
        steak: 2,
        cookedFish: 3,
      },
      foodType: 'bread',
      liveSkillOverrides: {
        skillLevels: {
          attack: 4,
        },
      },
      equipmentRows: editedRows,
      weaponAmmoLoadouts: [
        {
          lightAmmo: 0,
          ammo: 10,
          heavyAmmo: 80,
        },
      ],
    }

    const merged = mergeSelectionWithSnapshot(
      editedSelection,
      makeSnapshot({
        currentHealth: 80,
        currentHunger: 3.5,
        username: 'updated-player',
      }),
    )

    expect(merged.snapshot.currentHealth).toBe(80)
    expect(merged.snapshot.currentHunger).toBe(3.5)
    expect(merged.snapshot.username).toBe('updated-player')
    expect(merged.ammoType).toBe('heavyAmmo')
    expect(merged.attackModifier).toBe('buff')
    expect(merged.foodInventory).toEqual({
      bread: 1,
      steak: 2,
      cookedFish: 3,
    })
    expect(merged.foodType).toBe('bread')
    expect(merged.liveSkillOverrides).toEqual({
      skillLevels: {
        attack: 4,
      },
    })
    expect(merged.equipmentRows).toBe(editedRows)
    expect(merged.weaponAmmoLoadouts).toEqual([
      {
        lightAmmo: 0,
        ammo: 10,
        heavyAmmo: 80,
      },
    ])
  })

  it('resets to a fresh selection when a different player is loaded', () => {
    const current = createSelection(makeSnapshot())

    const merged = mergeSelectionWithSnapshot(
      {
        ...current,
        attackModifier: 'buff',
        liveSkillOverrides: {
          skillLevels: {
            attack: 5,
          },
        },
      },
      makeSnapshot({
        id: 'player-2',
        username: 'player-2',
      }),
    )

    expect(merged.snapshot.id).toBe('player-2')
    expect(merged.attackModifier).toBe('none')
    expect(merged.liveSkillOverrides).toBeUndefined()
  })
})
