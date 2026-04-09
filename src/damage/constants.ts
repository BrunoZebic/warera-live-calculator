import type { AmmoType, FoodType } from '../types'

export const AMMO_BONUS_PCT: Record<AmmoType, number> = {
  none: 0,
  lightAmmo: 10,
  ammo: 20,
  heavyAmmo: 40,
}

export const MINIMUM_BATTLE_HEALTH = 10
export const BASE_HP_COST_PER_ATTEMPT = 10
export const MISS_DAMAGE_MULTIPLIER = 0.5

export const FOOD_LABELS: Record<FoodType, string> = {
  none: 'No food',
  bread: 'Bread',
  steak: 'Steak',
  cookedFish: 'Cooked Fish',
}

export const AMMO_LABELS: Record<AmmoType, string> = {
  none: 'No ammo',
  lightAmmo: 'Light Ammo',
  ammo: 'Ammo',
  heavyAmmo: 'Heavy Ammo',
}
