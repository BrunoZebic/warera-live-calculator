import {
  AMMO_BONUS_PCT,
  BASE_HP_COST_PER_ATTEMPT,
  MINIMUM_BATTLE_HEALTH,
  MISS_DAMAGE_MULTIPLIER,
} from './constants'

import type {
  CalcInput,
  DamageProjection,
  GroupProjection,
  PlayerSelection,
} from '../types'

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}

function getAttackModifierMultiplier(value: number): number {
  return Math.max(0, 1 + value / 100)
}

/**
 * `hitChance` is the normalized form of Precision.
 * `missChance = 1 - hitChance`.
 * `critChance` is the normalized form of Critical Chance.
 */
export function calculatePlayerProjection(input: CalcInput): DamageProjection {
  const hitChance = clampPercent(input.precisionPct) / 100
  const missChance = 1 - hitChance
  const critChance = clampPercent(input.criticalChancePct) / 100
  const dodgeChance = clampPercent(input.dodgePct) / 100
  const armorPct = clampPercent(input.armorPct)
  const battleMultiplier = 1 + input.battleBonusPct / 100
  const detectedAttackModifierMultiplier = getAttackModifierMultiplier(
    input.detectedAttackModifierPct,
  )
  const attackBeforePillAndAmmo =
    detectedAttackModifierMultiplier > 0
      ? input.attackPreAmmo / detectedAttackModifierMultiplier
      : 0
  const attackWithSelectedModifiers =
    attackBeforePillAndAmmo *
    getAttackModifierMultiplier(input.pillAttackBonusPct) *
    (1 + AMMO_BONUS_PCT[input.ammoType] / 100)

  const normalHit = attackWithSelectedModifiers * battleMultiplier
  const critHit =
    attackWithSelectedModifiers *
    (1 + input.critDamagePct / 100) *
    battleMultiplier
  const missHit =
    attackWithSelectedModifiers * MISS_DAMAGE_MULTIPLIER * battleMultiplier

  const expectedDamagePerAttempt =
    missChance * missHit +
    hitChance * (1 - critChance) * normalHit +
    hitChance * critChance * critHit

  const armorReducedCost = Math.max(
    1,
    BASE_HP_COST_PER_ATTEMPT * (1 - armorPct / 100),
  )
  const expectedHpLossPerAttempt = (1 - dodgeChance) * armorReducedCost
  const foodUsesAvailable = Math.max(0, Math.floor(input.currentHunger))
  const foodRestoreAmount = input.maxHealth * (input.foodRestorePct / 100)
  const recoverableHpFromHunger = foodUsesAvailable * foodRestoreAmount
  const effectiveHealthPool = input.currentHealth + recoverableHpFromHunger
  const estimatedAttempts =
    effectiveHealthPool >= MINIMUM_BATTLE_HEALTH && expectedHpLossPerAttempt > 0
      ? Math.floor(effectiveHealthPool / expectedHpLossPerAttempt)
      : 0

  return {
    attackWithSelectedModifiers,
    battleMultiplier,
    expectedDamagePerAttempt,
    expectedHpLossPerAttempt,
    foodUsesAvailable,
    foodRestoreAmount,
    recoverableHpFromHunger,
    effectiveHealthPool,
    estimatedAttempts,
    totalDamage: estimatedAttempts * expectedDamagePerAttempt,
  }
}

export function calculateGroupProjection(
  players: CalcInput[],
): GroupProjection {
  if (players.length === 0) {
    return {
      totalDamage: 0,
      totalAttempts: 0,
      playerCount: 0,
      averageDamage: 0,
    }
  }

  let totalDamage = 0
  let totalAttempts = 0

  for (const player of players) {
    const projection = calculatePlayerProjection(player)
    totalDamage += projection.totalDamage
    totalAttempts += projection.estimatedAttempts
  }

  return {
    totalDamage,
    totalAttempts,
    playerCount: players.length,
    averageDamage: totalDamage / players.length,
  }
}

export function buildCalcInput(
  selection: PlayerSelection,
  battleBonusPct: number,
  foodRestorePct: number,
  pillAttackBonusPct: number,
): CalcInput {
  const { snapshot } = selection

  return {
    id: snapshot.id,
    username: snapshot.username,
    currentHealth: snapshot.currentHealth,
    maxHealth: snapshot.maxHealth,
    currentHunger: snapshot.currentHunger,
    maxHunger: snapshot.maxHunger,
    healthHourlyRegen: snapshot.healthHourlyRegen,
    hungerHourlyRegen: snapshot.hungerHourlyRegen,
    attackPreAmmo: snapshot.attackPreAmmo,
    detectedAttackModifierPct: snapshot.detectedAttackModifierPct,
    precisionPct: snapshot.precisionPct,
    criticalChancePct: snapshot.criticalChancePct,
    critDamagePct: snapshot.critDamagePct,
    armorPct: snapshot.armorPct,
    dodgePct: snapshot.dodgePct,
    battleBonusPct,
    ammoType: selection.ammoType,
    pillAttackBonusPct,
    foodRestorePct,
  }
}
