import {
  calculateSelectionProjection,
  getEffectiveSelectionBars,
  type SelectionProjectionResult,
} from '../damage/liveProjection'
import { projectFutureBarsAdditive } from '../damage/projection'
import {
  formatCompactNumber,
  formatPreciseNumber,
  getSelectedPillAttackPct,
} from '../lib/players'
import { mergeProjectionResourceUsages } from '../pricing/spendEstimate'
import {
  formatProjectionWindow,
  getCombinedProjectionHours,
} from '../lib/projectionWindow'
import { SpendEstimateControl } from './SpendEstimateControl'
import type { PlayerSelection, RuntimeConfig } from '../types'

interface GroupSummaryProps {
  battleBonusPct: number
  config: RuntimeConfig
  followupRecoveryHours: number
  players: PlayerSelection[]
  prepHours: number
}

export function GroupSummary({
  battleBonusPct,
  config,
  followupRecoveryHours,
  players,
  prepHours,
}: GroupSummaryProps) {
  const totalProjectionHours = getCombinedProjectionHours(
    prepHours,
    followupRecoveryHours,
  )
  const projectionWindow = formatProjectionWindow(
    prepHours,
    followupRecoveryHours,
  )
  const currentPlayerResults = players.map((selection) =>
    calculateSelectionProjection({
      battleBonusPct,
      config,
      pillAttackBonusPct: getSelectedPillAttackPct(selection, config),
      selection,
    }),
  )
  const futurePlayerResults = players.map((selection) =>
    calculateSelectionProjection({
      battleBonusPct,
      barsOverride: projectFutureBarsAdditive(
        getEffectiveSelectionBars(selection, config),
        prepHours,
        followupRecoveryHours,
        config,
      ),
      config,
      pillAttackBonusPct: getSelectedPillAttackPct(selection, config),
      selection,
    }),
  )
  const nowProjection = summarizeGroupProjection(currentPlayerResults)
  const futureProjection = summarizeGroupProjection(futurePlayerResults)
  const showFutureAsPrimary = totalProjectionHours > 0
  const primaryPlayerResults = showFutureAsPrimary
    ? futurePlayerResults
    : currentPlayerResults
  const primaryProjection = showFutureAsPrimary
    ? futureProjection
    : nowProjection
  const primaryResourceUsage = mergeProjectionResourceUsages(
    primaryPlayerResults.map((result) => result.resourceUsage),
  )

  return (
    <section className="panel group-summary">
      <div>
        <p className="eyebrow">Action total</p>
        <h3>Group damage projection</h3>
      </div>

      <div className="result-layout">
        <div className="damage-hero-card">
          <div className="damage-hero-header">
            <span>
              {showFutureAsPrimary
                ? `Total damage after ${projectionWindow}`
                : 'Total damage now'}
            </span>
            <SpendEstimateControl
              damageTotal={primaryProjection.totalDamage}
              resourceUsage={primaryResourceUsage}
            />
          </div>
          <strong>{formatCompactNumber(primaryProjection.totalDamage)}</strong>
          <small>
            {formatPreciseNumber(primaryProjection.totalAttempts)}{' '}
            {showFutureAsPrimary ? 'projected' : 'estimated'} attempts
          </small>
          <div className="damage-hero-meta">
            {showFutureAsPrimary ? (
              <>
                <span>Now: {formatCompactNumber(nowProjection.totalDamage)}</span>
                <span>Window: {projectionWindow}</span>
                <span>{formatPreciseNumber(nowProjection.totalAttempts)} attempts now</span>
              </>
            ) : (
              <>
                <span>{nowProjection.playerCount} players in action</span>
                <span>
                  Average damage {formatPreciseNumber(nowProjection.averageDamage)}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="metric-grid metric-grid-support">
          <div className="metric-card metric-card-compact">
            <span>{showFutureAsPrimary ? 'Total damage now' : 'Players in action'}</span>
            <strong>
              {showFutureAsPrimary
                ? formatCompactNumber(nowProjection.totalDamage)
                : nowProjection.playerCount}
            </strong>
            <small>
              {showFutureAsPrimary
                ? `${formatPreciseNumber(nowProjection.totalAttempts)} estimated attempts`
                : `Average projected damage ${formatPreciseNumber(nowProjection.averageDamage)}`}
            </small>
          </div>

          <div className="metric-card metric-card-compact">
            <span>
              {showFutureAsPrimary ? 'Players in action' : 'Projected window damage'}
            </span>
            <strong>
              {showFutureAsPrimary
                ? futureProjection.playerCount
                : formatCompactNumber(futureProjection.totalDamage)}
            </strong>
            <small>
              {showFutureAsPrimary
                ? `Average projected damage ${formatPreciseNumber(futureProjection.averageDamage)}`
                : `${formatPreciseNumber(futureProjection.totalAttempts)} projected attempts`}
            </small>
          </div>
        </div>
      </div>
    </section>
  )
}

function summarizeGroupProjection(
  results: SelectionProjectionResult[],
) {
  const totalDamage = results.reduce(
    (sum, result) => sum + result.projection.totalDamage,
    0,
  )
  const totalAttempts = results.reduce(
    (sum, result) => sum + result.projection.estimatedAttempts,
    0,
  )

  return {
    totalDamage,
    totalAttempts,
    playerCount: results.length,
    averageDamage: results.length > 0 ? totalDamage / results.length : 0,
  }
}
