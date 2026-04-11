import { useRef, useState } from 'react'
import type { FormEvent } from 'react'

import { EquipmentIcon } from './EquipmentIcon'
import { EquipmentRarityPicker } from './EquipmentRarityPicker'
import { EquipmentStatInput } from './EquipmentStatInput'
import type {
  EquipmentCell,
  EquipmentItemMeta,
  EquipmentSlot,
  EquipmentStatKey,
  EquipmentStatValues,
} from '../types'

interface EquipmentPillProps {
  cell: EquipmentCell | null
  currentMeta: EquipmentItemMeta | null
  editingEnabled: boolean
  onClosePicker: () => void
  onCommitSkills: (nextValues: { skills: EquipmentStatValues; state: number }) => void
  onOpenPicker: () => void
  onSelectItem: (meta: EquipmentItemMeta) => void
  pickerOpen: boolean
  slot: EquipmentSlot
  slotItems: EquipmentItemMeta[]
}

interface ManualDurabilityControlProps {
  cell: EquipmentCell
  onCommit: (nextState: number) => void
}

const READONLY_STAT_LABELS: Record<EquipmentStatKey, string> = {
  attack: 'ATK',
  criticalChance: 'CRIT',
  armor: 'ARM',
  dodge: 'DOG',
  precision: 'PREC',
  criticalDamages: 'CDMG',
}

function clampDurability(value: number, maxState: number): number {
  return Math.min(maxState, Math.max(1, value))
}

function ManualDurabilityControl({
  cell,
  onCommit,
}: ManualDurabilityControlProps) {
  const [durabilityDraft, setDurabilityDraft] = useState(() => String(cell.state))

  function commitDurability(rawValue: string) {
    const parsed = Number(rawValue)
    const nextState = Number.isFinite(parsed)
      ? clampDurability(parsed, cell.maxState)
      : cell.state

    setDurabilityDraft(String(nextState))
    onCommit(nextState)
  }

  function adjustDurability(delta: number) {
    const parsed = Number(durabilityDraft)
    const baseValue = Number.isFinite(parsed) ? parsed : cell.state
    const nextState = clampDurability(baseValue + delta, cell.maxState)

    setDurabilityDraft(String(nextState))
    onCommit(nextState)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    commitDurability(durabilityDraft)
  }

  return (
    <form className="equipment-pill-durability" onSubmit={handleSubmit}>
      <input
        aria-label="Durability"
        className="equipment-pill-durability-input"
        max={cell.maxState}
        min={1}
        onBlur={() => commitDurability(durabilityDraft)}
        onChange={(event) => {
          setDurabilityDraft(event.target.value)
        }}
        step="1"
        title={`Durability: 1-${cell.maxState}`}
        type="number"
        value={durabilityDraft}
      />
      <span className="equipment-pill-durability-max">/{cell.maxState}</span>
      <div className="equipment-stepper equipment-pill-durability-stepper">
        <button
          className="equipment-step-btn"
          onClick={() => adjustDurability(1)}
          tabIndex={-1}
          title="Increase durability"
          type="button"
        >
          +
        </button>
        <button
          className="equipment-step-btn"
          onClick={() => adjustDurability(-1)}
          tabIndex={-1}
          title="Decrease durability"
          type="button"
        >
          -
        </button>
      </div>
    </form>
  )
}

function ReadonlyEquipmentStats({
  cell,
  meta,
}: {
  cell: EquipmentCell
  meta: EquipmentItemMeta
}) {
  return (
    <div className="equipment-pill-stat-list">
      {meta.statRanges.map((range) => (
        <span className="equipment-pill-stat-chip" key={range.key}>
          {READONLY_STAT_LABELS[range.key]} {cell.skills[range.key] ?? 0}
        </span>
      ))}
    </div>
  )
}

export function EquipmentPill({
  cell,
  currentMeta,
  editingEnabled,
  onClosePicker,
  onCommitSkills,
  onOpenPicker,
  onSelectItem,
  pickerOpen,
  slot,
  slotItems,
}: EquipmentPillProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const rarityClassName = currentMeta?.rarity ?? 'unknown'
  const canShowInput =
    Boolean(cell?.isManual) && Boolean(currentMeta?.statRanges.length)
  const canShowReadonlyStats =
    Boolean(cell && !cell.isManual && currentMeta?.statRanges.length)
  const canEditDurability = Boolean(cell?.isManual)

  return (
    <div className="equipment-pill-wrapper" ref={wrapperRef}>
      {cell ? (
        <div
          className={`equipment-pill equipment-pill-rarity-${rarityClassName}`}
          title={`${slot} (${cell.state}/${cell.maxState})`}
        >
          {editingEnabled ? (
            <button
              aria-label={`Edit ${slot}`}
              className="equipment-pill-edit-btn"
              onClick={pickerOpen ? onClosePicker : onOpenPicker}
              type="button"
            >
              Edit
            </button>
          ) : null}

          <EquipmentIcon slot={slot} />
          <strong>{slot}</strong>

          {canEditDurability ? (
            <ManualDurabilityControl
              cell={cell}
              key={`${cell.code}-${cell.state}`}
              onCommit={(nextState) =>
                onCommitSkills({
                  skills: cell.skills,
                  state: nextState,
                })
              }
            />
          ) : (
            <small>{cell.state}/{cell.maxState}</small>
          )}

          {canShowInput && currentMeta ? (
            <EquipmentStatInput
              cell={cell}
              key={`${cell.code}-${cell.state}-${currentMeta.statRanges.map((range) => cell.skills[range.key] ?? '').join('-')}`}
              meta={currentMeta}
              onCommit={onCommitSkills}
            />
          ) : null}

          {canShowReadonlyStats && currentMeta ? (
            <ReadonlyEquipmentStats cell={cell} meta={currentMeta} />
          ) : null}
        </div>
      ) : (
        <button
          className="equipment-pill equipment-pill-empty"
          disabled={!editingEnabled}
          onClick={onOpenPicker}
          title={editingEnabled ? `Add ${slot}` : `${slot} empty`}
          type="button"
        >
          <EquipmentIcon slot={slot} />
          <strong>{slot}</strong>
          <small>{editingEnabled ? 'Add item' : 'Empty'}</small>
        </button>
      )}

      {pickerOpen && editingEnabled ? (
        <EquipmentRarityPicker
          anchorRef={wrapperRef}
          items={slotItems}
          onClose={onClosePicker}
          onSelect={onSelectItem}
          slot={slot}
        />
      ) : null}
    </div>
  )
}
