import type { GameConfigGetGameConfigResponse } from '@wareraprojects/api'

import type { ItemRarity, RuntimeConfig } from '../types'
import { api } from './client'

const CACHE_KEY = 'warera-live-calculator:runtime-config'
const CACHE_TTL_MS = 30 * 60 * 1000
const FALLBACK_RUNTIME_CONFIG: RuntimeConfig = {
  cachedAt: Date.now(),
  configSource: 'fallback',
  foodRestorePct: {
    bread: 10,
    steak: 15,
    cookedFish: 20,
  },
  pillAttackBonusPct: 60,
  itemMetaByCode: {},
  defaultBars: {
    maxHealth: 100,
    maxHunger: 100,
    healthHourlyRegen: 10,
    hungerHourlyRegen: 10,
  },
  defaultCombat: {
    attackPreAmmo: 0,
    precisionPct: 0,
    criticalChancePct: 0,
    critDamagePct: 50,
    armorPct: 0,
    dodgePct: 0,
  },
}

type SkillLevelMap = Record<string, { value: number }>
type GameConfigItemLike = {
  code?: string
  rarity?: string
  iconImg?: string
  flatStats?: {
    healthRegen?: number
    healthRegenPercent?: number
    percentAttack?: number
  }
}

function readLevelValue(levels: unknown, level: string): number {
  const levelMap = levels as SkillLevelMap
  return levelMap[level]?.value ?? 0
}

function readFoodRestore(item: GameConfigItemLike | undefined, fallback: number): number {
  return (
    item?.flatStats?.healthRegenPercent ??
    item?.flatStats?.healthRegen ??
    fallback
  )
}

function normalizeRarity(rarity?: string): ItemRarity {
  switch (rarity) {
    case 'common':
    case 'uncommon':
    case 'rare':
    case 'epic':
    case 'legendary':
    case 'mythic':
      return rarity
    default:
      return 'unknown'
  }
}

function toRuntimeConfig(
  config: GameConfigGetGameConfigResponse,
  configSource: RuntimeConfig['configSource'],
): RuntimeConfig {
  const items = config.items as unknown as Record<string, GameConfigItemLike>
  const defaultMaxHealth = readLevelValue(config.skills.health.levels, '0')
  const defaultMaxHunger = readLevelValue(config.skills.hunger.levels, '0')
  const itemMetaByCode = Object.values(items).reduce<
    RuntimeConfig['itemMetaByCode']
  >((accumulator, item) => {
    if (!item?.code) {
      return accumulator
    }

    accumulator[item.code] = {
      rarity: normalizeRarity(item.rarity),
      iconImg: item.iconImg,
    }

    return accumulator
  }, {})

  return {
    cachedAt: Date.now(),
    configSource,
    foodRestorePct: {
      bread: readFoodRestore(items.bread, FALLBACK_RUNTIME_CONFIG.foodRestorePct.bread),
      steak: readFoodRestore(items.steak, FALLBACK_RUNTIME_CONFIG.foodRestorePct.steak),
      cookedFish: readFoodRestore(
        items.cookedFish,
        FALLBACK_RUNTIME_CONFIG.foodRestorePct.cookedFish,
      ),
    },
    pillAttackBonusPct:
      items.cocain?.flatStats?.percentAttack ??
      FALLBACK_RUNTIME_CONFIG.pillAttackBonusPct,
    itemMetaByCode,
    defaultBars: {
      maxHealth: defaultMaxHealth,
      maxHunger: defaultMaxHunger,
      healthHourlyRegen: defaultMaxHealth * 0.1,
      hungerHourlyRegen: defaultMaxHunger * 0.1,
    },
    defaultCombat: {
      attackPreAmmo: readLevelValue(config.skills.attack.levels, '0'),
      precisionPct: readLevelValue(config.skills.precision.levels, '0'),
      criticalChancePct: readLevelValue(config.skills.criticalChance.levels, '0'),
      critDamagePct: readLevelValue(config.skills.criticalDamages.levels, '0'),
      armorPct: readLevelValue(config.skills.armor.levels, '0'),
      dodgePct: readLevelValue(config.skills.dodge.levels, '0'),
    },
  }
}

function readCachedConfig(): RuntimeConfig | null {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(CACHE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<RuntimeConfig>
    const normalized: RuntimeConfig = {
      ...FALLBACK_RUNTIME_CONFIG,
      ...parsed,
      cachedAt: parsed.cachedAt ?? Date.now(),
      configSource: 'cache',
      foodRestorePct: {
        ...FALLBACK_RUNTIME_CONFIG.foodRestorePct,
        ...parsed.foodRestorePct,
      },
      pillAttackBonusPct:
        parsed.pillAttackBonusPct ?? FALLBACK_RUNTIME_CONFIG.pillAttackBonusPct,
      itemMetaByCode: {
        ...FALLBACK_RUNTIME_CONFIG.itemMetaByCode,
        ...parsed.itemMetaByCode,
      },
      defaultBars: {
        ...FALLBACK_RUNTIME_CONFIG.defaultBars,
        ...parsed.defaultBars,
      },
      defaultCombat: {
        ...FALLBACK_RUNTIME_CONFIG.defaultCombat,
        ...parsed.defaultCombat,
      },
    }
    if (Date.now() - normalized.cachedAt > CACHE_TTL_MS) {
      return null
    }
    return normalized
  } catch {
    return null
  }
}

function writeCachedConfig(config: RuntimeConfig) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(CACHE_KEY, JSON.stringify(config))
}

export async function getRuntimeConfig(): Promise<RuntimeConfig> {
  const cached = readCachedConfig()
  if (cached) {
    return cached
  }

  const loadGameConfig =
    api.gameConfig.getGameConfig as () => Promise<GameConfigGetGameConfigResponse>

  try {
    const config = toRuntimeConfig(await loadGameConfig(), 'live')
    writeCachedConfig(config)
    return config
  } catch (error) {
    console.warn('Falling back to local runtime config defaults.', error)
    return {
      ...FALLBACK_RUNTIME_CONFIG,
      cachedAt: Date.now(),
    }
  }
}
