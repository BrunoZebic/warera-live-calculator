import { useState } from 'react'

interface BattleControlsProps {
  battleHours: number
  battleBonusPct: number
  hoursAhead: number
  pillBuffDurationHours: number
  onBattleHoursChange: (value: number) => void
  onBattleBonusChange: (value: number) => void
  onHoursAheadChange: (value: number) => void
}

function toNumber(value: string, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function BattleControls({
  battleHours,
  battleBonusPct,
  hoursAhead,
  pillBuffDurationHours,
  onBattleHoursChange,
  onBattleBonusChange,
  onHoursAheadChange,
}: BattleControlsProps) {
  const [battleBonusInput, setBattleBonusInput] = useState(() =>
    battleBonusPct === 0 ? '' : String(battleBonusPct),
  )

  return (
    <div className="panel controls-panel">
      <label className="field-label">
        <span>Manual battle bonus %</span>
        <input
          className="text-input"
          onChange={(event) => {
            const nextValue = event.target.value
            setBattleBonusInput(nextValue)

            if (nextValue.trim() === '') {
              onBattleBonusChange(0)
              return
            }

            onBattleBonusChange(toNumber(nextValue, battleBonusPct))
          }}
          placeholder="0"
          step="0.1"
          type="number"
          value={battleBonusInput}
        />
      </label>

      <label className="field-label slider-label">
        <span>Prep time before action: {hoursAhead}h</span>
        <input
          className="range-input"
          max="10"
          min="0"
          onChange={(event) => onHoursAheadChange(Number(event.target.value))}
          step="1"
          type="range"
          value={hoursAhead}
        />
      </label>

      <label className="field-label slider-label">
        <span>Battle window: {battleHours}h</span>
        <input
          className="range-input"
          max={pillBuffDurationHours}
          min="0"
          onChange={(event) => onBattleHoursChange(Number(event.target.value))}
          step="1"
          type="range"
          value={battleHours}
        />
      </label>

      <div className="battle-window-summary">
        Combined projection window: {hoursAhead + battleHours}h
      </div>
    </div>
  )
}
