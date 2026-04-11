import { useState } from 'react'
import type { FormEvent } from 'react'

import type {
  EquipmentCell,
  EquipmentItemMeta,
  EquipmentStatValues,
} from '../types'

interface EquipmentStatInputProps {
  cell: EquipmentCell
  meta: EquipmentItemMeta
  onCommit: (nextValues: { skills: EquipmentStatValues; state: number }) => void
}

const STAT_LABELS = {
  attack: 'ATK',
  criticalChance: 'CRIT',
  armor: 'ARM',
  dodge: 'DOG',
  precision: 'PREC',
  criticalDamages: 'CDMG',
} as const

function clampToRange(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function buildCommittedSkills(
  meta: EquipmentItemMeta,
  draftValues: Record<string, string>,
  currentSkills: EquipmentCell['skills'],
): EquipmentStatValues {
  const nextSkills: EquipmentStatValues = {}

  for (const range of meta.statRanges) {
    const parsed = Number(draftValues[range.key] ?? '')
    nextSkills[range.key] = Number.isFinite(parsed)
      ? clampToRange(parsed, range.min, range.max)
      : currentSkills[range.key] ?? range.min
  }

  return nextSkills
}

export function EquipmentStatInput({
  cell,
  meta,
  onCommit,
}: EquipmentStatInputProps) {
  const committedValues = meta.statRanges.reduce<Record<string, string>>(
    (accumulator, range) => {
      accumulator[range.key] = String(cell.skills[range.key] ?? '')
      return accumulator
    },
    {},
  )
  const [draftValues, setDraftValues] = useState<Record<string, string>>(
    () => committedValues,
  )

  function adjustDraftValue(
    range: EquipmentItemMeta['statRanges'][number],
    delta: number,
  ) {
    const currentValue = draftValues[range.key] ?? committedValues[range.key]
    const parsed = Number(currentValue)
    const baseValue = Number.isFinite(parsed)
      ? parsed
      : Number(committedValues[range.key] ?? range.min)
    const nextDraftValues = {
      ...draftValues,
      [range.key]: String(clampToRange(baseValue + delta, range.min, range.max)),
    }

    setDraftValues(nextDraftValues)
    onCommit({
      skills: buildCommittedSkills(meta, nextDraftValues, cell.skills),
      state: cell.state,
    })
  }

  function commitDraftValues(nextDraftValues = draftValues) {
    const nextSkills = buildCommittedSkills(meta, nextDraftValues, cell.skills)
    const resolvedDraftValues = meta.statRanges.reduce<Record<string, string>>(
      (accumulator, range) => {
        accumulator[range.key] = String(nextSkills[range.key] ?? range.min)
        return accumulator
      },
      {},
    )

    setDraftValues(resolvedDraftValues)
    onCommit({
      skills: nextSkills,
      state: cell.state,
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    commitDraftValues()
  }

  return (
    <form className="equipment-stat-inputs" onSubmit={handleSubmit}>
      {meta.statRanges.map((range) => (
        <div className="equipment-stat-control" key={range.key}>
          <input
            aria-label={`${range.key} value`}
            className="equipment-stat-input"
            onBlur={() => commitDraftValues()}
            onChange={(event) => {
              setDraftValues((current) => ({
                ...current,
                [range.key]: event.target.value,
              }))
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
