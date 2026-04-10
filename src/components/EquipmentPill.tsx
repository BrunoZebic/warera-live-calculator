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
  onCommitSkills: (skills: EquipmentStatValues) => void
  onOpenPicker: () => void
  onSelectItem: (meta: EquipmentItemMeta) => void
  pickerOpen: boolean
  slot: EquipmentSlot
  slotItems: EquipmentItemMeta[]
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
  const rarityClassName = currentMeta?.rarity ?? 'unknown'
  const canShowInput =
    Boolean(cell?.isManual) && Boolean(currentMeta?.statRanges.length)

  return (
    <div className="equipment-pill-wrapper">
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
          <small>
            {cell.state}/{cell.maxState}
          </small>

          {canShowInput && currentMeta ? (
            <EquipmentStatInput
              cell={cell}
              key={`${cell.code}-${currentMeta.statRanges.map((range) => cell.skills[range.key] ?? '').join('-')}`}
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
          items={slotItems}
          onClose={onClosePicker}
          onSelect={onSelectItem}
          slot={slot}
        />
      ) : null}
    </div>
  )
}
