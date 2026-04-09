import type {
  CalculatorSnapshot,
  FoodType,
  ItemRarity,
  ManualPlayerSnapshot,
  PlayerSelection,
  RuntimeConfig,
} from '../types'

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

export function createManualPlayer(
  config: RuntimeConfig,
  label = 'Manual player',
): ManualPlayerSnapshot {
  return {
    source: 'manual',
    id: `manual-${crypto.randomUUID()}`,
    username: label,
    currentHealth: config.defaultBars.maxHealth,
    maxHealth: config.defaultBars.maxHealth,
    currentHunger: config.defaultBars.maxHunger,
    maxHunger: config.defaultBars.maxHunger,
    healthHourlyRegen: config.defaultBars.healthHourlyRegen,
    hungerHourlyRegen: config.defaultBars.hungerHourlyRegen,
    attackPreAmmo: config.defaultCombat.attackPreAmmo,
    detectedPillAttackPct: 0,
    precisionPct: config.defaultCombat.precisionPct,
    criticalChancePct: config.defaultCombat.criticalChancePct,
    critDamagePct: config.defaultCombat.critDamagePct,
    armorPct: config.defaultCombat.armorPct,
    dodgePct: config.defaultCombat.dodgePct,
    currentAmmoType: 'none',
    weaponCode: '',
  }
}

export function createSelection(snapshot: CalculatorSnapshot): PlayerSelection {
  return {
    key: `${snapshot.source}-${snapshot.id}`,
    snapshot,
    ammoType: snapshot.currentAmmoType,
    foodType: 'none',
    pillActive: snapshot.detectedPillAttackPct > 0,
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

export function getSelectedPillAttackPct(
  selection: PlayerSelection,
  config: RuntimeConfig,
): number {
  if (!selection.pillActive) {
    return 0
  }

  return selection.snapshot.detectedPillAttackPct > 0
    ? selection.snapshot.detectedPillAttackPct
    : config.pillAttackBonusPct
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

export function updateSnapshot(
  snapshot: CalculatorSnapshot,
  patch: Partial<CalculatorSnapshot>,
): CalculatorSnapshot {
  return {
    ...snapshot,
    ...patch,
  } as CalculatorSnapshot
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
