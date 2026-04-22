import type {
  AttackModifierMode,
  FoodInventory,
  FoodType,
  ItemRarity,
  PlayerSelection,
  PlayerSnapshot,
  RuntimeConfig,
} from '../types'
import {
  snapshotToEquipmentRows,
  snapshotToWeaponAmmoLoadouts,
} from './equipmentRows'

const ARMOR_RARITY_BY_TIER: Record<string, ItemRarity> = {
  '1': 'common',
  '2': 'uncommon',
  '3': 'rare',
  '4': 'epic',
  '5': 'legendary',
  '6': 'mythic',
}

const WEAPON_RARITY_BY_CODE: Record<string, ItemRarity> = {
  knife: 'common',
  gun: 'uncommon',
  rifle: 'rare',
  sniper: 'epic',
  tank: 'legendary',
  jet: 'mythic',
}

export const FOOD_ORDER: Array<keyof FoodInventory> = [
  'cookedFish',
  'steak',
  'bread',
]

export function createEmptyFoodInventory(): FoodInventory {
  return {
    bread: 0,
    steak: 0,
    cookedFish: 0,
  }
}

export function createSelection(snapshot: PlayerSnapshot): PlayerSelection {
  return {
    key: `${snapshot.source}-${snapshot.id}`,
    snapshot,
    ammoType: snapshot.currentAmmoType,
    foodType: 'none',
    foodInventory: createEmptyFoodInventory(),
    attackModifier:
      snapshot.detectedAttackModifierPct > 0
        ? 'buff'
        : snapshot.detectedAttackModifierPct < 0
          ? 'debuff'
          : 'none',
    equipmentRows: snapshotToEquipmentRows(snapshot),
    weaponAmmoLoadouts: snapshotToWeaponAmmoLoadouts(snapshot),
  }
}

export function mergeSelectionWithSnapshot(
  current: PlayerSelection,
  snapshot: PlayerSnapshot,
): PlayerSelection {
  const nextSelection = createSelection(snapshot)

  if (current.snapshot.id !== snapshot.id) {
    return nextSelection
  }

  return {
    ...nextSelection,
    ammoType: current.ammoType,
    foodType: current.foodType,
    foodInventory: current.foodInventory,
    attackModifier: current.attackModifier,
    liveSkillOverrides: current.liveSkillOverrides,
    equipmentRows: current.equipmentRows,
    weaponAmmoLoadouts: current.weaponAmmoLoadouts,
  }
}

export function getFoodRestorePct(
  foodType: FoodType,
  config: RuntimeConfig,
): number {
  switch (foodType) {
    case 'bread':
      return config.foodRestorePct.bread
    case 'steak':
      return config.foodRestorePct.steak
    case 'cookedFish':
      return config.foodRestorePct.cookedFish
    default:
      return 0
  }
}

export function normalizeFoodInventory(
  foodInventory?: FoodInventory,
): FoodInventory {
  const current = foodInventory ?? createEmptyFoodInventory()

  return {
    bread: Math.max(0, Math.floor(current.bread || 0)),
    steak: Math.max(0, Math.floor(current.steak || 0)),
    cookedFish: Math.max(0, Math.floor(current.cookedFish || 0)),
  }
}

export function getMaxFoodUses(currentHunger: number): number {
  return Math.max(0, Math.floor(currentHunger))
}

export function calculateFoodRecovery(
  foodInventory: FoodInventory | undefined,
  currentHunger: number,
  maxHealth: number,
  config: RuntimeConfig,
): {
  consumedFood: FoodInventory
  foodUsesAvailable: number
  recoverableHpFromFood: number
} {
  const normalizedInventory = normalizeFoodInventory(foodInventory)
  const consumedFood = createEmptyFoodInventory()
  let remainingUses = getMaxFoodUses(currentHunger)
  let consumedUses = 0
  let recoverableHpFromFood = 0

  for (const foodType of FOOD_ORDER) {
    if (remainingUses <= 0) {
      break
    }

    const availableCount = normalizedInventory[foodType]
    const consumedCount = Math.min(remainingUses, availableCount)
    if (consumedCount <= 0) {
      continue
    }

    consumedFood[foodType] += consumedCount
    consumedUses += consumedCount
    recoverableHpFromFood +=
      consumedCount * maxHealth * (getFoodRestorePct(foodType, config) / 100)
    remainingUses -= consumedCount
  }

  return {
    consumedFood,
    foodUsesAvailable: consumedUses,
    recoverableHpFromFood,
  }
}

export function getAttackModifierPct(
  mode: AttackModifierMode,
  selection: PlayerSelection,
  config: RuntimeConfig,
): number {
  if (mode === 'none') {
    return 0
  }

  if (mode === 'buff') {
    return selection.snapshot.detectedAttackModifierPct > 0
      ? selection.snapshot.detectedAttackModifierPct
      : config.pillAttackBonusPct
  }

  return selection.snapshot.detectedAttackModifierPct < 0
    ? selection.snapshot.detectedAttackModifierPct
    : -config.pillAttackBonusPct
}

export function getSelectedPillAttackPct(
  selection: PlayerSelection,
  config: RuntimeConfig,
): number {
  return getAttackModifierPct(selection.attackModifier, selection, config)
}

export function getItemRarity(code: string, config: RuntimeConfig): ItemRarity {
  const configRarity = config.itemMetaByCode[code]?.rarity
  if (configRarity && configRarity !== 'unknown') {
    return configRarity
  }

  const weaponRarity = WEAPON_RARITY_BY_CODE[code]
  if (weaponRarity) {
    return weaponRarity
  }

  const armorMatch = code.match(/(?:helmet|chest|pants|boots|gloves)(\d)$/)
  if (armorMatch) {
    return ARMOR_RARITY_BY_TIER[armorMatch[1]] ?? 'unknown'
  }

  return 'unknown'
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en', {
    maximumFractionDigits: value >= 1000 ? 1 : 2,
    notation: value >= 1000 ? 'compact' : 'standard',
  }).format(value)
}

export function formatPreciseNumber(value: number): string {
  return new Intl.NumberFormat('en', {
    maximumFractionDigits: 2,
  }).format(value)
}
