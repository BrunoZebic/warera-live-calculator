import {
  calculateSelectionProjection,
  type SelectionProjectionResult,
} from '../damage/liveProjection'
import { SpendEstimateControl } from './SpendEstimateControl'
import { projectFutureBars } from '../damage/projection'
import {
  formatCompactNumber,
  formatPreciseNumber,
  getSelectedPillAttackPct,
} from '../lib/players'
import {
  formatProjectionWindow,
  getCombinedProjectionHours,
} from '../lib/projectionWindow'
import { mergeProjectionResourceUsages } from '../pricing/spendEstimate'
import type { PlayerSelection, RuntimeConfig } from '../types'

interface GroupSummaryProps {
  battleHours: number
  battleBonusPct: number
  config: RuntimeConfig
  hoursAhead: number
  players: PlayerSelection[]
}

export function GroupSummary({
  battleHours,
  battleBonusPct,
  config,
  hoursAhead,
  players,
}: GroupSummaryProps) {
  const totalProjectionHours = getCombinedProjectionHours(hoursAhead, battleHours)
  const projectionWindow = formatProjectionWindow(hoursAhead, battleHours)
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
      barsOverride: projectFutureBars(selection.snapshot, totalProjectionHours, config),
      config,
      pillAttackBonusPct: getSelectedPillAttackPct(selection, config),
      selection,
    }),
  )
  const nowProjection = summarizeGroupProjection(currentPlayerResults)
  const futureProjection = summarizeGroupProjection(futurePlayerResults)
  const showFutureAsPrimary = totalProjectionHours > 0
  const primaryProjection = showFutureAsPrimary
    ? futureProjection
    : nowProjection

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
            <SpendEstimateControl resourceUsage={primaryProjection.resourceUsage} />
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
                <span>{futureProjection.playerCount} players in action</span>
                <span>
                  Average damage {formatPreciseNumber(futureProjection.averageDamage)}
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
                : futureProjection.playerCount}
            </strong>
            <small>
              {showFutureAsPrimary
                ? `${formatPreciseNumber(nowProjection.totalAttempts)} estimated attempts`
                : `Average projected damage ${formatPreciseNumber(futureProjection.averageDamage)}`}
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
  const resourceUsage = mergeProjectionResourceUsages(
    results.map((result) => result.resourceUsage),
  )

  return {
    totalDamage,
    totalAttempts,
    playerCount: results.length,
    averageDamage: results.length > 0 ? totalDamage / results.length : 0,
    resourceUsage,
  }
}
