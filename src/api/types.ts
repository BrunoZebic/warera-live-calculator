export interface WareraBarSkill {
  currentBarValue: number
  hourlyBarRegen: number
  total: number
}

export interface WareraComputedStat {
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
  skills: {
    health: WareraBarSkill
    hunger: WareraBarSkill
    attack: WareraComputedAttack
    precision: WareraComputedStat
    criticalChance: WareraComputedStat
    criticalDamages: WareraComputedStat
    armor: WareraComputedStat
    dodge: WareraComputedStat
  }
  username: string
}

export interface WareraEquipmentItem {
  code: string
  maxState: number
  skills?: Record<string, number>
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
