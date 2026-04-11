import { useState } from 'react'

import { AmmoLoadoutCard } from './AmmoLoadoutCard'
import { EquipmentPill } from './EquipmentPill'
import {
  EQUIPMENT_SLOTS,
  MAX_EQUIPMENT_ROWS,
  createEmptyWeaponAmmoLoadout,
  createEquipmentCellFromMeta,
  getEquipmentMetaForCode,
  hasEquipmentEditingMetadata,
  insertEquipmentRow,
  syncWeaponAmmoLoadoutToWeapon,
} from '../lib/equipmentRows'
import type {
  AmmoType,
  EquipmentItemMeta,
  EquipmentRow,
  EquipmentSlot,
  EquipmentStatValues,
  RuntimeConfig,
  WeaponAmmoLoadout,
} from '../types'

interface EquipmentGridProps {
  config: RuntimeConfig
  defaultAmmoType: AmmoType
  onRowsChange: (rows: EquipmentRow[]) => void
  onWeaponAmmoLoadoutsChange: (weaponAmmoLoadouts: WeaponAmmoLoadout[]) => void
  rows: EquipmentRow[]
  weaponAmmoLoadouts: WeaponAmmoLoadout[]
}

interface PickerTarget {
  rowIndex: number
  slot: EquipmentSlot
}

export function EquipmentGrid({
  config,
  defaultAmmoType,
  onRowsChange,
  onWeaponAmmoLoadoutsChange,
  rows,
  weaponAmmoLoadouts,
}: EquipmentGridProps) {
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null)
  const editingEnabled = hasEquipmentEditingMetadata(config)

  function updateCell(
    rowIndex: number,
    slot: EquipmentSlot,
    updater: (current: EquipmentRow[EquipmentSlot]) => EquipmentRow[EquipmentSlot],
  ) {
    const nextRows = rows.map((row, currentRowIndex) =>
      currentRowIndex === rowIndex
        ? {
            ...row,
            [slot]: updater(row[slot]),
          }
        : row,
    )
    const nextWeaponAmmoLoadouts = [...weaponAmmoLoadouts]

    if (slot === 'weapon') {
      nextWeaponAmmoLoadouts[rowIndex] = syncWeaponAmmoLoadoutToWeapon(
        nextWeaponAmmoLoadouts[rowIndex] ?? createEmptyWeaponAmmoLoadout(),
        rows[rowIndex]?.weapon ?? null,
        nextRows[rowIndex]?.weapon ?? null,
        defaultAmmoType,
      )
    }

    onRowsChange(nextRows)
    onWeaponAmmoLoadoutsChange(nextWeaponAmmoLoadouts)
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
    nextValues: { skills: EquipmentStatValues; state: number },
  ) {
    updateCell(rowIndex, slot, (currentCell) =>
      currentCell
        ? {
            ...currentCell,
            state: nextValues.state,
            skills: {
              ...currentCell.skills,
              ...nextValues.skills,
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
            <AmmoLoadoutCard
              capacity={row.weapon?.state ?? 0}
              defaultAmmoType={defaultAmmoType}
              key={`ammo-${rowIndex}-${row.weapon?.state ?? 0}-${weaponAmmoLoadouts[rowIndex]?.heavyAmmo ?? 0}-${weaponAmmoLoadouts[rowIndex]?.ammo ?? 0}-${weaponAmmoLoadouts[rowIndex]?.lightAmmo ?? 0}`}
              loadout={weaponAmmoLoadouts[rowIndex] ?? createEmptyWeaponAmmoLoadout()}
              onChange={(nextLoadout) => {
                const nextWeaponAmmoLoadouts = [...weaponAmmoLoadouts]
                nextWeaponAmmoLoadouts[rowIndex] = nextLoadout
                onWeaponAmmoLoadoutsChange(nextWeaponAmmoLoadouts)
              }}
            />

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

          <div className="equipment-row-actions">
            {rowIndex > 0 ? (
              <button
                className="remove-row-btn"
                onClick={() => {
                  onRowsChange(
                    rows.filter((_, currentRowIndex) => currentRowIndex !== rowIndex),
                  )
                  onWeaponAmmoLoadoutsChange(
                    weaponAmmoLoadouts.filter(
                      (_, currentRowIndex) => currentRowIndex !== rowIndex,
                    ),
                  )
                  setPickerTarget(null)
                }}
                type="button"
              >
                Remove row
              </button>
            ) : null}

            {rowIndex === rows.length - 1 && rows.length < MAX_EQUIPMENT_ROWS ? (
              <button
                className="add-row-btn"
                onClick={() => {
                  onRowsChange(insertEquipmentRow(rows, rowIndex))
                  const nextWeaponAmmoLoadouts = [...weaponAmmoLoadouts]
                  nextWeaponAmmoLoadouts.splice(
                    rowIndex + 1,
                    0,
                    createEmptyWeaponAmmoLoadout(),
                  )
                  onWeaponAmmoLoadoutsChange(nextWeaponAmmoLoadouts)
                  setPickerTarget(null)
                }}
                type="button"
              >
                Add row below
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
