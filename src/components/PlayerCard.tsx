import { useEffect, useRef, useState } from 'react'

import { calculateSelectionProjection } from '../damage/liveProjection'
import { EquipmentGrid } from './EquipmentGrid'
import { LiveSkillEditorPopover } from './LiveSkillEditorPopover'
import { ProjectionSummary } from './ProjectionSummary'
import {
  getAttackModifierPct,
  getSelectedPillAttackPct,
} from '../lib/players'
import {
  createWeaponAmmoLoadoutsFromRows,
  snapshotToEquipmentRows,
} from '../lib/equipmentRows'
import type {
  AttackModifierMode,
  FoodInventory,
  PlayerSelection,
  RuntimeConfig,
} from '../types'

interface PlayerCardProps {
  battleBonusPct: number
  config: RuntimeConfig
  followupRecoveryHours: number
  onAttackModifierChange: (attackModifier: AttackModifierMode) => void
  onEquipmentRowsChange: (rows: NonNullable<PlayerSelection['equipmentRows']>) => void
  onLiveSkillOverridesChange: (
    liveSkillOverrides: PlayerSelection['liveSkillOverrides'],
  ) => void
  onFoodInventoryChange: (foodInventory: FoodInventory) => void
  onWeaponAmmoLoadoutsChange: (
    weaponAmmoLoadouts: NonNullable<PlayerSelection['weaponAmmoLoadouts']>,
  ) => void
  onRemove?: () => void
  prepHours: number
  selection: PlayerSelection
}

export function PlayerCard({
  battleBonusPct,
  config,
  followupRecoveryHours,
  onAttackModifierChange,
  onEquipmentRowsChange,
  onLiveSkillOverridesChange,
  onFoodInventoryChange,
  onWeaponAmmoLoadoutsChange,
  onRemove,
  prepHours,
  selection,
}: PlayerCardProps) {
  const [skillEditorOpen, setSkillEditorOpen] = useState(false)
  const skillEditorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!skillEditorOpen) {
      return
    }

    function handleDocumentPointerDown(event: MouseEvent) {
      if (!skillEditorRef.current?.contains(event.target as Node)) {
        setSkillEditorOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSkillEditorOpen(false)
      }
    }

    document.addEventListener('mousedown', handleDocumentPointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleDocumentPointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [skillEditorOpen])

  const snapshot = selection.snapshot
  const selectedPillAttackPct = getSelectedPillAttackPct(selection, config)
  const attackModifierLabel =
    selection.attackModifier === 'none'
      ? 'none'
      : `${selectedPillAttackPct > 0 ? '+' : ''}${getAttackModifierPct(selection.attackModifier, selection, config)}%`
  const preview = calculateSelectionProjection({
    battleBonusPct,
    config,
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
          <div className="avatar-editor-anchor" ref={skillEditorRef}>
            <button
              aria-expanded={skillEditorOpen}
              aria-label={`Edit ${snapshot.username} skills`}
              className="avatar-chip avatar-button avatar-large"
              onClick={() => setSkillEditorOpen((current) => !current)}
              type="button"
            >
              {snapshot.avatarUrl ? (
                <img alt="" src={snapshot.avatarUrl} />
              ) : (
                snapshot.username.slice(0, 1).toUpperCase()
              )}
            </button>

            {skillEditorOpen ? (
              <LiveSkillEditorPopover
                config={config}
                onChange={onLiveSkillOverridesChange}
                onClose={() => setSkillEditorOpen(false)}
                onReset={() => onLiveSkillOverridesChange(undefined)}
                overrides={selection.liveSkillOverrides}
                snapshot={snapshot}
              />
            ) : null}
          </div>
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
        followupRecoveryHours={followupRecoveryHours}
        onAttackModifierChange={onAttackModifierChange}
        onFoodInventoryChange={onFoodInventoryChange}
        prepHours={prepHours}
        selection={selection}
      />
    </article>
  )
}
