import { buildCalcInput, calculateGroupProjection } from '../damage/formula'
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
  const currentInputs = players.map((selection) =>
    buildCalcInput(
      selection,
      battleBonusPct,
      getFoodRestorePct(selection.foodType, config),
      getSelectedPillAttackPct(selection, config),
    ),
  )
  const futureInputs = players.map((selection) => {
    const input = buildCalcInput(
      selection,
      battleBonusPct,
      getFoodRestorePct(selection.foodType, config),
      getSelectedPillAttackPct(selection, config),
    )

    return {
      ...input,
      ...projectFutureBars(selection.snapshot, hoursAhead, config),
    }
  })

  const nowProjection = calculateGroupProjection(currentInputs)
  const futureProjection = calculateGroupProjection(futureInputs)
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
            {primaryProjection.totalAttempts}{' '}
            {showFutureAsPrimary ? 'projected' : 'estimated'} attempts
          </small>
          <div className="damage-hero-meta">
            {showFutureAsPrimary ? (
              <>
                <span>Now: {formatCompactNumber(nowProjection.totalDamage)}</span>
                <span>{nowProjection.totalAttempts} attempts now</span>
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
                ? `${nowProjection.totalAttempts} estimated attempts`
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
                : `${futureProjection.totalAttempts} projected attempts`}
            </small>
          </div>
        </div>
      </div>
    </section>
  )
}
