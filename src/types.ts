export type AppMode = 'solo' | 'group'

export type AmmoType = 'none' | 'lightAmmo' | 'ammo' | 'heavyAmmo'

export type WeaponAmmoType = Exclude<AmmoType, 'none'>

export type FoodType = 'none' | 'bread' | 'steak' | 'cookedFish'

export type AttackModifierMode = 'none' | 'buff' | 'debuff'

export type ItemRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic'
  | 'unknown'

export type EquipmentSlot =
  | 'weapon'
  | 'helmet'
  | 'chest'
  | 'pants'
  | 'boots'
  | 'gloves'

export type EquipmentStatKey =
  | 'attack'
  | 'criticalChance'
  | 'armor'
  | 'dodge'
  | 'precision'
  | 'criticalDamages'

export type EquipmentStatValues = Partial<Record<EquipmentStatKey, number>>

export type LiveSkillKey =
  | 'attack'
  | 'precision'
  | 'criticalChance'
  | 'criticalDamages'
  | 'armor'
  | 'dodge'
  | 'health'
  | 'hunger'
  | 'energy'
  | 'entrepreneurship'
  | 'production'
  | 'companies'
  | 'management'
  | 'lootChance'

export interface EquipmentStatRange {
  key: EquipmentStatKey
  min: number
  max: number
}

export interface EquipmentItemMeta {
  code: string
  slot: EquipmentSlot
  rarity: ItemRarity
  iconImg?: string
  statRanges: EquipmentStatRange[]
}

export interface EquipmentCell {
  code: string
  state: number
  maxState: number
  skills: EquipmentStatValues
  isManual: boolean
}

export type EquipmentRow = Record<EquipmentSlot, EquipmentCell | null>

export interface WeaponAmmoLoadout {
  lightAmmo: number
  ammo: number
  heavyAmmo: number
}

export interface FoodInventory {
  bread: number
  steak: number
  cookedFish: number
}

export interface PlayerBars {
  currentHealth: number
  maxHealth: number
  currentHunger: number
  maxHunger: number
  healthHourlyRegen: number
  hungerHourlyRegen: number
}

export interface EquipmentSummary {
  slot: EquipmentSlot
  code: string
  state: number
  maxState: number
  skills: EquipmentStatValues
}

export interface LiveCombatBaseStats {
  attackBaseValue: number
  attackPercentMultiplier: number
  precisionBaseValue: number
  criticalChanceBaseValue: number
  critDamageBaseValue: number
  armorBaseValue: number
  dodgeBaseValue: number
}

export interface LiveSkillEntry {
  level: number
  value: number
}

export type LiveSkillValueMap = Record<LiveSkillKey, number>

export type LiveSkillLevelMap = Record<LiveSkillKey, number>

export type LiveSkillMap = Record<LiveSkillKey, LiveSkillEntry>

export type LiveSkillLevelValuesBySkill = Record<
  LiveSkillKey,
  Record<string, number>
>

export interface LiveSkillOverrides {
  playerLevel?: number
  skillLevels?: Partial<LiveSkillLevelMap>
}

export interface SnapshotBase extends PlayerBars {
  id: string
  username: string
  attackPreAmmo: number
  detectedAttackModifierPct: number
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
  availableSkillPoints: number
  attackTotal: number
  level: number
  liveAmmoPercent: number
  equipment: EquipmentSummary[]
  liveCombatBase: LiveCombatBaseStats
  liveSkills: LiveSkillMap
  spentSkillPoints: number
  totalSkillPoints: number
}

export interface RuntimeConfig {
  cachedAt: number
  configSource: 'live' | 'cache' | 'fallback'
  foodRestorePct: Record<'bread' | 'steak' | 'cookedFish', number>
  pillAttackBonusPct: number
  pillBuffDurationHours: number
  itemMetaByCode: Record<
    string,
    {
      slot?: EquipmentSlot
      rarity: ItemRarity
      iconImg?: string
      statRanges: EquipmentStatRange[]
    }
  >
  equipmentMetaBySlot: Record<EquipmentSlot, EquipmentItemMeta[]>
  combatRules: {
    armorSoftCap: number
    dodgeSoftCap: number
    precisionOverflowTarget: 'attack'
    precisionOverflowValue: number
    criticalChanceOverflowTarget: 'criticalDamages'
    criticalChanceOverflowValue: number
  }
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
  skillLevelValues: LiveSkillLevelValuesBySkill
}

export interface CalcInput extends PlayerBars {
  id: string
  username: string
  attackPreAmmo: number
  detectedAttackModifierPct: number
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
  foodUsesAvailable: number
  recoverableHpFromFood: number
}

export interface DamageProjection {
  attackWithSelectedModifiers: number
  battleMultiplier: number
  expectedDamagePerAttempt: number
  expectedHpLossPerAttempt: number
  foodUsesAvailable: number
  recoverableHpFromFood: number
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

export type ProjectionAmmoUsage = Record<WeaponAmmoType, number>

export interface EquipmentUsageRecord {
  itemId: string
  selectionKey: string
  rowIndex: number
  slot: EquipmentSlot
  code: string
  skills: EquipmentStatValues
  state: number
  maxState: number
  durabilityUsed: number
}

export interface ProjectionResourceUsage {
  ammoUsed: ProjectionAmmoUsage
  foodUsed: FoodInventory
  pillCount: number
  equipmentUsed: EquipmentUsageRecord[]
}

export interface SearchResult {
  id: string
  username: string
  avatarUrl?: string
}

export interface PlayerSelection {
  key: string
  snapshot: PlayerSnapshot
  ammoType: AmmoType
  foodType: FoodType
  foodInventory?: FoodInventory
  attackModifier: AttackModifierMode
  liveSkillOverrides?: LiveSkillOverrides
  equipmentRows?: EquipmentRow[]
  weaponAmmoLoadouts?: WeaponAmmoLoadout[]
}
