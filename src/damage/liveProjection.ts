import { MINIMUM_BATTLE_HEALTH } from './constants'
import { calculatePlayerProjection } from './formula'
import {
  EQUIPMENT_SLOTS,
  createEmptyWeaponAmmoLoadout,
  createWeaponAmmoLoadoutsFromRows,
  findNextFilledEquipmentCell,
  getActiveAmmoType,
  normalizeWeaponAmmoLoadout,
} from '../lib/equipmentRows'
import { calculateFoodRecovery, createEmptyFoodInventory } from '../lib/players'
import type {
  AmmoType,
  CalcInput,
  DamageProjection,
  EquipmentCell,
  EquipmentUsageRecord,
  EquipmentRow,
  EquipmentSlot,
  PlayerBars,
  PlayerSelection,
  PlayerSnapshot,
  ProjectionAmmoUsage,
  ProjectionResourceUsage,
  RuntimeConfig,
  WeaponAmmoLoadout,
} from '../types'

interface SelectionProjectionArgs {
  battleBonusPct: number
  barsOverride?: Partial<PlayerBars>
  config: RuntimeConfig
  pillAttackBonusPct: number
  selection: PlayerSelection
}

export interface SelectionProjectionResult {
  openingInput: CalcInput
  openingProjection: DamageProjection
  projection: DamageProjection
  resourceUsage: ProjectionResourceUsage
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
type CalcInputBuildResult = {
  consumedFood: ReturnType<typeof createEmptyFoodInventory>
  input: CalcInput
}

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

function createEmptyAmmoUsage(): ProjectionAmmoUsage {
  return {
    lightAmmo: 0,
    ammo: 0,
    heavyAmmo: 0,
  }
}

function createEmptyResourceUsage(
  selection: PlayerSelection,
): ProjectionResourceUsage {
  return {
    ammoUsed: createEmptyAmmoUsage(),
    foodUsed: createEmptyFoodInventory(),
    pillCount: selection.attackModifier === 'buff' ? 1 : 0,
    equipmentUsed: [],
  }
}

function buildEquipmentUsageItemId(
  selectionKey: string,
  rowIndex: number,
  slot: EquipmentSlot,
  cell: EquipmentCell,
): string {
  const skillSignature = Object.entries(cell.skills)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}`)
    .join('|')

  return `${selectionKey}:${rowIndex}:${slot}:${cell.code}:${cell.maxState}:${skillSignature}`
}

function recordEquipmentUsage(
  usageByItemId: Map<string, EquipmentUsageRecord>,
  selectionKey: string,
  slot: EquipmentSlot,
  tracker: NonNullable<EquipmentTracker>,
  durabilityUsed: number,
) {
  if (durabilityUsed <= 0) {
    return
  }

  const itemId = buildEquipmentUsageItemId(
    selectionKey,
    tracker.rowIndex,
    slot,
    tracker.cell,
  )
  const current = usageByItemId.get(itemId)

  if (current) {
    current.durabilityUsed += durabilityUsed
    return
  }

  usageByItemId.set(itemId, {
    itemId,
    selectionKey,
    rowIndex: tracker.rowIndex,
    slot,
    code: tracker.cell.code,
    skills: { ...tracker.cell.skills },
    state: tracker.cell.state,
    maxState: tracker.cell.maxState,
    durabilityUsed,
  })
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

function getEffectiveLiveCombatBaseStats(
  selection: PlayerSelection,
  snapshot: PlayerSnapshot,
) {
  const overrides = selection.liveBaseSkillOverrides

  return {
    ...snapshot.liveCombatBase,
    attackBaseValue:
      overrides?.attackBaseValue ?? snapshot.liveCombatBase.attackBaseValue,
    precisionBaseValue:
      overrides?.precisionBaseValue ?? snapshot.liveCombatBase.precisionBaseValue,
    criticalChanceBaseValue:
      overrides?.criticalChanceBaseValue ??
      snapshot.liveCombatBase.criticalChanceBaseValue,
    critDamageBaseValue:
      overrides?.critDamageBaseValue ?? snapshot.liveCombatBase.critDamageBaseValue,
    armorBaseValue:
      overrides?.armorBaseValue ?? snapshot.liveCombatBase.armorBaseValue,
    dodgeBaseValue:
      overrides?.dodgeBaseValue ?? snapshot.liveCombatBase.dodgeBaseValue,
  }
}

function buildLiveCalcInput(
  snapshot: PlayerSnapshot,
  activeEquipment: ActiveEquipmentMap,
  ammoType: AmmoType,
  bars: PlayerBars,
  args: SelectionProjectionArgs,
): CalcInputBuildResult {
  const liveCombatBase = getEffectiveLiveCombatBaseStats(args.selection, snapshot)
  const precisionRaw =
    liveCombatBase.precisionBaseValue +
    getCellSkillValue(activeEquipment.gloves, 'precision')
  const precisionPct = Math.min(100, precisionRaw)
  const precisionOverflowPoints = Math.max(0, precisionRaw - 100)
  const attackOverflow =
    precisionOverflowPoints * args.config.combatRules.precisionOverflowValue

  const criticalChanceRaw =
    liveCombatBase.criticalChanceBaseValue +
    getCellSkillValue(activeEquipment.weapon, 'criticalChance')
  const criticalChancePct = Math.min(100, criticalChanceRaw)
  const criticalChanceOverflowPoints = Math.max(0, criticalChanceRaw - 100)
  const criticalChanceOverflow =
    criticalChanceOverflowPoints *
    args.config.combatRules.criticalChanceOverflowValue

  const critDamagePct =
    liveCombatBase.critDamageBaseValue +
    getCellSkillValue(activeEquipment.helmet, 'criticalDamages') +
    criticalChanceOverflow

  const attackPreAmmo =
    (liveCombatBase.attackBaseValue +
      getCellSkillValue(activeEquipment.weapon, 'attack') +
      attackOverflow) *
    liveCombatBase.attackPercentMultiplier

  const armorRaw =
    liveCombatBase.armorBaseValue +
    getCellSkillValue(activeEquipment.chest, 'armor') +
    getCellSkillValue(activeEquipment.pants, 'armor')
  const dodgeRaw =
    liveCombatBase.dodgeBaseValue +
    getCellSkillValue(activeEquipment.boots, 'dodge')
  const foodRecovery = calculateFoodRecovery(
    args.selection.foodInventory,
    bars.currentHunger,
    bars.maxHealth,
    args.config,
  )

  return {
    consumedFood: foodRecovery.consumedFood,
    input: {
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
      foodUsesAvailable: foodRecovery.foodUsesAvailable,
      recoverableHpFromFood: foodRecovery.recoverableHpFromFood,
    },
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
  const equipmentUsageByItemId = new Map<string, EquipmentUsageRecord>()
  let weaponAmmoTracker = buildWeaponAmmoTracker(
    weaponAmmoLoadouts,
    trackers.weapon,
  )
  const openingAmmoType = weaponAmmoTracker
    ? getActiveAmmoType(weaponAmmoTracker.remainingLoadout)
    : 'none'
  const openingBars = buildBars(snapshot, args.barsOverride)
  const openingBuild = buildLiveCalcInput(
    snapshot,
    openingEquipment,
    openingAmmoType,
    openingBars,
    args,
  )
  const openingInput = openingBuild.input
  const openingProjection = calculatePlayerProjection(openingInput)
  const resourceUsage = createEmptyResourceUsage(args.selection)
  resourceUsage.foodUsed = openingBuild.consumedFood
  let remainingHealthPool = openingProjection.effectiveHealthPool
  let totalDamage = 0
  let totalAttempts = 0

  while (remainingHealthPool >= MINIMUM_BATTLE_HEALTH) {
    const activeEquipment = buildActiveEquipmentFromTrackers(trackers)
    const activeAmmoType = weaponAmmoTracker
      ? getActiveAmmoType(weaponAmmoTracker.remainingLoadout)
      : 'none'
    const phaseBars = buildBars(snapshot, args.barsOverride)
    const phaseBuild = buildLiveCalcInput(
      snapshot,
      activeEquipment,
      activeAmmoType,
      phaseBars,
      args,
    )
    const phaseInput = phaseBuild.input
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
      resourceUsage.ammoUsed[activeAmmoType] += phaseAttempts
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
      const durabilityUsed = Math.min(
        tracker.remainingState,
        phaseAttempts * wearRate,
      )
      recordEquipmentUsage(
        equipmentUsageByItemId,
        args.selection.key,
        slot,
        tracker,
        durabilityUsed,
      )
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
    resourceUsage: {
      ...resourceUsage,
      equipmentUsed: [...equipmentUsageByItemId.values()],
    },
  }
}

export function calculateSelectionProjection(
  args: SelectionProjectionArgs,
): SelectionProjectionResult {
  const { selection } = args
  const bars = buildBars(selection.snapshot, args.barsOverride)
  const foodRecovery = calculateFoodRecovery(
    selection.foodInventory,
    bars.currentHunger,
    bars.maxHealth,
    args.config,
  )
  const openingInput: CalcInput = {
    ...bars,
    id: selection.snapshot.id,
    username: selection.snapshot.username,
    attackPreAmmo: selection.snapshot.attackPreAmmo,
    detectedAttackModifierPct: selection.snapshot.detectedAttackModifierPct,
    precisionPct: selection.snapshot.precisionPct,
    criticalChancePct: selection.snapshot.criticalChancePct,
    critDamagePct: selection.snapshot.critDamagePct,
    armorPct: selection.snapshot.armorPct,
    dodgePct: selection.snapshot.dodgePct,
    battleBonusPct: args.battleBonusPct,
    ammoType: selection.ammoType,
    pillAttackBonusPct: args.pillAttackBonusPct,
    foodUsesAvailable: foodRecovery.foodUsesAvailable,
    recoverableHpFromFood: foodRecovery.recoverableHpFromFood,
  }
  const resourceUsage = createEmptyResourceUsage(selection)
  resourceUsage.foodUsed = foodRecovery.consumedFood

  if (
    selection.snapshot.source !== 'live' ||
    !selection.equipmentRows ||
    selection.equipmentRows.length === 0
  ) {
    const openingProjection = calculatePlayerProjection(openingInput)

    if (selection.ammoType !== 'none') {
      resourceUsage.ammoUsed[selection.ammoType] = openingProjection.estimatedAttempts
    }

    return {
      openingInput,
      openingProjection,
      projection: openingProjection,
      resourceUsage,
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
