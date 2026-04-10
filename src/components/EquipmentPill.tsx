import { useRef, useState } from 'react'
import type { FormEvent } from 'react'

import { EquipmentIcon } from './EquipmentIcon'
import { EquipmentRarityPicker } from './EquipmentRarityPicker'
import { EquipmentStatInput } from './EquipmentStatInput'
import type {
  EquipmentCell,
  EquipmentItemMeta,
  EquipmentSlot,
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
          const rawValue = event.target.value
          const parsed = Number(rawValue)
          const nextValue =
            rawValue === ''
              ? ''
              : Number.isFinite(parsed)
                ? String(clampDurability(parsed, cell.maxState))
                : rawValue

          setDurabilityDraft(nextValue)
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
