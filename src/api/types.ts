export interface WareraBarSkill {
  currentBarValue: number
  hourlyBarRegen: number
  level: number
  total: number
  value: number
}

export interface WareraComputedStat {
  level?: number
  value?: number | null
  weapon?: number | null
  equipment?: number | null
  overflow?: number | null
  limited?: number | null
  total: number
  totalAfterSoftCap?: number | null
}

export interface WareraComputedAttack extends WareraComputedStat {
  ammoPercent: number
  buffsPercent: number
  debuffsPercent?: number
  militaryRankPercent?: number
}

export interface WareraUserByIdResponse {
  _id: string
  avatarUrl?: string
  equipment?: {
    ammo?: string
  }
  leveling: {
    availableSkillPoints: number
    level: number
    spentSkillPoints: number
    totalSkillPoints: number
  }
  skills: {
    health: WareraBarSkill
    hunger: WareraBarSkill
    energy: WareraBarSkill
    entrepreneurship: WareraBarSkill
    production: WareraBarSkill
    attack: WareraComputedAttack
    precision: WareraComputedStat
    criticalChance: WareraComputedStat
    criticalDamages: WareraComputedStat
    armor: WareraComputedStat
    dodge: WareraComputedStat
    companies: WareraComputedStat
    management: WareraComputedStat
    lootChance: WareraComputedStat
  }
  username: string
}

export interface WareraEquipmentItem {
  code: string
  maxState: number
  skills?: Partial<
    Record<
      'attack' | 'criticalChance' | 'armor' | 'dodge' | 'precision' | 'criticalDamages',
      number
    >
  >
  state: number
}

export interface WareraCurrentEquipmentResponse {
  ammo?: string
  boots?: WareraEquipmentItem
  chest?: WareraEquipmentItem
  gloves?: WareraEquipmentItem
  helmet?: WareraEquipmentItem
  pants?: WareraEquipmentItem
  weapon?: WareraEquipmentItem
}
