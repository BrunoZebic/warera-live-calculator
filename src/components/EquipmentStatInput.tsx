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

export function EquipmentStatInput({
  cell,
  meta,
  onCommit,
}: EquipmentStatInputProps) {
  const [draftValues, setDraftValues] = useState<Record<string, string>>(() =>
    meta.statRanges.reduce<Record<string, string>>((accumulator, range) => {
      accumulator[range.key] = String(cell.skills[range.key] ?? '')
      return accumulator
    }, {}),
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
            setDraftValues((current) => ({
              ...current,
              [range.key]: event.target.value,
            }))
            setInvalidKeys((current) =>
              current.filter((entry) => entry !== range.key),
            )
          }}
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
