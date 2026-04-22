import type { PlayerBars, RuntimeConfig } from '../types'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeProjectionHours(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

export function projectFutureBars(
  bars: PlayerBars,
  prepHours: number,
  config: RuntimeConfig,
): PlayerBars {
  void config
  const boundedHours = normalizeProjectionHours(prepHours)

  return {
    ...bars,
    currentHealth: clamp(
      bars.currentHealth + bars.healthHourlyRegen * boundedHours,
      0,
      bars.maxHealth,
    ),
    currentHunger: clamp(
      bars.currentHunger + bars.hungerHourlyRegen * boundedHours,
      0,
      bars.maxHunger,
    ),
  }
}

export function projectFutureBarsAdditive(
  bars: PlayerBars,
  prepHours: number,
  followupRecoveryHours: number,
  config: RuntimeConfig,
): PlayerBars {
  const prepBars = projectFutureBars(bars, prepHours, config)
  const boundedFollowupRecoveryHours = normalizeProjectionHours(
    followupRecoveryHours,
  )

  return {
    ...prepBars,
    currentHealth: Math.max(
      0,
      prepBars.currentHealth +
        prepBars.healthHourlyRegen * boundedFollowupRecoveryHours,
    ),
    currentHunger: Math.max(
      0,
      prepBars.currentHunger +
        prepBars.hungerHourlyRegen * boundedFollowupRecoveryHours,
    ),
  }
}
