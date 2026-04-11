import {
  AMMO_LABELS,
  MINIMUM_BATTLE_HEALTH,
} from '../damage/constants'
import { calculateSelectionProjection } from '../damage/liveProjection'
import { FoodInventoryEditor } from './FoodInventoryEditor'
import { projectFutureBars } from '../damage/projection'
import {
  createEmptyFoodInventory,
  getAttackModifierPct,
  formatCompactNumber,
  formatPreciseNumber,
  getSelectedPillAttackPct,
} from '../lib/players'
import type {
  AmmoType,
  AttackModifierMode,
  FoodInventory,
  PlayerSelection,
  RuntimeConfig,
} from '../types'

interface ProjectionSummaryProps {
  battleBonusPct: number
  config: RuntimeConfig
  hoursAhead: number
  onAttackModifierChange: (attackModifier: AttackModifierMode) => void
  onAmmoChange: (ammoType: AmmoType) => void
  onFoodInventoryChange: (foodInventory: FoodInventory) => void
  selection: PlayerSelection
}

export function ProjectionSummary({
  battleBonusPct,
  config,
  hoursAhead,
  onAttackModifierChange,
  onAmmoChange,
  onFoodInventoryChange,
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
  const futureBars = projectFutureBars(selection.snapshot, hoursAhead, config)
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
  const showFutureAsPrimary = hoursAhead > 0
  const primaryProjection = showFutureAsPrimary
    ? futureProjection
    : currentProjection
  const primaryLabel = showFutureAsPrimary
    ? `Total damage in ${hoursAhead}h`
    : 'Total damage now'
  const showAmmoSelector = selection.snapshot.source !== 'live'
  const foodInventory = selection.foodInventory ?? createEmptyFoodInventory()
  const displayedHunger = showFutureAsPrimary
    ? futureBars.currentHunger
    : selection.snapshot.currentHunger

  return (
    <div className="projection-summary">
      {showAmmoSelector ? (
        <div className="picker-grid">
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
        </div>
      ) : null}

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
          <span>{primaryLabel}</span>
          <strong>{formatCompactNumber(primaryProjection.totalDamage)}</strong>
          <small>
            {formatPreciseNumber(primaryProjection.estimatedAttempts)}{' '}
            {showFutureAsPrimary ? 'projected' : 'estimated'} attempts
          </small>
          <div className="damage-hero-meta">
            {showFutureAsPrimary ? (
              <>
                <span>Now: {formatCompactNumber(currentProjection.totalDamage)}</span>
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
        <span>
          Health pool in {hoursAhead}h:{' '}
          {formatPreciseNumber(futureProjection.effectiveHealthPool)}
        </span>
        <span>
          Food restores now: {formatPreciseNumber(currentProjection.recoverableHpFromFood)} HP
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
