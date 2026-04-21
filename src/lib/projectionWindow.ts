function normalizeWindowHours(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
}

export function getCombinedProjectionHours(
  prepHours: number,
  battleHours: number,
): number {
  return normalizeWindowHours(prepHours) + normalizeWindowHours(battleHours)
}

export function formatProjectionWindow(prepHours: number, battleHours: number) {
  const normalizedPrepHours = normalizeWindowHours(prepHours)
  const normalizedBattleHours = normalizeWindowHours(battleHours)

  if (normalizedPrepHours > 0 && normalizedBattleHours > 0) {
    return `${normalizedPrepHours}h prep + ${normalizedBattleHours}h battle`
  }

  if (normalizedPrepHours > 0) {
    return `${normalizedPrepHours}h prep`
  }

  if (normalizedBattleHours > 0) {
    return `${normalizedBattleHours}h battle`
  }

  return 'now'
}
