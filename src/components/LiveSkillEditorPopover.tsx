import { useEffect, useState } from 'react'

import { formatPreciseNumber } from '../lib/players'
import type { LiveBaseSkillOverrides, LiveCombatBaseStats } from '../types'

interface LiveSkillEditorPopoverProps {
  liveCombatBase: LiveCombatBaseStats
  onChange: (nextOverrides: LiveBaseSkillOverrides | undefined) => void
  onClose: () => void
  onReset: () => void
  overrides?: LiveBaseSkillOverrides
}

type EditableField = keyof LiveBaseSkillOverrides

const EDITABLE_FIELDS: Array<{
  key: EditableField
  label: string
}> = [
  { key: 'attackBaseValue', label: 'Attack base' },
  { key: 'precisionBaseValue', label: 'Precision base' },
  { key: 'criticalChanceBaseValue', label: 'Crit chance base' },
  { key: 'critDamageBaseValue', label: 'Crit damage base' },
  { key: 'armorBaseValue', label: 'Armor base' },
  { key: 'dodgeBaseValue', label: 'Dodge base' },
]

function buildDraftValues(
  liveCombatBase: LiveCombatBaseStats,
  overrides: LiveBaseSkillOverrides | undefined,
) {
  return EDITABLE_FIELDS.reduce<Record<EditableField, string>>(
    (accumulator, field) => {
      accumulator[field.key] = String(
        overrides?.[field.key] ?? liveCombatBase[field.key],
      )
      return accumulator
    },
    {
      attackBaseValue: '',
      precisionBaseValue: '',
      criticalChanceBaseValue: '',
      critDamageBaseValue: '',
      armorBaseValue: '',
      dodgeBaseValue: '',
    },
  )
}

function toOverrideValue(
  rawValue: string,
  fallbackValue: number,
) {
  const parsed = Number(rawValue)
  return Number.isFinite(parsed) ? parsed : fallbackValue
}

export function LiveSkillEditorPopover({
  liveCombatBase,
  onChange,
  onClose,
  onReset,
  overrides,
}: LiveSkillEditorPopoverProps) {
  const [draftValues, setDraftValues] = useState(() =>
    buildDraftValues(liveCombatBase, overrides),
  )

  useEffect(() => {
    setDraftValues(buildDraftValues(liveCombatBase, overrides))
  }, [liveCombatBase, overrides])

  function commitDraftValues(
    nextDraftValues: Record<EditableField, string> = draftValues,
  ) {
    const nextOverrides = EDITABLE_FIELDS.reduce<LiveBaseSkillOverrides>(
      (accumulator, field) => {
        const liveValue = liveCombatBase[field.key]
        const nextValue = toOverrideValue(nextDraftValues[field.key], liveValue)

        if (nextValue !== liveValue) {
          accumulator[field.key] = nextValue
        }

        return accumulator
      },
      {},
    )

    onChange(Object.keys(nextOverrides).length > 0 ? nextOverrides : undefined)
    setDraftValues(buildDraftValues(liveCombatBase, nextOverrides))
  }

  return (
    <div className="live-skill-popover">
      <div className="live-skill-popover-header">
        <div>
          <strong>Live base skills</strong>
          <small>
            Attack scaling x{formatPreciseNumber(liveCombatBase.attackPercentMultiplier)}
          </small>
        </div>

        <button
          className="live-skill-popover-close"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>

      <div className="live-skill-popover-grid">
        {EDITABLE_FIELDS.map((field) => (
          <label className="field-label" key={field.key}>
            <span>{field.label}</span>
            <input
              className="text-input live-skill-popover-input"
              onBlur={() => commitDraftValues()}
              onChange={(event) =>
                setDraftValues((current) => ({
                  ...current,
                  [field.key]: event.target.value,
                }))
              }
              step="0.1"
              type="number"
              value={draftValues[field.key]}
            />
            <small>
              Live {formatPreciseNumber(liveCombatBase[field.key])}
            </small>
          </label>
        ))}
      </div>

      <div className="live-skill-popover-actions">
        <button
          className="ghost-button"
          onClick={() => {
            onReset()
            setDraftValues(buildDraftValues(liveCombatBase, undefined))
          }}
          type="button"
        >
          Reset to live
        </button>
      </div>
    </div>
  )
}
