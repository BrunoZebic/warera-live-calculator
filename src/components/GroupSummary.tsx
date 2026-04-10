import { calculateSelectionProjection } from '../damage/liveProjection'
import { projectFutureBars } from '../damage/projection'
import {
  formatCompactNumber,
  formatPreciseNumber,
  getFoodRestorePct,
  getSelectedPillAttackPct,
} from '../lib/players'
import type { PlayerSelection, RuntimeConfig } from '../types'

interface GroupSummaryProps {
  battleBonusPct: number
  config: RuntimeConfig
  hoursAhead: number
  players: PlayerSelection[]
}

export function GroupSummary({
  battleBonusPct,
  config,
  hoursAhead,
  players,
}: GroupSummaryProps) {
  const currentPlayerProjections = players.map((selection) =>
    calculateSelectionProjection({
      battleBonusPct,
      config,
      foodRestorePct: getFoodRestorePct(selection.foodType, config),
      pillAttackBonusPct: getSelectedPillAttackPct(selection, config),
      selection,
    }).projection,
  )
  const futurePlayerProjections = players.map((selection) =>
    calculateSelectionProjection({
      battleBonusPct,
      barsOverride: projectFutureBars(selection.snapshot, hoursAhead, config),
      config,
      foodRestorePct: getFoodRestorePct(selection.foodType, config),
      pillAttackBonusPct: getSelectedPillAttackPct(selection, config),
      selection,
    }).projection,
  )
  const nowProjection = summarizeGroupProjection(currentPlayerProjections)
  const futureProjection = summarizeGroupProjection(futurePlayerProjections)
  const showFutureAsPrimary = hoursAhead > 0
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
          <span>
            {showFutureAsPrimary ? `Total damage in ${hoursAhead}h` : 'Total damage now'}
          </span>
          <strong>{formatCompactNumber(primaryProjection.totalDamage)}</strong>
          <small>
            {formatPreciseNumber(primaryProjection.totalAttempts)}{' '}
            {showFutureAsPrimary ? 'projected' : 'estimated'} attempts
          </small>
          <div className="damage-hero-meta">
            {showFutureAsPrimary ? (
              <>
                <span>Now: {formatCompactNumber(nowProjection.totalDamage)}</span>
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
            <span>{showFutureAsPrimary ? 'Players in action' : `Damage in ${hoursAhead}h`}</span>
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
  projections: Array<{ estimatedAttempts: number; totalDamage: number }>,
) {
  const totalDamage = projections.reduce(
    (sum, projection) => sum + projection.totalDamage,
    0,
  )
  const totalAttempts = projections.reduce(
    (sum, projection) => sum + projection.estimatedAttempts,
    0,
  )

  return {
    totalDamage,
    totalAttempts,
    playerCount: projections.length,
    averageDamage: projections.length > 0 ? totalDamage / projections.length : 0,
  }
}
