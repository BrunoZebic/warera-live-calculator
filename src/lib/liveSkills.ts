import type {
  LiveSkillKey,
  LiveSkillLevelMap,
  LiveSkillMap,
  LiveSkillOverrides,
  LiveSkillValueMap,
  PlayerBars,
  PlayerSnapshot,
  RuntimeConfig,
} from '../types'

export interface LiveSkillGroup {
  description: string
  keys: LiveSkillKey[]
  title: string
}

export interface ResolvedLiveSkillPlan {
  availableSkillPoints: number
  bars: PlayerBars
  playerLevel: number
  skillLevels: LiveSkillLevelMap
  skillValues: LiveSkillValueMap
  spentSkillPoints: number
  totalSkillPoints: number
}

export const MAX_LIVE_SKILL_LEVEL = 10

export const LIVE_SKILL_KEYS: LiveSkillKey[] = [
  'attack',
  'precision',
  'criticalChance',
  'criticalDamages',
  'armor',
  'dodge',
  'health',
  'hunger',
  'energy',
  'entrepreneurship',
  'production',
  'companies',
  'management',
  'lootChance',
]

export const LIVE_SKILL_GROUPS: LiveSkillGroup[] = [
  {
    title: 'Combat',
    description: 'Damage, hit rate, crits, and defense.',
    keys: [
      'attack',
      'precision',
      'criticalChance',
      'criticalDamages',
      'armor',
      'dodge',
    ],
  },
  {
    title: 'Bars',
    description: 'Bars and recovery-related skills from your live account.',
    keys: ['health', 'hunger', 'energy'],
  },
  {
    title: 'Economy',
    description: 'Company and work skills to model future staffing tradeoffs.',
    keys: [
      'entrepreneurship',
      'production',
      'companies',
      'management',
      'lootChance',
    ],
  },
]

export const LIVE_SKILL_LABELS: Record<LiveSkillKey, string> = {
  attack: 'Attack',
  precision: 'Precision',
  criticalChance: 'Crit chance',
  criticalDamages: 'Crit damage',
  armor: 'Armor',
  dodge: 'Dodge',
  health: 'Health',
  hunger: 'Hunger',
  energy: 'Energy',
  entrepreneurship: 'Entrepreneurship',
  production: 'Production',
  companies: 'Companies',
  management: 'Management',
  lootChance: 'Loot chance',
}

const PERCENT_EFFECT_SKILLS = new Set<LiveSkillKey>([
  'precision',
  'criticalChance',
  'criticalDamages',
  'armor',
  'dodge',
  'lootChance',
])

function createEmptySkillLevelMap(): LiveSkillLevelMap {
  return LIVE_SKILL_KEYS.reduce<LiveSkillLevelMap>((accumulator, key) => {
    accumulator[key] = 0
    return accumulator
  }, {} as LiveSkillLevelMap)
}

function createEmptySkillValueMap(): LiveSkillValueMap {
  return LIVE_SKILL_KEYS.reduce<LiveSkillValueMap>((accumulator, key) => {
    accumulator[key] = 0
    return accumulator
  }, {} as LiveSkillValueMap)
}

function normalizeWholeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback
}

function normalizeSkillLevel(value: number, fallback = 0): number {
  return Math.min(MAX_LIVE_SKILL_LEVEL, normalizeWholeNumber(value, fallback))
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function getSnapshotSkillLevels(liveSkills: LiveSkillMap): LiveSkillLevelMap {
  return LIVE_SKILL_KEYS.reduce<LiveSkillLevelMap>((accumulator, key) => {
    accumulator[key] = normalizeSkillLevel(liveSkills[key].level)
    return accumulator
  }, createEmptySkillLevelMap())
}

function getSnapshotSkillValues(liveSkills: LiveSkillMap): LiveSkillValueMap {
  return LIVE_SKILL_KEYS.reduce<LiveSkillValueMap>((accumulator, key) => {
    accumulator[key] = liveSkills[key].value
    return accumulator
  }, createEmptySkillValueMap())
}

function getConfiguredSkillValue(
  config: RuntimeConfig,
  key: LiveSkillKey,
  targetLevel: number,
  liveLevel: number,
  liveValue: number,
): number {
  const valuesByLevel = config.skillLevelValues[key]
  const exactValue = valuesByLevel[String(targetLevel)]

  if (typeof exactValue === 'number') {
    return exactValue
  }

  const liveConfiguredValue = valuesByLevel[String(liveLevel)]
  if (typeof liveConfiguredValue === 'number') {
    return liveConfiguredValue + (targetLevel - liveLevel)
  }

  return liveValue + (targetLevel - liveLevel)
}

export function calculateSkillPointCost(level: number): number {
  const normalizedLevel = normalizeSkillLevel(level)
  return (normalizedLevel * (normalizedLevel + 1)) / 2
}

export function getSkillIncrementCost(currentLevel: number): number {
  return normalizeSkillLevel(currentLevel) + 1
}

export function getSkillRefund(currentLevel: number): number {
  return normalizeSkillLevel(currentLevel)
}

export function formatSkillEffectValue(
  key: LiveSkillKey,
  value: number,
): string {
  const rounded =
    Math.abs(value - Math.round(value)) < 0.001 ? Math.round(value) : value.toFixed(2)
  return PERCENT_EFFECT_SKILLS.has(key) ? `${rounded}%` : String(rounded)
}

export function buildLiveSkillOverrides(
  snapshot: PlayerSnapshot,
  playerLevel: number,
  skillLevels: LiveSkillLevelMap,
): LiveSkillOverrides | undefined {
  const changedLevels = LIVE_SKILL_KEYS.reduce<Partial<LiveSkillLevelMap>>(
    (accumulator, key) => {
      if (skillLevels[key] !== snapshot.liveSkills[key].level) {
        accumulator[key] = skillLevels[key]
      }

      return accumulator
    },
    {},
  )

  const nextOverrides: LiveSkillOverrides = {}

  if (playerLevel !== snapshot.level) {
    nextOverrides.playerLevel = playerLevel
  }

  if (Object.keys(changedLevels).length > 0) {
    nextOverrides.skillLevels = changedLevels
  }

  return Object.keys(nextOverrides).length > 0 ? nextOverrides : undefined
}

export function resolveLiveSkillPlan(
  snapshot: PlayerSnapshot,
  overrides: LiveSkillOverrides | undefined,
  config: RuntimeConfig,
): ResolvedLiveSkillPlan {
  const liveSkillLevels = getSnapshotSkillLevels(snapshot.liveSkills)
  const liveSkillValues = getSnapshotSkillValues(snapshot.liveSkills)
  const playerLevel = normalizeWholeNumber(overrides?.playerLevel ?? snapshot.level)
  const skillLevels = LIVE_SKILL_KEYS.reduce<LiveSkillLevelMap>((accumulator, key) => {
    accumulator[key] = normalizeSkillLevel(
      overrides?.skillLevels?.[key] ?? liveSkillLevels[key],
      liveSkillLevels[key],
    )
    return accumulator
  }, createEmptySkillLevelMap())

  const spentSkillPoints = Math.max(
    0,
    snapshot.spentSkillPoints +
      LIVE_SKILL_KEYS.reduce((sum, key) => {
        return (
          sum +
          calculateSkillPointCost(skillLevels[key]) -
          calculateSkillPointCost(liveSkillLevels[key])
        )
      }, 0),
  )
  const totalSkillPoints = Math.max(
    0,
    snapshot.totalSkillPoints + (playerLevel - snapshot.level) * 4,
  )
  const availableSkillPoints = totalSkillPoints - spentSkillPoints
  const skillValues = LIVE_SKILL_KEYS.reduce<LiveSkillValueMap>((accumulator, key) => {
    accumulator[key] = getConfiguredSkillValue(
      config,
      key,
      skillLevels[key],
      liveSkillLevels[key],
      liveSkillValues[key],
    )
    return accumulator
  }, createEmptySkillValueMap())

  const maxHealth = Math.max(0, skillValues.health)
  const maxHunger = Math.max(0, skillValues.hunger)
  const liveHealthRatio =
    snapshot.maxHealth > 0 ? snapshot.currentHealth / snapshot.maxHealth : 0
  const liveHungerRatio =
    snapshot.maxHunger > 0 ? snapshot.currentHunger / snapshot.maxHunger : 0

  return {
    playerLevel,
    totalSkillPoints,
    spentSkillPoints,
    availableSkillPoints,
    skillLevels,
    skillValues,
    bars: {
      currentHealth: clamp(maxHealth * liveHealthRatio, 0, maxHealth),
      maxHealth,
      currentHunger: clamp(maxHunger * liveHungerRatio, 0, maxHunger),
      maxHunger,
      healthHourlyRegen: maxHealth * 0.1,
      hungerHourlyRegen: maxHunger * 0.1,
    },
  }
}
