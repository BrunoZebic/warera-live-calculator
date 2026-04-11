import { MINIMUM_BATTLE_HEALTH } from './constants'
import { buildCalcInput, calculatePlayerProjection } from './formula'
import {
  EQUIPMENT_SLOTS,
  createEmptyWeaponAmmoLoadout,
  createWeaponAmmoLoadoutsFromRows,
  findNextFilledEquipmentCell,
  getActiveAmmoType,
  normalizeWeaponAmmoLoadout,
} from '../lib/equipmentRows'
import type {
  AmmoType,
  CalcInput,
  DamageProjection,
  EquipmentCell,
  EquipmentRow,
  EquipmentSlot,
  PlayerBars,
  PlayerSelection,
  PlayerSnapshot,
  RuntimeConfig,
  WeaponAmmoLoadout,
} from '../types'

interface SelectionProjectionArgs {
  battleBonusPct: number
  barsOverride?: Partial<PlayerBars>
  config: RuntimeConfig
  foodRestorePct: number
  pillAttackBonusPct: number
  selection: PlayerSelection
}

export interface SelectionProjectionResult {
  openingInput: CalcInput
  openingProjection: DamageProjection
  projection: DamageProjection
}

type ActiveEquipmentMap = Record<EquipmentSlot, EquipmentCell | null>
type EquipmentTracker = {
  cell: EquipmentCell
  rowIndex: number
  remainingState: number
} | null
type WeaponAmmoTracker = {
  rowIndex: number
  remainingLoadout: WeaponAmmoLoadout
} | null

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}

function applySoftCap(rawValue: number, softCap: number): number {
  if (rawValue <= 0) {
    return 0
  }

  if (softCap <= 0) {
    return rawValue
  }

  return (rawValue * 100) / (rawValue + softCap)
}

function getCellSkillValue(
  cell: EquipmentCell | null,
  key: keyof NonNullable<EquipmentCell['skills']>,
): number {
  return cell?.skills[key] ?? 0
}

function getOpeningActiveEquipment(rows: EquipmentRow[]): ActiveEquipmentMap {
  return EQUIPMENT_SLOTS.reduce<ActiveEquipmentMap>((accumulator, slot) => {
    accumulator[slot] = findNextFilledEquipmentCell(rows, slot)?.cell ?? null
    return accumulator
  }, {
    weapon: null,
    helmet: null,
    chest: null,
    pants: null,
    boots: null,
    gloves: null,
  })
}

function buildTrackers(rows: EquipmentRow[]): Record<EquipmentSlot, EquipmentTracker> {
  return EQUIPMENT_SLOTS.reduce<Record<EquipmentSlot, EquipmentTracker>>(
    (accumulator, slot) => {
      const found = findNextFilledEquipmentCell(rows, slot)
      accumulator[slot] = found
        ? {
            cell: found.cell,
            rowIndex: found.rowIndex,
            remainingState: found.cell.state,
          }
        : null
      return accumulator
    },
    {
      weapon: null,
      helmet: null,
      chest: null,
      pants: null,
      boots: null,
      gloves: null,
    },
  )
}

function buildActiveEquipmentFromTrackers(
  trackers: Record<EquipmentSlot, EquipmentTracker>,
): ActiveEquipmentMap {
  return EQUIPMENT_SLOTS.reduce<ActiveEquipmentMap>((accumulator, slot) => {
    accumulator[slot] = trackers[slot]?.cell ?? null
    return accumulator
  }, {
    weapon: null,
    helmet: null,
    chest: null,
    pants: null,
    boots: null,
    gloves: null,
  })
}

function buildBars(
  snapshot: PlayerSelection['snapshot'],
  barsOverride?: Partial<PlayerBars>,
): PlayerBars {
  return {
    currentHealth: barsOverride?.currentHealth ?? snapshot.currentHealth,
    maxHealth: barsOverride?.maxHealth ?? snapshot.maxHealth,
    currentHunger: barsOverride?.currentHunger ?? snapshot.currentHunger,
    maxHunger: barsOverride?.maxHunger ?? snapshot.maxHunger,
    healthHourlyRegen:
      barsOverride?.healthHourlyRegen ?? snapshot.healthHourlyRegen,
    hungerHourlyRegen:
      barsOverride?.hungerHourlyRegen ?? snapshot.hungerHourlyRegen,
  }
}

function buildLiveCalcInput(
  snapshot: PlayerSnapshot,
  activeEquipment: ActiveEquipmentMap,
  ammoType: AmmoType,
  args: SelectionProjectionArgs,
): CalcInput {
  const bars = buildBars(snapshot, args.barsOverride)
  const precisionRaw =
    snapshot.liveCombatBase.precisionBaseValue +
    getCellSkillValue(activeEquipment.gloves, 'precision')
  const precisionPct = Math.min(100, precisionRaw)
  const precisionOverflowPoints = Math.max(0, precisionRaw - 100)
  const attackOverflow =
    precisionOverflowPoints * args.config.combatRules.precisionOverflowValue

  const criticalChanceRaw =
    snapshot.liveCombatBase.criticalChanceBaseValue +
    getCellSkillValue(activeEquipment.weapon, 'criticalChance')
  const criticalChancePct = Math.min(100, criticalChanceRaw)
  const criticalChanceOverflowPoints = Math.max(0, criticalChanceRaw - 100)
  const criticalChanceOverflow =
    criticalChanceOverflowPoints *
    args.config.combatRules.criticalChanceOverflowValue

  const critDamagePct =
    snapshot.liveCombatBase.critDamageBaseValue +
    getCellSkillValue(activeEquipment.helmet, 'criticalDamages') +
    criticalChanceOverflow

  const attackPreAmmo =
    (snapshot.liveCombatBase.attackBaseValue +
      getCellSkillValue(activeEquipment.weapon, 'attack') +
      attackOverflow) *
    snapshot.liveCombatBase.attackPercentMultiplier

  const armorRaw =
    snapshot.liveCombatBase.armorBaseValue +
    getCellSkillValue(activeEquipment.chest, 'armor') +
    getCellSkillValue(activeEquipment.pants, 'armor')
  const dodgeRaw =
    snapshot.liveCombatBase.dodgeBaseValue +
    getCellSkillValue(activeEquipment.boots, 'dodge')

  return {
    ...bars,
    id: snapshot.id,
    username: snapshot.username,
    attackPreAmmo,
    detectedAttackModifierPct: snapshot.detectedAttackModifierPct,
    precisionPct,
    criticalChancePct,
    critDamagePct,
    armorPct: applySoftCap(armorRaw, args.config.combatRules.armorSoftCap),
    dodgePct: applySoftCap(dodgeRaw, args.config.combatRules.dodgeSoftCap),
    battleBonusPct: args.battleBonusPct,
    ammoType,
    pillAttackBonusPct: args.pillAttackBonusPct,
    foodRestorePct: args.foodRestorePct,
  }
}

function buildWeaponAmmoTracker(
  weaponAmmoLoadouts: WeaponAmmoLoadout[],
  weaponTracker: EquipmentTracker,
): WeaponAmmoTracker {
  if (!weaponTracker) {
    return null
  }

  return {
    rowIndex: weaponTracker.rowIndex,
    remainingLoadout: normalizeWeaponAmmoLoadout(
      weaponAmmoLoadouts[weaponTracker.rowIndex] ?? createEmptyWeaponAmmoLoadout(),
      weaponTracker.cell.state,
    ),
  }
}

function calculateLiveEquipmentProjection(
  rows: EquipmentRow[],
  weaponAmmoLoadouts: WeaponAmmoLoadout[],
  args: SelectionProjectionArgs,
  snapshot: PlayerSnapshot,
): SelectionProjectionResult {
  const openingEquipment = getOpeningActiveEquipment(rows)
  const trackers = buildTrackers(rows)
  let weaponAmmoTracker = buildWeaponAmmoTracker(
    weaponAmmoLoadouts,
    trackers.weapon,
  )
  const openingAmmoType = weaponAmmoTracker
    ? getActiveAmmoType(weaponAmmoTracker.remainingLoadout)
    : 'none'
  const openingInput = buildLiveCalcInput(
    snapshot,
    openingEquipment,
    openingAmmoType,
    args,
  )
  const openingProjection = calculatePlayerProjection(openingInput)
  let remainingHealthPool = openingProjection.effectiveHealthPool
  let totalDamage = 0
  let totalAttempts = 0

  while (remainingHealthPool >= MINIMUM_BATTLE_HEALTH) {
    const activeEquipment = buildActiveEquipmentFromTrackers(trackers)
    const activeAmmoType = weaponAmmoTracker
      ? getActiveAmmoType(weaponAmmoTracker.remainingLoadout)
      : 'none'
    const phaseInput = buildLiveCalcInput(
      snapshot,
      activeEquipment,
      activeAmmoType,
      args,
    )
    const phaseProjection = calculatePlayerProjection(phaseInput)
    const expectedHpLossPerAttempt = phaseProjection.expectedHpLossPerAttempt

    if (expectedHpLossPerAttempt <= 0) {
      break
    }

    const healthLimitedAttempts = Math.floor(
      remainingHealthPool / expectedHpLossPerAttempt,
    )

    if (healthLimitedAttempts <= 0) {
      break
    }

    const dodgeChance = clampPercent(phaseInput.dodgePct) / 100
    const attemptsUntilEquipmentBreak = EQUIPMENT_SLOTS.flatMap((slot) => {
      const tracker = trackers[slot]
      if (!tracker) {
        return []
      }

      const wearRate = slot === 'weapon' ? 1 : 1 - dodgeChance
      if (wearRate <= 0) {
        return []
      }

      return [Math.ceil(tracker.remainingState / wearRate)]
    })
    const attemptsUntilAmmoBreak =
      weaponAmmoTracker && activeAmmoType !== 'none'
        ? [weaponAmmoTracker.remainingLoadout[activeAmmoType]]
        : []

    const phaseAttempts = Math.min(
      healthLimitedAttempts,
      ...(attemptsUntilEquipmentBreak.length > 0
        ? attemptsUntilEquipmentBreak
        : [healthLimitedAttempts]),
      ...(attemptsUntilAmmoBreak.length > 0
        ? attemptsUntilAmmoBreak
        : [healthLimitedAttempts]),
    )

    if (phaseAttempts <= 0) {
      break
    }

    totalAttempts += phaseAttempts
    totalDamage += phaseAttempts * phaseProjection.expectedDamagePerAttempt
    remainingHealthPool -= phaseAttempts * expectedHpLossPerAttempt

    if (weaponAmmoTracker && activeAmmoType !== 'none') {
      weaponAmmoTracker.remainingLoadout[activeAmmoType] = Math.max(
        0,
        weaponAmmoTracker.remainingLoadout[activeAmmoType] - phaseAttempts,
      )
    }

    for (const slot of EQUIPMENT_SLOTS) {
      const tracker = trackers[slot]
      if (!tracker) {
        continue
      }

      const wearRate = slot === 'weapon' ? 1 : 1 - dodgeChance
      tracker.remainingState -= phaseAttempts * wearRate

      if (tracker.remainingState > 0) {
        continue
      }

      const replacement = findNextFilledEquipmentCell(rows, slot, tracker.rowIndex + 1)
      trackers[slot] = replacement
        ? {
            cell: replacement.cell,
            rowIndex: replacement.rowIndex,
            remainingState: replacement.cell.state,
          }
        : null

      if (slot === 'weapon') {
        weaponAmmoTracker = buildWeaponAmmoTracker(
          weaponAmmoLoadouts,
          trackers.weapon,
        )
      }
    }
  }

  return {
    openingInput,
    openingProjection,
    projection: {
      ...openingProjection,
      estimatedAttempts: totalAttempts,
      totalDamage,
    },
  }
}

export function calculateSelectionProjection(
  args: SelectionProjectionArgs,
): SelectionProjectionResult {
  const { selection } = args
  const openingInput = {
    ...buildCalcInput(
      selection,
      args.battleBonusPct,
      args.foodRestorePct,
      args.pillAttackBonusPct,
    ),
    ...buildBars(selection.snapshot, args.barsOverride),
  }

  if (
    selection.snapshot.source !== 'live' ||
    !selection.equipmentRows ||
    selection.equipmentRows.length === 0
  ) {
    const openingProjection = calculatePlayerProjection(openingInput)
    return {
      openingInput,
      openingProjection,
      projection: openingProjection,
    }
  }

  const weaponAmmoLoadouts =
    selection.weaponAmmoLoadouts ??
    createWeaponAmmoLoadoutsFromRows(
      selection.equipmentRows,
      selection.snapshot.currentAmmoType,
    )

  return calculateLiveEquipmentProjection(
    selection.equipmentRows,
    weaponAmmoLoadouts,
    args,
    selection.snapshot,
  )
}
