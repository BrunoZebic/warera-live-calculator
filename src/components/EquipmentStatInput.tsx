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
  onCommit: (skills: EquipmentStatValues) => void
}

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
  const [invalidKeys, setInvalidKeys] = useState<string[]>([])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextSkills: EquipmentStatValues = {}
    const nextInvalidKeys = meta.statRanges.flatMap((range) => {
      const parsed = Number(draftValues[range.key] ?? '')
      if (!Number.isFinite(parsed) || !isValueInRange(parsed, range)) {
        return [range.key]
      }

      nextSkills[range.key] = parsed
      return []
    })

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
    onCommit(nextSkills)
  }

  return (
    <form className="equipment-stat-inputs" onSubmit={handleSubmit}>
      {meta.statRanges.map((range) => (
        <input
          aria-label={`${range.key} value`}
          className={`equipment-stat-input ${invalidKeys.includes(range.key) ? 'equipment-stat-input-invalid' : ''}`}
          key={range.key}
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
          step="1"
          title={`${range.key}: ${range.min}-${range.max}`}
          type="number"
          value={draftValues[range.key] ?? ''}
          placeholder={STAT_LABELS[range.key]}
        />
      ))}
    </form>
  )
}
