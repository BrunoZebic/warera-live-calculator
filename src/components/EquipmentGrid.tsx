import { useState } from 'react'

import { EquipmentPill } from './EquipmentPill'
import {
  EQUIPMENT_SLOTS,
  MAX_EQUIPMENT_ROWS,
  createEquipmentCellFromMeta,
  getEquipmentMetaForCode,
  hasEquipmentEditingMetadata,
  insertEquipmentRow,
} from '../lib/equipmentRows'
import type {
  EquipmentItemMeta,
  EquipmentRow,
  EquipmentSlot,
  EquipmentStatValues,
  RuntimeConfig,
} from '../types'

interface EquipmentGridProps {
  config: RuntimeConfig
  onRowsChange: (rows: EquipmentRow[]) => void
  rows: EquipmentRow[]
}

interface PickerTarget {
  rowIndex: number
  slot: EquipmentSlot
}

export function EquipmentGrid({
  config,
  onRowsChange,
  rows,
}: EquipmentGridProps) {
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null)
  const editingEnabled = hasEquipmentEditingMetadata(config)

  function updateCell(
    rowIndex: number,
    slot: EquipmentSlot,
    updater: (current: EquipmentRow[EquipmentSlot]) => EquipmentRow[EquipmentSlot],
  ) {
    onRowsChange(
      rows.map((row, currentRowIndex) =>
        currentRowIndex === rowIndex
          ? {
              ...row,
              [slot]: updater(row[slot]),
            }
          : row,
      ),
    )
  }

  function handleSelectItem(
    rowIndex: number,
    slot: EquipmentSlot,
    meta: EquipmentItemMeta,
  ) {
    updateCell(rowIndex, slot, () => createEquipmentCellFromMeta(meta))
    setPickerTarget(null)
  }

  function handleCommitSkills(
    rowIndex: number,
    slot: EquipmentSlot,
    skills: EquipmentStatValues,
  ) {
    updateCell(rowIndex, slot, (currentCell) =>
      currentCell
        ? {
            ...currentCell,
            skills: {
              ...currentCell.skills,
              ...skills,
            },
          }
        : currentCell,
    )
  }

  return (
    <div className="equipment-grid-shell">
      {!editingEnabled ? (
        <div className="equipment-grid-note">
          Live equipment editing is unavailable until runtime item metadata loads.
        </div>
      ) : null}

      {rows.map((row, rowIndex) => (
        <div className="equipment-row" key={`equipment-row-${rowIndex}`}>
          <div className="equipment-row-label">
            {rowIndex === 0 ? 'Current equipment' : `Backup row ${rowIndex + 1}`}
          </div>

          <div className="equipment-row-grid">
            {EQUIPMENT_SLOTS.map((slot) => {
              const cell = row[slot]
              const currentMeta = cell ? getEquipmentMetaForCode(cell.code, config) : null
              const slotItems = config.equipmentMetaBySlot[slot]
              const isPickerOpen =
                pickerTarget?.rowIndex === rowIndex && pickerTarget?.slot === slot

              return (
                <EquipmentPill
                  cell={cell}
                  currentMeta={currentMeta}
                  editingEnabled={editingEnabled}
                  key={`${rowIndex}-${slot}`}
                  onClosePicker={() => setPickerTarget(null)}
                  onCommitSkills={(skills) =>
                    handleCommitSkills(rowIndex, slot, skills)
                  }
                  onOpenPicker={() =>
                    setPickerTarget((current) =>
                      current?.rowIndex === rowIndex && current.slot === slot
                        ? null
                        : { rowIndex, slot },
                    )
                  }
                  onSelectItem={(meta) => handleSelectItem(rowIndex, slot, meta)}
                  pickerOpen={isPickerOpen}
                  slot={slot}
                  slotItems={slotItems}
                />
              )
            })}
          </div>

          {rows.length < MAX_EQUIPMENT_ROWS ? (
            <button
              className="add-row-btn"
              onClick={() => {
                onRowsChange(insertEquipmentRow(rows, rowIndex))
                setPickerTarget(null)
              }}
              type="button"
            >
              Add row below
            </button>
          ) : null}
        </div>
      ))}
    </div>
  )
}
