import type {
  AmmoType,
  EquipmentCell,
  EquipmentItemMeta,
  EquipmentRow,
  EquipmentSlot,
  EquipmentStatRange,
  EquipmentStatValues,
  PlayerSnapshot,
  RuntimeConfig,
  WeaponAmmoLoadout,
  WeaponAmmoType,
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

export const WEAPON_AMMO_TYPES: WeaponAmmoType[] = [
  'heavyAmmo',
  'ammo',
  'lightAmmo',
]

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

export function createEmptyWeaponAmmoLoadout(): WeaponAmmoLoadout {
  return {
    lightAmmo: 0,
    ammo: 0,
    heavyAmmo: 0,
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

export function getWeaponAmmoCapacity(row: EquipmentRow): number {
  return row.weapon?.state ?? 0
}

export function getAssignedWeaponAmmoCount(loadout: WeaponAmmoLoadout): number {
  return WEAPON_AMMO_TYPES.reduce(
    (sum, ammoType) => sum + Math.max(0, Math.floor(loadout[ammoType] ?? 0)),
    0,
  )
}

export function getRemainingWeaponAmmoCount(
  loadout: WeaponAmmoLoadout,
  capacity: number,
): number {
  return Math.max(0, capacity - getAssignedWeaponAmmoCount(loadout))
}

export function createDefaultWeaponAmmoLoadout(
  ammoType: AmmoType,
  capacity: number,
): WeaponAmmoLoadout {
  const nextLoadout = createEmptyWeaponAmmoLoadout()

  if (ammoType !== 'none' && capacity > 0) {
    nextLoadout[ammoType] = capacity
  }

  return nextLoadout
}

export function normalizeWeaponAmmoLoadout(
  loadout: WeaponAmmoLoadout,
  capacity: number,
): WeaponAmmoLoadout {
  if (capacity <= 0) {
    return createEmptyWeaponAmmoLoadout()
  }

  let remainingCapacity = capacity
  const nextLoadout = createEmptyWeaponAmmoLoadout()

  for (const ammoType of WEAPON_AMMO_TYPES) {
    const nextCount = Math.max(0, Math.floor(loadout[ammoType] ?? 0))
    const clampedCount = Math.min(nextCount, remainingCapacity)
    nextLoadout[ammoType] = clampedCount
    remainingCapacity -= clampedCount
  }

  return nextLoadout
}

export function syncWeaponAmmoLoadoutToWeapon(
  currentLoadout: WeaponAmmoLoadout,
  previousWeapon: EquipmentCell | null,
  nextWeapon: EquipmentCell | null,
  defaultAmmoType: AmmoType,
): WeaponAmmoLoadout {
  if (!nextWeapon) {
    return createEmptyWeaponAmmoLoadout()
  }

  if (!previousWeapon) {
    return createDefaultWeaponAmmoLoadout(defaultAmmoType, nextWeapon.state)
  }

  return normalizeWeaponAmmoLoadout(currentLoadout, nextWeapon.state)
}

export function snapshotToWeaponAmmoLoadouts(
  snapshot: PlayerSnapshot,
): WeaponAmmoLoadout[] {
  const rows = snapshotToEquipmentRows(snapshot)
  return createWeaponAmmoLoadoutsFromRows(rows, snapshot.currentAmmoType)
}

export function createWeaponAmmoLoadoutsFromRows(
  rows: EquipmentRow[],
  defaultAmmoType: AmmoType,
): WeaponAmmoLoadout[] {
  return rows.map((row) =>
    row.weapon
      ? createDefaultWeaponAmmoLoadout(defaultAmmoType, row.weapon.state)
      : createEmptyWeaponAmmoLoadout(),
  )
}

export function getActiveAmmoType(
  loadout: WeaponAmmoLoadout,
): AmmoType {
  for (const ammoType of WEAPON_AMMO_TYPES) {
    if ((loadout[ammoType] ?? 0) > 0) {
      return ammoType
    }
  }

  return 'none'
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
