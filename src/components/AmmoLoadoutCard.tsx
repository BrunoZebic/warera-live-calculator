import { useState } from 'react'
import type { FormEvent } from 'react'

import {
  WEAPON_AMMO_TYPES,
  createEmptyWeaponAmmoLoadout,
} from '../lib/equipmentRows'
import type { WeaponAmmoLoadout, WeaponAmmoType } from '../types'

interface AmmoLoadoutCardProps {
  capacity: number
  loadout: WeaponAmmoLoadout
  onChange: (nextLoadout: WeaponAmmoLoadout) => void
}

const AMMO_TITLES: Record<WeaponAmmoType, string> = {
  lightAmmo: 'Light',
  ammo: 'Standard',
  heavyAmmo: 'Heavy',
}

const DISPLAY_AMMO_TYPES: WeaponAmmoType[] = ['lightAmmo', 'ammo', 'heavyAmmo']

function clampCount(value: number): number {
  return Math.max(0, Math.floor(value))
}

function AmmoTypeIcon({ ammoType }: { ammoType: WeaponAmmoType }) {
  const bulletCount =
    ammoType === 'lightAmmo' ? 1 : ammoType === 'ammo' ? 2 : 3

  return (
    <span
      aria-hidden="true"
      className={`ammo-type-icon ammo-type-icon-${ammoType}`}
    >
      {Array.from({ length: bulletCount }).map((_, index) => (
        <span
          className={`ammo-type-bullet ammo-type-bullet-${ammoType}`}
          key={`${ammoType}-${index}`}
        />
      ))}
    </span>
  )
}

export function AmmoLoadoutCard({
  capacity,
  loadout,
  onChange,
}: AmmoLoadoutCardProps) {
  const [draftValues, setDraftValues] = useState<Record<WeaponAmmoType, string>>(() => ({
    heavyAmmo: String(loadout.heavyAmmo),
    ammo: String(loadout.ammo),
    lightAmmo: String(loadout.lightAmmo),
  }))

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

  function setAmmoTypeToMax(ammoType: WeaponAmmoType) {
    const nextLoadout = createEmptyWeaponAmmoLoadout()
    nextLoadout[ammoType] = capacity
    const nextDraftValues = {
      heavyAmmo: String(nextLoadout.heavyAmmo),
      ammo: String(nextLoadout.ammo),
      lightAmmo: String(nextLoadout.lightAmmo),
    }
    setDraftValues(nextDraftValues)
    onChange(nextLoadout)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    commitDraftValues()
  }

  return (
    <form
      className={`ammo-loadout-card${capacity <= 0 ? ' ammo-loadout-card-disabled' : ''}`}
      onSubmit={handleSubmit}
    >
      <div className="ammo-loadout-editor">
        {DISPLAY_AMMO_TYPES.map((ammoType) => (
          <div className="ammo-loadout-row" key={ammoType}>
            <div className="ammo-loadout-icon-shell" title={AMMO_TITLES[ammoType]}>
              <AmmoTypeIcon ammoType={ammoType} />
            </div>
            <input
              aria-label={`${AMMO_TITLES[ammoType]} ammo count`}
              className="text-input ammo-loadout-input"
              disabled={capacity <= 0}
              min={0}
              onBlur={() => commitDraftValues()}
              onChange={(event) => {
                setDraftValues((current) => ({
                  ...current,
                  [ammoType]: event.target.value,
                }))
              }}
              step="1"
              type="number"
              value={draftValues[ammoType] ?? '0'}
            />
            <button
              className="ammo-loadout-max"
              disabled={capacity <= 0}
              onClick={() => setAmmoTypeToMax(ammoType)}
              type="button"
            >
              Max
            </button>
          </div>
        ))}
      </div>
    </form>
  )
}
