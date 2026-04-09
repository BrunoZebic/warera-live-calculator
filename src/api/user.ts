import type {
  SearchSearchAnythingResponse,
  UserGetUserLiteResponse,
} from '@wareraprojects/api'

import { AMMO_BONUS_PCT } from '../damage/constants'
import type {
  AmmoType,
  EquipmentSummary,
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
    currentHealth: user.skills.health.currentBarValue,
    maxHealth: user.skills.health.total,
    currentHunger: user.skills.hunger.currentBarValue,
    maxHunger: user.skills.hunger.total,
    healthHourlyRegen: user.skills.health.hourlyBarRegen,
    hungerHourlyRegen: user.skills.hunger.hourlyBarRegen,
    attackPreAmmo,
    detectedPillAttackPct: Math.max(0, user.skills.attack.buffsPercent || 0),
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
