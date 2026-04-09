import {
  AMMO_LABELS,
  FOOD_LABELS,
  MINIMUM_BATTLE_HEALTH,
} from '../damage/constants'
import {
  buildCalcInput,
  calculatePlayerProjection,
} from '../damage/formula'
import { projectFutureBars } from '../damage/projection'
import {
  formatCompactNumber,
  formatPreciseNumber,
  getFoodRestorePct,
  getSelectedPillAttackPct,
} from '../lib/players'
import type {
  AmmoType,
  FoodType,
  PlayerSelection,
  RuntimeConfig,
} from '../types'

interface ProjectionSummaryProps {
  battleBonusPct: number
  config: RuntimeConfig
  hoursAhead: number
  onAmmoChange: (ammoType: AmmoType) => void
  onFoodChange: (foodType: FoodType) => void
  onPillChange: (pillActive: boolean) => void
  selection: PlayerSelection
}

export function ProjectionSummary({
  battleBonusPct,
  config,
  hoursAhead,
  onAmmoChange,
  onFoodChange,
  onPillChange,
  selection,
}: ProjectionSummaryProps) {
  const foodRestorePct = getFoodRestorePct(selection.foodType, config)
  const selectedPillAttackPct = getSelectedPillAttackPct(selection, config)
  const currentInput = buildCalcInput(
    selection,
    battleBonusPct,
    foodRestorePct,
    selectedPillAttackPct,
  )
  const futureBars = projectFutureBars(selection.snapshot, hoursAhead, config)
  const futureInput = {
    ...currentInput,
    ...futureBars,
  }
  const currentProjection = calculatePlayerProjection(currentInput)
  const futureProjection = calculatePlayerProjection(futureInput)
  const showFutureAsPrimary = hoursAhead > 0
  const primaryProjection = showFutureAsPrimary
    ? futureProjection
    : currentProjection
  const primaryLabel = showFutureAsPrimary
    ? `Total damage in ${hoursAhead}h`
    : 'Total damage now'

  return (
    <div className="projection-summary">
      <div className="picker-grid picker-grid-wide">
        <label className="field-label">
          <span>Ammo type</span>
          <select
            className="select-input"
            onChange={(event) => onAmmoChange(event.target.value as AmmoType)}
            value={selection.ammoType}
          >
            {(
              Object.entries(AMMO_LABELS) as Array<[AmmoType, string]>
            ).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="field-label">
          <span>Food type</span>
          <select
            className="select-input"
            onChange={(event) => onFoodChange(event.target.value as FoodType)}
            value={selection.foodType}
          >
            {(
              Object.entries(FOOD_LABELS) as Array<[FoodType, string]>
            ).map(([value, label]) => (
              <option key={value} value={value}>
                {value === 'none'
                  ? label
                  : `${label} (+${getFoodRestorePct(value, config)}% HP)`}
              </option>
            ))}
          </select>
        </label>

        <label className="field-label">
          <span>Pill</span>
          <select
            className="select-input"
            onChange={(event) => onPillChange(event.target.value === 'on')}
            value={selection.pillActive ? 'on' : 'off'}
          >
            <option value="off">Off</option>
            <option value="on">On (+{config.pillAttackBonusPct}% attack)</option>
          </select>
        </label>
      </div>

      <div className="result-layout">
        <div className="damage-hero-card">
          <span>{primaryLabel}</span>
          <strong>{formatCompactNumber(primaryProjection.totalDamage)}</strong>
          <small>
            {primaryProjection.estimatedAttempts}{' '}
            {showFutureAsPrimary ? 'projected' : 'estimated'} attempts
          </small>
          <div className="damage-hero-meta">
            {showFutureAsPrimary ? (
              <>
                <span>Now: {formatCompactNumber(currentProjection.totalDamage)}</span>
                <span>{currentProjection.estimatedAttempts} attempts now</span>
              </>
            ) : (
              <>
                <span>
                  Health pool: {formatPreciseNumber(currentProjection.effectiveHealthPool)}
                </span>
                <span>
                  Food adds {formatPreciseNumber(currentProjection.foodRestoreAmount)} HP
                  per full hunger
                </span>
              </>
            )}
          </div>
        </div>

        <div className="metric-grid metric-grid-support">
          <div className="metric-card metric-card-compact">
            <span>Expected damage / attempt</span>
            <strong>{formatPreciseNumber(currentProjection.expectedDamagePerAttempt)}</strong>
            <small>
              {formatPreciseNumber(currentProjection.attackWithSelectedModifiers)} attack
              after pill/ammo
            </small>
          </div>

          <div className="metric-card metric-card-compact">
            <span>Expected HP cost / attempt</span>
            <strong>{formatPreciseNumber(currentProjection.expectedHpLossPerAttempt)}</strong>
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
                ? `${currentProjection.estimatedAttempts} estimated attempts`
                : `${formatPreciseNumber(futureBars.currentHealth)} HP / ${formatPreciseNumber(futureBars.currentHunger)} hunger`}
            </small>
          </div>
        </div>
      </div>

      <div className="projection-footnote">
        <span>
          Health pool now: {formatPreciseNumber(currentProjection.effectiveHealthPool)}
        </span>
        <span>
          Health pool in {hoursAhead}h:{' '}
          {formatPreciseNumber(futureProjection.effectiveHealthPool)}
        </span>
        <span>
          Food adds {formatPreciseNumber(currentProjection.foodRestoreAmount)} HP per
          full hunger point
        </span>
      </div>

      <div className="projection-footnote">
        <span>Food uses now: {currentProjection.foodUsesAvailable}</span>
        <span>Food uses in {hoursAhead}h: {futureProjection.foodUsesAvailable}</span>
        <span>
          Current bars: {formatPreciseNumber(selection.snapshot.currentHealth)} HP /{' '}
          {formatPreciseNumber(selection.snapshot.currentHunger)} hunger
        </span>
        <span>
          Projected bars: {formatPreciseNumber(futureBars.currentHealth)} HP /{' '}
          {formatPreciseNumber(futureBars.currentHunger)} hunger
        </span>
      </div>
    </div>
  )
}
