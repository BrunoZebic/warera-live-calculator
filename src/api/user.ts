import type {
  SearchSearchAnythingResponse,
  UserGetUserLiteResponse,
} from '@wareraprojects/api'

import { AMMO_BONUS_PCT } from '../damage/constants'
import type {
  AmmoType,
  EquipmentSummary,
  LiveSkillMap,
  PlayerSnapshot,
  SearchResult,
} from '../types'
import { api } from './client'
import type {
  WareraCurrentEquipmentResponse,
  WareraEquipmentItem,
  WareraUserByIdResponse,
} from './types'

function normalizeAmmoType(value?: string): AmmoType {
  if (value === 'lightAmmo' || value === 'ammo' || value === 'heavyAmmo') {
    return value
  }

  return 'none'
}

function getEffectiveStat(value: {
  total: number
  totalAfterSoftCap?: number | null
}): number {
  return value.totalAfterSoftCap ?? value.total
}

function getBaseSkillValue(value?: number | null, fallback = 0): number {
  return value ?? fallback
}

function buildEquipmentSummary(
  equipment: WareraCurrentEquipmentResponse,
): EquipmentSummary[] {
  const orderedSlots: Array<[EquipmentSummary['slot'], WareraEquipmentItem | undefined]> =
    [
      ['weapon', equipment.weapon],
      ['helmet', equipment.helmet],
      ['chest', equipment.chest],
      ['pants', equipment.pants],
      ['boots', equipment.boots],
      ['gloves', equipment.gloves],
    ]

  return orderedSlots.flatMap(([slot, item]) =>
    item
      ? [
          {
            slot,
            code: item.code,
            state: item.state,
            maxState: item.maxState,
            skills: item.skills ?? {},
          },
        ]
      : [],
  )
}

function normalizeSnapshot(
  user: WareraUserByIdResponse,
  equipment: WareraCurrentEquipmentResponse,
): PlayerSnapshot {
  const currentAmmoType = normalizeAmmoType(equipment.ammo ?? user.equipment?.ammo)
  const liveAmmoPercent =
    currentAmmoType === 'none'
      ? 0
      : user.skills.attack.ammoPercent || AMMO_BONUS_PCT[currentAmmoType]
  const attackTotal = user.skills.attack.total
  const attackPreAmmo =
    liveAmmoPercent > 0 ? attackTotal / (1 + liveAmmoPercent / 100) : attackTotal
  const detectedAttackModifierPct =
    (user.skills.attack.buffsPercent || 0) -
    (user.skills.attack.debuffsPercent || 0)
  const attackBaseValue = user.skills.attack.value ?? 0
  const currentWeaponValue = user.skills.attack.weapon ?? 0
  const currentOverflowValue = user.skills.attack.overflow ?? 0
  const attackRawTotal = attackBaseValue + currentWeaponValue + currentOverflowValue
  const attackPercentMultiplier =
    attackRawTotal > 0 ? attackPreAmmo / attackRawTotal : 1
  const liveSkills: LiveSkillMap = {
    attack: {
      level: user.skills.attack.level ?? 0,
      value: attackBaseValue,
    },
    precision: {
      level: user.skills.precision.level ?? 0,
      value: getBaseSkillValue(user.skills.precision.value),
    },
    criticalChance: {
      level: user.skills.criticalChance.level ?? 0,
      value: getBaseSkillValue(user.skills.criticalChance.value),
    },
    criticalDamages: {
      level: user.skills.criticalDamages.level ?? 0,
      value: getBaseSkillValue(user.skills.criticalDamages.value),
    },
    armor: {
      level: user.skills.armor.level ?? 0,
      value: getBaseSkillValue(user.skills.armor.value),
    },
    dodge: {
      level: user.skills.dodge.level ?? 0,
      value: getBaseSkillValue(user.skills.dodge.value),
    },
    health: {
      level: user.skills.health.level,
      value: getBaseSkillValue(user.skills.health.value, user.skills.health.total),
    },
    hunger: {
      level: user.skills.hunger.level,
      value: getBaseSkillValue(user.skills.hunger.value, user.skills.hunger.total),
    },
    energy: {
      level: user.skills.energy.level,
      value: getBaseSkillValue(user.skills.energy.value, user.skills.energy.total),
    },
    entrepreneurship: {
      level: user.skills.entrepreneurship.level,
      value: getBaseSkillValue(
        user.skills.entrepreneurship.value,
        user.skills.entrepreneurship.total,
      ),
    },
    production: {
      level: user.skills.production.level,
      value: getBaseSkillValue(
        user.skills.production.value,
        user.skills.production.total,
      ),
    },
    companies: {
      level: user.skills.companies.level ?? 0,
      value: getBaseSkillValue(user.skills.companies.value, user.skills.companies.total),
    },
    management: {
      level: user.skills.management.level ?? 0,
      value: getBaseSkillValue(user.skills.management.value, user.skills.management.total),
    },
    lootChance: {
      level: user.skills.lootChance.level ?? 0,
      value: getBaseSkillValue(user.skills.lootChance.value, user.skills.lootChance.total),
    },
  }

  const roundTripAttack =
    currentAmmoType === 'none'
      ? attackPreAmmo
      : attackPreAmmo * (1 + liveAmmoPercent / 100)

  if (Math.abs(roundTripAttack - attackTotal) > 0.001) {
    console.warn('Ammo normalization did not round-trip cleanly for', user.username)
  }

  return {
    source: 'live',
    id: user._id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    level: user.leveling.level,
    totalSkillPoints: user.leveling.totalSkillPoints,
    availableSkillPoints: user.leveling.availableSkillPoints,
    spentSkillPoints: user.leveling.spentSkillPoints,
    currentHealth: user.skills.health.currentBarValue,
    maxHealth: user.skills.health.total,
    currentHunger: user.skills.hunger.currentBarValue,
    maxHunger: user.skills.hunger.total,
    healthHourlyRegen: user.skills.health.hourlyBarRegen,
    hungerHourlyRegen: user.skills.hunger.hourlyBarRegen,
    attackPreAmmo,
    detectedAttackModifierPct,
    attackTotal,
    liveAmmoPercent,
    currentAmmoType,
    precisionPct: getEffectiveStat(user.skills.precision),
    criticalChancePct: getEffectiveStat(user.skills.criticalChance),
    critDamagePct: getEffectiveStat(user.skills.criticalDamages),
    armorPct: getEffectiveStat(user.skills.armor),
    dodgePct: getEffectiveStat(user.skills.dodge),
    weaponCode: equipment.weapon?.code,
    equipment: buildEquipmentSummary(equipment),
    liveSkills,
    liveCombatBase: {
      attackBaseValue,
      attackPercentMultiplier,
      precisionBaseValue: user.skills.precision.value ?? 0,
      criticalChanceBaseValue: user.skills.criticalChance.value ?? 0,
      critDamageBaseValue: user.skills.criticalDamages.value ?? 0,
      armorBaseValue: user.skills.armor.value ?? 0,
      dodgeBaseValue: user.skills.dodge.value ?? 0,
    },
  }
}

export async function searchUsersByName(searchText: string): Promise<string[]> {
  const normalized = searchText.trim()
  if (!normalized) {
    return []
  }

  const response = (await api.search.searchAnything({
    searchText: normalized,
  })) as SearchSearchAnythingResponse

  if (!response.hasData) {
    return []
  }

  return [...new Set(response.userIds)]
}

export async function searchUsers(searchText: string): Promise<SearchResult[]> {
  const ids = (await searchUsersByName(searchText)).slice(0, 6)

  const hydrated: Array<SearchResult | null> = await Promise.all(
    ids.map(async (userId) => {
      try {
        const lite = (await api.user.getUserLite({
          userId,
        })) as UserGetUserLiteResponse

        return {
          id: lite._id,
          username: lite.username,
          avatarUrl: lite.avatarUrl ?? undefined,
        } satisfies SearchResult
      } catch {
        return null
      }
    }),
  )

  return hydrated.filter((item): item is SearchResult => item !== null)
}

export async function getPlayerSnapshot(userId: string): Promise<PlayerSnapshot> {
  const [user, equipment] = await Promise.all([
    api.user.getUserById({ userId }) as Promise<WareraUserByIdResponse>,
    api.inventory.fetchCurrentEquipment({
      userId,
    }) as Promise<WareraCurrentEquipmentResponse>,
  ])

  return normalizeSnapshot(user, equipment)
}
