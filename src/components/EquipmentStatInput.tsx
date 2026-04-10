import { useState } from 'react'
import type { FormEvent } from 'react'

import { isValueInRange } from '../lib/equipmentRows'
import type {
  EquipmentCell,
  EquipmentItemMeta,
  EquipmentStatKey,
  EquipmentStatValues,
} from '../types'

interface EquipmentStatInputProps {
  cell: EquipmentCell
  meta: EquipmentItemMeta
  onCommit: (nextValues: { skills: EquipmentStatValues; state: number }) => void
}

type EditableFieldKey = EquipmentStatKey | 'durability'

const STAT_LABELS: Record<EquipmentStatKey, string> = {
  attack: 'ATK',
  criticalChance: 'CRIT',
  armor: 'ARM',
  dodge: 'DOG',
  precision: 'PREC',
  criticalDamages: 'CDMG',
}

function clampToRange(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function EquipmentStatInput({
  cell,
  meta,
  onCommit,
}: EquipmentStatInputProps) {
  const durabilityRange = {
    key: 'durability',
    min: 1,
    max: cell.maxState,
  } as const
  const committedValues = meta.statRanges.reduce<Record<string, string>>(
    (accumulator, range) => {
      accumulator[range.key] = String(cell.skills[range.key] ?? '')
      return accumulator
    },
    {
      [durabilityRange.key]: String(cell.state),
    },
  )
  const [draftValues, setDraftValues] = useState<Record<string, string>>(
    () => committedValues,
  )
  const [invalidKeys, setInvalidKeys] = useState<EditableFieldKey[]>([])

  function adjustDraftValue(
    range:
      | EquipmentItemMeta['statRanges'][number]
      | { key: string; min: number; max: number },
    delta: number,
  ) {
    setDraftValues((current) => {
      const currentValue = current[range.key] ?? committedValues[range.key]
      const parsed = Number(currentValue)
      const baseValue = Number.isFinite(parsed)
        ? parsed
        : Number(committedValues[range.key] ?? range.min)

      return {
        ...current,
        [range.key]: String(clampToRange(baseValue + delta, range.min, range.max)),
      }
    })
    setInvalidKeys((current) => current.filter((entry) => entry !== range.key))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextSkills: EquipmentStatValues = {}
    const nextInvalidKeys: EditableFieldKey[] = meta.statRanges.flatMap((range) => {
      const parsed = Number(draftValues[range.key] ?? '')
      if (!Number.isFinite(parsed) || !isValueInRange(parsed, range)) {
        return [range.key]
      }

      nextSkills[range.key] = parsed
      return []
    })
    const nextState = Number(draftValues[durabilityRange.key] ?? '')
    if (
      !Number.isFinite(nextState) ||
      nextState < durabilityRange.min ||
      nextState > durabilityRange.max
    ) {
      nextInvalidKeys.push(durabilityRange.key)
    }

    if (nextInvalidKeys.length > 0) {
      setInvalidKeys(nextInvalidKeys)
      setDraftValues((current) => {
        const nextDraftValues = { ...current }

        for (const key of nextInvalidKeys) {
          nextDraftValues[key] = committedValues[key]
        }

        return nextDraftValues
      })
      return
    }

    setInvalidKeys([])
    onCommit({
      skills: nextSkills,
      state: nextState,
    })
  }

  return (
    <form className="equipment-stat-inputs" onSubmit={handleSubmit}>
      <div className="equipment-stat-control">
        <input
          aria-label="durability value"
          className={`equipment-stat-input ${invalidKeys.includes(durabilityRange.key) ? 'equipment-stat-input-invalid' : ''}`}
          onChange={(event) => {
            const rawValue = event.target.value
            const parsed = Number(rawValue)
            const nextValue =
              rawValue === ''
                ? ''
                : Number.isFinite(parsed)
                  ? String(
                      clampToRange(
                        parsed,
                        durabilityRange.min,
                        durabilityRange.max,
                      ),
                    )
                  : rawValue

            setDraftValues((current) => ({
              ...current,
              [durabilityRange.key]: nextValue,
            }))
            setInvalidKeys((current) =>
              current.filter((entry) => entry !== durabilityRange.key),
            )
          }}
          max={durabilityRange.max}
          min={durabilityRange.min}
          placeholder="DUR"
          step="1"
          title={`durability: ${durabilityRange.min}-${durabilityRange.max}`}
          type="number"
          value={draftValues[durabilityRange.key] ?? ''}
        />

        <div className="equipment-stepper" aria-hidden="true">
          <button
            className="equipment-step-btn"
            onClick={() => adjustDraftValue(durabilityRange, 1)}
            tabIndex={-1}
            title="Increase durability"
            type="button"
          >
            +
          </button>
          <button
            className="equipment-step-btn"
            onClick={() => adjustDraftValue(durabilityRange, -1)}
            tabIndex={-1}
            title="Decrease durability"
            type="button"
          >
            -
          </button>
        </div>
      </div>

      {meta.statRanges.map((range) => (
        <div className="equipment-stat-control" key={range.key}>
          <input
            aria-label={`${range.key} value`}
            className={`equipment-stat-input ${invalidKeys.includes(range.key) ? 'equipment-stat-input-invalid' : ''}`}
            onChange={(event) => {
              const rawValue = event.target.value
              const parsed = Number(rawValue)
              const nextValue =
                rawValue === ''
                  ? ''
                  : Number.isFinite(parsed)
                    ? String(clampToRange(parsed, range.min, range.max))
                    : rawValue

              setDraftValues((current) => ({
                ...current,
                [range.key]: nextValue,
              }))
              setInvalidKeys((current) =>
                current.filter((entry) => entry !== range.key),
              )
            }}
            max={range.max}
            min={range.min}
            placeholder={STAT_LABELS[range.key]}
            step="1"
            title={`${range.key}: ${range.min}-${range.max}`}
            type="number"
            value={draftValues[range.key] ?? ''}
          />

          <div className="equipment-stepper" aria-hidden="true">
            <button
              className="equipment-step-btn"
              onClick={() => adjustDraftValue(range, 1)}
              tabIndex={-1}
              title={`Increase ${range.key}`}
              type="button"
            >
              +
            </button>
            <button
              className="equipment-step-btn"
              onClick={() => adjustDraftValue(range, -1)}
              tabIndex={-1}
              title={`Decrease ${range.key}`}
              type="button"
            >
              -
            </button>
          </div>
        </div>
      ))}
    </form>
  )
}
