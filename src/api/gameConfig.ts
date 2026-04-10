import type { GameConfigGetGameConfigResponse } from '@wareraprojects/api'

import type {
  EquipmentItemMeta,
  EquipmentSlot,
  EquipmentStatKey,
  EquipmentStatRange,
  ItemRarity,
  RuntimeConfig,
} from '../types'
import { api } from './client'

const CACHE_KEY = 'warera-live-calculator:runtime-config'
const CACHE_TTL_MS = 30 * 60 * 1000

function createEmptyEquipmentMetaBySlot(): Record<EquipmentSlot, EquipmentItemMeta[]> {
  return {
    weapon: [],
    helmet: [],
    chest: [],
    pants: [],
    boots: [],
    gloves: [],
  }
}

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
  equipmentMetaBySlot: createEmptyEquipmentMetaBySlot(),
  combatRules: {
    armorSoftCap: 40,
    dodgeSoftCap: 40,
    precisionOverflowTarget: 'attack',
    precisionOverflowValue: 4,
    criticalChanceOverflowTarget: 'criticalDamages',
    criticalChanceOverflowValue: 4,
  },
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
  usage?: string
  rarity?: string
  iconImg?: string
  dynamicStats?: Partial<Record<EquipmentStatKey, Array<number>>>
  flatStats?: {
    healthRegen?: number
    healthRegenPercent?: number
    percentAttack?: number
  }
}

type GameConfigSkillLike = {
  softCap?: number
  skillOverflow?: string
  skillOverflowValue?: number
  levels: unknown
}

const EQUIPMENT_CODES_BY_SLOT: Record<EquipmentSlot, string[]> = {
  weapon: ['knife', 'gun', 'rifle', 'sniper', 'tank', 'jet'],
  helmet: ['helmet1', 'helmet2', 'helmet3', 'helmet4', 'helmet5', 'helmet6'],
  chest: ['chest1', 'chest2', 'chest3', 'chest4', 'chest5', 'chest6'],
  pants: ['pants1', 'pants2', 'pants3', 'pants4', 'pants5', 'pants6'],
  boots: ['boots1', 'boots2', 'boots3', 'boots4', 'boots5', 'boots6'],
  gloves: ['gloves1', 'gloves2', 'gloves3', 'gloves4', 'gloves5', 'gloves6'],
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

function buildStatRanges(
  item: GameConfigItemLike | undefined,
): EquipmentStatRange[] {
  if (!item?.dynamicStats) {
    return []
  }

  const statEntries = Object.entries(item.dynamicStats) as Array<
    [EquipmentStatKey, Array<number> | undefined]
  >

  return statEntries.flatMap(([key, range]) => {
    if (!Array.isArray(range) || range.length < 2) {
      return []
    }

    return [
      {
        key,
        min: range[0],
        max: range[1],
      },
    ]
  })
}

function buildEquipmentMetaBySlot(
  items: Record<string, GameConfigItemLike>,
): Record<EquipmentSlot, EquipmentItemMeta[]> {
  const metaBySlot = createEmptyEquipmentMetaBySlot()

  for (const [slot, codes] of Object.entries(EQUIPMENT_CODES_BY_SLOT) as Array<
    [EquipmentSlot, string[]]
  >) {
    metaBySlot[slot] = codes.flatMap((code) => {
      const item = items[code]
      if (!item?.code) {
        return []
      }

      return [
        {
          code: item.code,
          slot,
          rarity: normalizeRarity(item.rarity),
          iconImg: item.iconImg,
          statRanges: buildStatRanges(item),
        },
      ]
    })
  }

  return metaBySlot
}

function toRuntimeConfig(
  config: GameConfigGetGameConfigResponse,
  configSource: RuntimeConfig['configSource'],
): RuntimeConfig {
  const items = config.items as unknown as Record<string, GameConfigItemLike>
  const attackSkill = config.skills.attack as unknown as GameConfigSkillLike
  const precisionSkill = config.skills.precision as unknown as GameConfigSkillLike
  const criticalChanceSkill =
    config.skills.criticalChance as unknown as GameConfigSkillLike
  const armorSkill = config.skills.armor as unknown as GameConfigSkillLike
  const dodgeSkill = config.skills.dodge as unknown as GameConfigSkillLike
  const defaultMaxHealth = readLevelValue(config.skills.health.levels, '0')
  const defaultMaxHunger = readLevelValue(config.skills.hunger.levels, '0')
  const equipmentMetaBySlot = buildEquipmentMetaBySlot(items)
  const itemMetaByCode = Object.values(items).reduce<
    RuntimeConfig['itemMetaByCode']
  >((accumulator, item) => {
    if (!item?.code) {
      return accumulator
    }

    accumulator[item.code] = {
      slot: (item.usage as EquipmentSlot | undefined) ?? undefined,
      rarity: normalizeRarity(item.rarity),
      iconImg: item.iconImg,
      statRanges: buildStatRanges(item),
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
    equipmentMetaBySlot,
    combatRules: {
      armorSoftCap:
        armorSkill.softCap ?? FALLBACK_RUNTIME_CONFIG.combatRules.armorSoftCap,
      dodgeSoftCap:
        dodgeSkill.softCap ?? FALLBACK_RUNTIME_CONFIG.combatRules.dodgeSoftCap,
      precisionOverflowTarget:
        precisionSkill.skillOverflow === 'attack'
          ? 'attack'
          : FALLBACK_RUNTIME_CONFIG.combatRules.precisionOverflowTarget,
      precisionOverflowValue:
        precisionSkill.skillOverflowValue ??
        FALLBACK_RUNTIME_CONFIG.combatRules.precisionOverflowValue,
      criticalChanceOverflowTarget:
        criticalChanceSkill.skillOverflow === 'criticalDamages'
          ? 'criticalDamages'
          : FALLBACK_RUNTIME_CONFIG.combatRules.criticalChanceOverflowTarget,
      criticalChanceOverflowValue:
        criticalChanceSkill.skillOverflowValue ??
        FALLBACK_RUNTIME_CONFIG.combatRules.criticalChanceOverflowValue,
    },
    defaultBars: {
      maxHealth: defaultMaxHealth,
      maxHunger: defaultMaxHunger,
      healthHourlyRegen: defaultMaxHealth * 0.1,
      hungerHourlyRegen: defaultMaxHunger * 0.1,
    },
    defaultCombat: {
      attackPreAmmo: readLevelValue(attackSkill.levels, '0'),
      precisionPct: readLevelValue(precisionSkill.levels, '0'),
      criticalChancePct: readLevelValue(criticalChanceSkill.levels, '0'),
      critDamagePct: readLevelValue(config.skills.criticalDamages.levels, '0'),
      armorPct: readLevelValue(armorSkill.levels, '0'),
      dodgePct: readLevelValue(dodgeSkill.levels, '0'),
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
      equipmentMetaBySlot: {
        ...createEmptyEquipmentMetaBySlot(),
        ...parsed.equipmentMetaBySlot,
      },
      combatRules: {
        ...FALLBACK_RUNTIME_CONFIG.combatRules,
        ...parsed.combatRules,
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
