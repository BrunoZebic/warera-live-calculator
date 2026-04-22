import { MINIMUM_BATTLE_HEALTH } from '../damage/constants'
import { calculateSelectionProjection } from '../damage/liveProjection'
import { projectFutureBarsAdditive } from '../damage/projection'
import { FoodInventoryEditor } from './FoodInventoryEditor'
import {
  createEmptyFoodInventory,
  formatCompactNumber,
  formatPreciseNumber,
  getAttackModifierPct,
  getSelectedPillAttackPct,
} from '../lib/players'
import {
  formatProjectionWindow,
  getCombinedProjectionHours,
} from '../lib/projectionWindow'
import type {
  AttackModifierMode,
  FoodInventory,
  PlayerSelection,
  RuntimeConfig,
} from '../types'

interface ProjectionSummaryProps {
  battleBonusPct: number
  config: RuntimeConfig
  followupRecoveryHours: number
  onAttackModifierChange: (attackModifier: AttackModifierMode) => void
  onFoodInventoryChange: (foodInventory: FoodInventory) => void
  prepHours: number
  selection: PlayerSelection
}

export function ProjectionSummary({
  battleBonusPct,
  config,
  followupRecoveryHours,
  onAttackModifierChange,
  onFoodInventoryChange,
  prepHours,
  selection,
}: ProjectionSummaryProps) {
  const selectedPillAttackPct = getSelectedPillAttackPct(selection, config)
  const buffAttackPct = getAttackModifierPct('buff', selection, config)
  const debuffAttackPct = Math.abs(
    getAttackModifierPct('debuff', selection, config),
  )
  const currentResult = calculateSelectionProjection({
    battleBonusPct,
    config,
    pillAttackBonusPct: selectedPillAttackPct,
    selection,
  })
  const totalProjectionHours = getCombinedProjectionHours(
    prepHours,
    followupRecoveryHours,
  )
  const projectionWindow = formatProjectionWindow(
    prepHours,
    followupRecoveryHours,
  )
  const futureBars = projectFutureBarsAdditive(
    selection.snapshot,
    prepHours,
    followupRecoveryHours,
    config,
  )
  const futureResult = calculateSelectionProjection({
    battleBonusPct,
    barsOverride: futureBars,
    config,
    pillAttackBonusPct: selectedPillAttackPct,
    selection,
  })
  const currentProjection = currentResult.projection
  const futureProjection = futureResult.projection
  const openingProjection = currentResult.openingProjection
  const showFutureAsPrimary = totalProjectionHours > 0
  const primaryProjection = showFutureAsPrimary
    ? futureProjection
    : currentProjection
  const primaryLabel = showFutureAsPrimary
    ? `Total damage after ${projectionWindow}`
    : 'Total damage now'
  const foodInventory = selection.foodInventory ?? createEmptyFoodInventory()
  const displayedHunger = showFutureAsPrimary
    ? futureBars.currentHunger
    : selection.snapshot.currentHunger

  return (
    <div className="projection-summary">
      <FoodInventoryEditor
        attackModifier={selection.attackModifier}
        buffAttackPct={buffAttackPct}
        currentHunger={displayedHunger}
        debuffAttackPct={debuffAttackPct}
        foodInventory={foodInventory}
        onChange={onFoodInventoryChange}
        onAttackModifierChange={onAttackModifierChange}
      />

      <div className="result-layout">
        <div className="damage-hero-card">
          <div className="damage-hero-header">
            <span>{primaryLabel}</span>
          </div>
          <strong>{formatCompactNumber(primaryProjection.totalDamage)}</strong>
          <small>
            {formatPreciseNumber(primaryProjection.estimatedAttempts)}{' '}
            {showFutureAsPrimary ? 'projected' : 'estimated'} attempts
          </small>
          <div className="damage-hero-meta">
            {showFutureAsPrimary ? (
              <>
                <span>Now: {formatCompactNumber(currentProjection.totalDamage)}</span>
                <span>Window: {projectionWindow}</span>
                <span>
                  {formatPreciseNumber(currentProjection.estimatedAttempts)} attempts now
                </span>
              </>
            ) : (
              <>
                <span>
                  Health pool: {formatPreciseNumber(currentProjection.effectiveHealthPool)}
                </span>
                <span>
                  Food restores {formatPreciseNumber(currentProjection.recoverableHpFromFood)} HP total
                </span>
              </>
            )}
          </div>
        </div>

        <div className="metric-grid metric-grid-support">
          <div className="metric-card metric-card-compact">
            <span>Expected damage / attempt</span>
            <strong>{formatPreciseNumber(openingProjection.expectedDamagePerAttempt)}</strong>
            <small>
              {formatPreciseNumber(openingProjection.attackWithSelectedModifiers)} attack
              after pill/ammo
            </small>
          </div>

          <div className="metric-card metric-card-compact">
            <span>Expected HP cost / attempt</span>
            <strong>{formatPreciseNumber(openingProjection.expectedHpLossPerAttempt)}</strong>
            <small>Minimum health to start a hit: {MINIMUM_BATTLE_HEALTH}</small>
          </div>

          <div className="metric-card metric-card-compact">
            <span>
              {showFutureAsPrimary ? 'Total damage now' : 'Projected health pool'}
            </span>
            <strong>
              {showFutureAsPrimary
                ? formatCompactNumber(currentProjection.totalDamage)
                : formatPreciseNumber(futureProjection.effectiveHealthPool)}
            </strong>
            <small>
              {showFutureAsPrimary
                ? `${formatPreciseNumber(currentProjection.estimatedAttempts)} estimated attempts`
                : `${formatPreciseNumber(futureBars.currentHealth)} HP / ${formatPreciseNumber(futureBars.currentHunger)} hunger`}
            </small>
          </div>
        </div>
      </div>

      <div className="projection-footnote">
        <span>
          Health pool now: {formatPreciseNumber(currentProjection.effectiveHealthPool)}
        </span>
        {showFutureAsPrimary ? (
          <span>
            Health pool after {projectionWindow}:{' '}
            {formatPreciseNumber(futureProjection.effectiveHealthPool)}
          </span>
        ) : null}
        <span>
          Food restores now: {formatPreciseNumber(currentProjection.recoverableHpFromFood)} HP
        </span>
      </div>

      <div className="projection-footnote">
        <span>Food uses now: {currentProjection.foodUsesAvailable}</span>
        {showFutureAsPrimary ? (
          <span>
            Food uses after {projectionWindow}: {futureProjection.foodUsesAvailable}
          </span>
        ) : null}
        <span>
          Current bars: {formatPreciseNumber(selection.snapshot.currentHealth)} HP /{' '}
          {formatPreciseNumber(selection.snapshot.currentHunger)} hunger
        </span>
        {showFutureAsPrimary ? (
          <span>
            Bars after {projectionWindow}: {formatPreciseNumber(futureBars.currentHealth)} HP /{' '}
            {formatPreciseNumber(futureBars.currentHunger)} hunger
          </span>
        ) : null}
      </div>
    </div>
  )
}
