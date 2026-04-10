import type {
  EquipmentCell,
  EquipmentItemMeta,
  EquipmentRow,
  EquipmentSlot,
  EquipmentStatRange,
  EquipmentStatValues,
  PlayerSnapshot,
  RuntimeConfig,
} from '../types'

export const EQUIPMENT_SLOTS: EquipmentSlot[] = [
  'weapon',
  'helmet',
  'chest',
  'pants',
  'boots',
  'gloves',
]

export const MAX_EQUIPMENT_ROWS = 10

export function createEmptyEquipmentRow(): EquipmentRow {
  return {
    weapon: null,
    helmet: null,
    chest: null,
    pants: null,
    boots: null,
    gloves: null,
  }
}

export function snapshotToEquipmentRows(snapshot: PlayerSnapshot): EquipmentRow[] {
  const row = createEmptyEquipmentRow()

  for (const item of snapshot.equipment) {
    row[item.slot] = {
      code: item.code,
      state: item.state,
      maxState: item.maxState,
      skills: { ...item.skills },
      isManual: false,
    }
  }

  return [row]
}

export function getMiddleValue(range: EquipmentStatRange): number {
  return Math.floor((range.min + range.max) / 2)
}

export function isValueInRange(value: number, range: EquipmentStatRange): boolean {
  return value >= range.min && value <= range.max
}

export function createEquipmentCellFromMeta(
  meta: EquipmentItemMeta,
  values: EquipmentStatValues = {},
): EquipmentCell {
  const skills = meta.statRanges.reduce<EquipmentStatValues>((accumulator, range) => {
    accumulator[range.key] = values[range.key] ?? getMiddleValue(range)
    return accumulator
  }, {})

  return {
    code: meta.code,
    state: 100,
    maxState: 100,
    skills,
    isManual: true,
  }
}

export function insertEquipmentRow(
  rows: EquipmentRow[],
  rowIndex: number,
): EquipmentRow[] {
  if (rows.length >= MAX_EQUIPMENT_ROWS) {
    return rows
  }

  const nextRows = [...rows]
  nextRows.splice(rowIndex + 1, 0, createEmptyEquipmentRow())
  return nextRows
}

export function getEquipmentMetaForCode(
  code: string,
  config: RuntimeConfig,
): EquipmentItemMeta | null {
  const itemMeta = config.itemMetaByCode[code]
  if (!itemMeta?.slot) {
    return null
  }

  return {
    code,
    slot: itemMeta.slot,
    rarity: itemMeta.rarity,
    iconImg: itemMeta.iconImg,
    statRanges: itemMeta.statRanges,
  }
}

export function hasEquipmentEditingMetadata(config: RuntimeConfig): boolean {
  return EQUIPMENT_SLOTS.every(
    (slot) => config.equipmentMetaBySlot[slot].length === 6,
  )
}

export function findNextFilledEquipmentCell(
  rows: EquipmentRow[],
  slot: EquipmentSlot,
  startRowIndex = 0,
): { cell: EquipmentCell; rowIndex: number } | null {
  for (let rowIndex = startRowIndex; rowIndex < rows.length; rowIndex += 1) {
    const cell = rows[rowIndex]?.[slot] ?? null
    if (cell) {
      return {
        cell,
        rowIndex,
      }
    }
  }

  return null
}
