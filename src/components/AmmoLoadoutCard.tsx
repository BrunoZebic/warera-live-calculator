import { useState } from 'react'
import type { FormEvent } from 'react'

import {
  WEAPON_AMMO_TYPES,
  createDefaultWeaponAmmoLoadout,
  getAssignedWeaponAmmoCount,
  getRemainingWeaponAmmoCount,
} from '../lib/equipmentRows'
import type { AmmoType, WeaponAmmoLoadout, WeaponAmmoType } from '../types'

interface AmmoLoadoutCardProps {
  capacity: number
  defaultAmmoType: AmmoType
  loadout: WeaponAmmoLoadout
  onChange: (nextLoadout: WeaponAmmoLoadout) => void
}

const AMMO_SHORT_LABELS: Record<WeaponAmmoType, string> = {
  heavyAmmo: 'HVY',
  ammo: 'STD',
  lightAmmo: 'LGT',
}

const AMMO_PICKER_LABELS: Record<WeaponAmmoType, string> = {
  heavyAmmo: 'Heavy',
  ammo: 'Ammo',
  lightAmmo: 'Light',
}

function clampCount(value: number): number {
  return Math.max(0, Math.floor(value))
}

export function AmmoLoadoutCard({
  capacity,
  defaultAmmoType,
  loadout,
  onChange,
}: AmmoLoadoutCardProps) {
  const [showTypePicker, setShowTypePicker] = useState(false)
  const [draftValues, setDraftValues] = useState<Record<WeaponAmmoType, string>>(() => ({
    heavyAmmo: String(loadout.heavyAmmo),
    ammo: String(loadout.ammo),
    lightAmmo: String(loadout.lightAmmo),
  }))
  const assignedCount = getAssignedWeaponAmmoCount(loadout)
  const remainingCount = getRemainingWeaponAmmoCount(loadout, capacity)

  function buildCommittedLoadout(
    nextDraftValues: Record<WeaponAmmoType, string>,
  ): WeaponAmmoLoadout {
    let remainingCapacity = capacity
    const nextLoadout: WeaponAmmoLoadout = {
      heavyAmmo: 0,
      ammo: 0,
      lightAmmo: 0,
    }

    for (const ammoType of WEAPON_AMMO_TYPES) {
      const parsed = Number(nextDraftValues[ammoType] ?? '')
      const nextCount = Number.isFinite(parsed)
        ? Math.min(clampCount(parsed), remainingCapacity)
        : loadout[ammoType]

      nextLoadout[ammoType] = nextCount
      remainingCapacity -= nextCount
    }

    return nextLoadout
  }

  function commitDraftValues(
    nextDraftValues: Record<WeaponAmmoType, string> = draftValues,
  ) {
    const nextLoadout = buildCommittedLoadout(nextDraftValues)
    setDraftValues({
      heavyAmmo: String(nextLoadout.heavyAmmo),
      ammo: String(nextLoadout.ammo),
      lightAmmo: String(nextLoadout.lightAmmo),
    })
    onChange(nextLoadout)
  }

  function adjustAmmoCount(ammoType: WeaponAmmoType, delta: number) {
    const parsed = Number(draftValues[ammoType] ?? '')
    const baseValue = Number.isFinite(parsed) ? parsed : loadout[ammoType]
    const nextDraftValues = {
      ...draftValues,
      [ammoType]: String(clampCount(baseValue + delta)),
    }

    setDraftValues(nextDraftValues)
    onChange(buildCommittedLoadout(nextDraftValues))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    commitDraftValues()
  }

  if (capacity <= 0) {
    return (
      <div className="equipment-pill ammo-loadout-card ammo-loadout-card-disabled">
        <strong>Ammo</strong>
        <small>No weapon</small>
      </div>
    )
  }

  if (assignedCount <= 0) {
    if (showTypePicker) {
      return (
        <div className="equipment-pill ammo-loadout-card">
          <strong>Ammo</strong>
          <small>0/{capacity}</small>
          <div className="ammo-loadout-picker">
            {WEAPON_AMMO_TYPES.map((ammoType) => (
              <button
                className="ammo-loadout-option"
                key={ammoType}
                onClick={() => {
                  onChange(createDefaultWeaponAmmoLoadout(ammoType, capacity))
                  setShowTypePicker(false)
                }}
                type="button"
              >
                {AMMO_PICKER_LABELS[ammoType]}
              </button>
            ))}
          </div>
        </div>
      )
    }

    return (
      <button
        className="equipment-pill ammo-loadout-card ammo-loadout-empty"
        onClick={() => setShowTypePicker(true)}
        type="button"
      >
        <strong>Ammo</strong>
        <small>0/{capacity}</small>
        <span className="ammo-loadout-plus">+</span>
      </button>
    )
  }

  return (
    <form className="equipment-pill ammo-loadout-card" onSubmit={handleSubmit}>
      <div className="ammo-loadout-header">
        <strong>Ammo</strong>
        <small>
          {assignedCount}/{capacity}
        </small>
      </div>

      <div className="ammo-loadout-editor">
        {WEAPON_AMMO_TYPES.map((ammoType) => (
          <div className="ammo-loadout-row" key={ammoType}>
            <span className="ammo-loadout-label">{AMMO_SHORT_LABELS[ammoType]}</span>
            <input
              className="equipment-stat-input ammo-loadout-input"
              min={0}
              onBlur={() => commitDraftValues()}
              onChange={(event) => {
                setDraftValues((current) => ({
                  ...current,
                  [ammoType]: event.target.value,
                }))
              }}
              step="1"
              title={AMMO_PICKER_LABELS[ammoType]}
              type="number"
              value={draftValues[ammoType] ?? '0'}
            />
            <div className="equipment-stepper" aria-hidden="true">
              <button
                className="equipment-step-btn"
                onClick={() => adjustAmmoCount(ammoType, 1)}
                tabIndex={-1}
                title={`Increase ${AMMO_PICKER_LABELS[ammoType]}`}
                type="button"
              >
                +
              </button>
              <button
                className="equipment-step-btn"
                onClick={() => adjustAmmoCount(ammoType, -1)}
                tabIndex={-1}
                title={`Decrease ${AMMO_PICKER_LABELS[ammoType]}`}
                type="button"
              >
                -
              </button>
            </div>
          </div>
        ))}
      </div>

      <small>No ammo: {remainingCount}</small>
      {defaultAmmoType !== 'none' ? (
        <small>Default: {AMMO_PICKER_LABELS[defaultAmmoType]}</small>
      ) : null}
    </form>
  )
}
