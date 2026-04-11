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
  const effectiveHealthPool = input.currentHealth + input.recoverableHpFromFood
  const estimatedAttempts =
    effectiveHealthPool >= MINIMUM_BATTLE_HEALTH && expectedHpLossPerAttempt > 0
      ? Math.floor(effectiveHealthPool / expectedHpLossPerAttempt)
      : 0

  return {
    attackWithSelectedModifiers,
    battleMultiplier,
    expectedDamagePerAttempt,
    expectedHpLossPerAttempt,
    foodUsesAvailable: input.foodUsesAvailable,
    recoverableHpFromFood: input.recoverableHpFromFood,
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
