import { useState } from 'react'

interface BattleControlsProps {
  battleBonusPct: number
  hoursAhead: number
  onBattleBonusChange: (value: number) => void
  onHoursAheadChange: (value: number) => void
}

function toNumber(value: string, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function BattleControls({
  battleBonusPct,
  hoursAhead,
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
        <span>Future action timing: {hoursAhead}h</span>
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
    </div>
  )
}
