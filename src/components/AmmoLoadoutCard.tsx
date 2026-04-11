import { useState } from 'react'
import type { FormEvent } from 'react'

import {
  createEmptyWeaponAmmoLoadout,
  rebalanceWeaponAmmoLoadout,
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

function parseDraftValue(value: string, fallbackValue: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? clampCount(parsed) : fallbackValue
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
  const [lastEditedAmmoType, setLastEditedAmmoType] =
    useState<WeaponAmmoType | null>(null)
  const [draftValues, setDraftValues] = useState<Record<WeaponAmmoType, string>>(() => ({
    heavyAmmo: String(loadout.heavyAmmo),
    ammo: String(loadout.ammo),
    lightAmmo: String(loadout.lightAmmo),
  }))

  function buildCommittedLoadout(
    nextDraftValues: Record<WeaponAmmoType, string>,
  ): WeaponAmmoLoadout {
    return {
      heavyAmmo: parseDraftValue(
        nextDraftValues.heavyAmmo,
        loadout.heavyAmmo,
      ),
      ammo: parseDraftValue(nextDraftValues.ammo, loadout.ammo),
      lightAmmo: parseDraftValue(
        nextDraftValues.lightAmmo,
        loadout.lightAmmo,
      ),
    }
  }

  function commitDraftValues(
    nextDraftValues: Record<WeaponAmmoType, string> = draftValues,
    preferredAmmoType: WeaponAmmoType | null = lastEditedAmmoType,
  ) {
    const nextLoadout = rebalanceWeaponAmmoLoadout(
      buildCommittedLoadout(nextDraftValues),
      capacity,
      preferredAmmoType,
    )
    setDraftValues({
      heavyAmmo: String(nextLoadout.heavyAmmo),
      ammo: String(nextLoadout.ammo),
      lightAmmo: String(nextLoadout.lightAmmo),
    })
    setLastEditedAmmoType(null)
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
    setLastEditedAmmoType(null)
    onChange(nextLoadout)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    commitDraftValues(draftValues, lastEditedAmmoType)
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
              onBlur={() => commitDraftValues(draftValues, ammoType)}
              onChange={(event) => {
                setLastEditedAmmoType(ammoType)
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
