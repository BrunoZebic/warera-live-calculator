function normalizeWindowHours(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
}

export function getCombinedProjectionHours(
  prepHours: number,
  followupRecoveryHours: number,
): number {
  return normalizeWindowHours(prepHours) + normalizeWindowHours(followupRecoveryHours)
}

export function formatProjectionWindow(
  prepHours: number,
  followupRecoveryHours: number,
) {
  const normalizedPrepHours = normalizeWindowHours(prepHours)
  const normalizedFollowupRecoveryHours = normalizeWindowHours(
    followupRecoveryHours,
  )

  if (normalizedPrepHours > 0 && normalizedFollowupRecoveryHours > 0) {
    return `${normalizedPrepHours}h prep + ${normalizedFollowupRecoveryHours}h recovery`
  }

  if (normalizedPrepHours > 0) {
    return `${normalizedPrepHours}h prep`
  }

  if (normalizedFollowupRecoveryHours > 0) {
    return `${normalizedFollowupRecoveryHours}h recovery`
  }

  return 'now'
}
