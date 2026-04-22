import { useState } from 'react'

import { formatProjectionWindow } from '../lib/projectionWindow'

interface BattleControlsProps {
  battleBonusPct: number
  followupRecoveryHours: number
  onBattleBonusChange: (value: number) => void
  onFollowupRecoveryHoursChange: (value: number) => void
  onPrepHoursChange: (value: number) => void
  pillBuffDurationHours: number
  prepHours: number
}

function toNumber(value: string, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function BattleControls({
  battleBonusPct,
  followupRecoveryHours,
  onBattleBonusChange,
  onFollowupRecoveryHoursChange,
  onPrepHoursChange,
  pillBuffDurationHours,
  prepHours,
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

      <div className="battle-controls-time-stack">
        <label className="field-label slider-label">
          <span>Prep time before action: {prepHours}h</span>
          <input
            className="range-input"
            max="10"
            min="0"
            onChange={(event) => onPrepHoursChange(Number(event.target.value))}
            step="1"
            type="range"
            value={prepHours}
          />
        </label>

        <label className="field-label slider-label">
          <span>Follow-up recovery window: {followupRecoveryHours}h</span>
          <input
            className="range-input"
            max={pillBuffDurationHours}
            min="0"
            onChange={(event) =>
              onFollowupRecoveryHoursChange(Number(event.target.value))
            }
            step="1"
            type="range"
            value={followupRecoveryHours}
          />
        </label>
      </div>

      <div className="battle-window-summary">
        Projection window: {formatProjectionWindow(prepHours, followupRecoveryHours)}
      </div>
    </div>
  )
}
