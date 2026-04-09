export type AppMode = 'solo' | 'group'

export type AmmoType = 'none' | 'lightAmmo' | 'ammo' | 'heavyAmmo'

export type FoodType = 'none' | 'bread' | 'steak' | 'cookedFish'

export type ItemRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic'
  | 'unknown'

export interface PlayerBars {
  currentHealth: number
  maxHealth: number
  currentHunger: number
  maxHunger: number
  healthHourlyRegen: number
  hungerHourlyRegen: number
}

export interface EquipmentSummary {
  slot: 'weapon' | 'helmet' | 'chest' | 'pants' | 'boots' | 'gloves'
  code: string
  state: number
  maxState: number
  skills: Record<string, number>
}

export interface SnapshotBase extends PlayerBars {
  id: string
  username: string
  attackPreAmmo: number
  detectedPillAttackPct: number
  precisionPct: number
  criticalChancePct: number
  /**
   * Bonus crit damage percent.
   * `50` means crits deal `1.5x` base attack and `100` means `2.0x`.
   */
  critDamagePct: number
  armorPct: number
  dodgePct: number
  currentAmmoType: AmmoType
  weaponCode?: string
}

export interface PlayerSnapshot extends SnapshotBase {
  source: 'live'
  avatarUrl?: string
  attackTotal: number
  liveAmmoPercent: number
  equipment: EquipmentSummary[]
}

export interface ManualPlayerSnapshot extends SnapshotBase {
  source: 'manual'
}

export type CalculatorSnapshot = PlayerSnapshot | ManualPlayerSnapshot

export interface RuntimeConfig {
  cachedAt: number
  configSource: 'live' | 'cache' | 'fallback'
  foodRestorePct: Record<'bread' | 'steak' | 'cookedFish', number>
  pillAttackBonusPct: number
  itemMetaByCode: Record<
    string,
    {
      rarity: ItemRarity
      iconImg?: string
    }
  >
  defaultBars: {
    maxHealth: number
    maxHunger: number
    healthHourlyRegen: number
    hungerHourlyRegen: number
  }
  defaultCombat: {
    attackPreAmmo: number
    precisionPct: number
    criticalChancePct: number
    critDamagePct: number
    armorPct: number
    dodgePct: number
  }
}

export interface CalcInput extends PlayerBars {
  id: string
  username: string
  attackPreAmmo: number
  detectedPillAttackPct: number
  precisionPct: number
  criticalChancePct: number
  /**
   * Bonus crit damage percent.
   * `50` means crits deal `1.5x` base attack and `100` means `2.0x`.
   */
  critDamagePct: number
  armorPct: number
  dodgePct: number
  battleBonusPct: number
  ammoType: AmmoType
  pillAttackBonusPct: number
  foodRestorePct: number
}

export interface DamageProjection {
  attackWithSelectedModifiers: number
  battleMultiplier: number
  expectedDamagePerAttempt: number
  expectedHpLossPerAttempt: number
  foodUsesAvailable: number
  foodRestoreAmount: number
  recoverableHpFromHunger: number
  effectiveHealthPool: number
  estimatedAttempts: number
  totalDamage: number
}

export interface GroupProjection {
  totalDamage: number
  totalAttempts: number
  playerCount: number
  averageDamage: number
}

export interface SearchResult {
  id: string
  username: string
  avatarUrl?: string
}

export interface PlayerSelection {
  key: string
  snapshot: CalculatorSnapshot
  ammoType: AmmoType
  foodType: FoodType
  pillActive: boolean
}
