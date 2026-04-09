import type { PlayerBars, RuntimeConfig } from '../types'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function projectFutureBars(
  bars: PlayerBars,
  hoursAhead: number,
  config: RuntimeConfig,
): PlayerBars {
  void config
  const boundedHours = Math.max(0, hoursAhead)

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
