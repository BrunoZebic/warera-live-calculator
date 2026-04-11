import { calculateSelectionProjection } from '../damage/liveProjection'
import { EquipmentGrid } from './EquipmentGrid'
import { ProjectionSummary } from './ProjectionSummary'
import {
  getAttackModifierPct,
  getFoodRestorePct,
  getSelectedPillAttackPct,
} from '../lib/players'
import {
  createWeaponAmmoLoadoutsFromRows,
  snapshotToEquipmentRows,
} from '../lib/equipmentRows'
import type {
  AmmoType,
  AttackModifierMode,
  FoodType,
  PlayerSelection,
  RuntimeConfig,
} from '../types'

interface PlayerCardProps {
  battleBonusPct: number
  config: RuntimeConfig
  hoursAhead: number
  onAmmoChange: (ammoType: AmmoType) => void
  onAttackModifierChange: (attackModifier: AttackModifierMode) => void
  onEquipmentRowsChange: (rows: NonNullable<PlayerSelection['equipmentRows']>) => void
  onWeaponAmmoLoadoutsChange: (
    weaponAmmoLoadouts: NonNullable<PlayerSelection['weaponAmmoLoadouts']>,
  ) => void
  onFoodChange: (foodType: FoodType) => void
  onRemove?: () => void
  selection: PlayerSelection
}

export function PlayerCard({
  battleBonusPct,
  config,
  hoursAhead,
  onAmmoChange,
  onAttackModifierChange,
  onEquipmentRowsChange,
  onWeaponAmmoLoadoutsChange,
  onFoodChange,
  onRemove,
  selection,
}: PlayerCardProps) {
  if (selection.snapshot.source !== 'live') {
    return null
  }

  const snapshot = selection.snapshot
  const foodRestorePct = getFoodRestorePct(selection.foodType, config)
  const selectedPillAttackPct = getSelectedPillAttackPct(selection, config)
  const attackModifierLabel =
    selection.attackModifier === 'none'
      ? 'none'
      : `${selectedPillAttackPct > 0 ? '+' : ''}${getAttackModifierPct(selection.attackModifier, selection, config)}%`
  const preview = calculateSelectionProjection({
    battleBonusPct,
    config,
    foodRestorePct,
    pillAttackBonusPct: selectedPillAttackPct,
    selection,
  })
  const equipmentRows = selection.equipmentRows ?? snapshotToEquipmentRows(snapshot)
  const weaponAmmoLoadouts =
    selection.weaponAmmoLoadouts ??
    createWeaponAmmoLoadoutsFromRows(equipmentRows, snapshot.currentAmmoType)

  return (
    <article className="panel player-card">
      <div className="card-header">
        <div className="identity-row">
          <span className="avatar-chip avatar-large" aria-hidden="true">
            {snapshot.avatarUrl ? (
              <img alt="" src={snapshot.avatarUrl} />
            ) : (
              snapshot.username.slice(0, 1).toUpperCase()
            )}
          </span>
          <div>
            <h3>{snapshot.username}</h3>
            <p>
              Live snapshot from WarEra API
              {snapshot.weaponCode ? ` - ${snapshot.weaponCode}` : ''}
            </p>
          </div>
        </div>

        {onRemove ? (
          <button className="ghost-button" onClick={onRemove} type="button">
            Remove
          </button>
        ) : null}
      </div>

      <div className="stat-chip-row">
        <span className="stat-chip">
          Attack {preview.openingProjection.attackWithSelectedModifiers.toFixed(1)}
        </span>
        <span className="stat-chip">
          Precision {preview.openingInput.precisionPct.toFixed(1)}%
        </span>
        <span className="stat-chip">
          Crit {preview.openingInput.criticalChancePct.toFixed(1)}%
        </span>
        <span className="stat-chip">
          Attack mod {attackModifierLabel}
        </span>
        <span className="stat-chip">
          Crit dmg {preview.openingInput.critDamagePct.toFixed(1)}%
        </span>
        <span className="stat-chip">
          Armor {preview.openingInput.armorPct.toFixed(1)}%
        </span>
        <span className="stat-chip">
          Dodge {preview.openingInput.dodgePct.toFixed(1)}%
        </span>
      </div>

      <EquipmentGrid
        config={config}
        defaultAmmoType={snapshot.currentAmmoType}
        onRowsChange={onEquipmentRowsChange}
        onWeaponAmmoLoadoutsChange={onWeaponAmmoLoadoutsChange}
        rows={equipmentRows}
        weaponAmmoLoadouts={weaponAmmoLoadouts}
      />

      <ProjectionSummary
        battleBonusPct={battleBonusPct}
        config={config}
        hoursAhead={hoursAhead}
        onAttackModifierChange={onAttackModifierChange}
        onAmmoChange={onAmmoChange}
        onFoodChange={onFoodChange}
        selection={selection}
      />
    </article>
  )
}
