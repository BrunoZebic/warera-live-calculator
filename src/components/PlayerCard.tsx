import { ProjectionSummary } from './ProjectionSummary'
import { EquipmentIcon } from './EquipmentIcon'
import { getItemRarity } from '../lib/players'
import type { AmmoType, FoodType, PlayerSelection, RuntimeConfig } from '../types'

interface PlayerCardProps {
  battleBonusPct: number
  config: RuntimeConfig
  hoursAhead: number
  onAmmoChange: (ammoType: AmmoType) => void
  onFoodChange: (foodType: FoodType) => void
  onPillChange: (pillActive: boolean) => void
  onRemove?: () => void
  selection: PlayerSelection
}

export function PlayerCard({
  battleBonusPct,
  config,
  hoursAhead,
  onAmmoChange,
  onFoodChange,
  onPillChange,
  onRemove,
  selection,
}: PlayerCardProps) {
  if (selection.snapshot.source !== 'live') {
    return null
  }

  const snapshot = selection.snapshot

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
        <span className="stat-chip">Attack {snapshot.attackTotal.toFixed(1)}</span>
        <span className="stat-chip">Precision {snapshot.precisionPct.toFixed(1)}%</span>
        <span className="stat-chip">
          Crit {snapshot.criticalChancePct.toFixed(1)}%
        </span>
        <span className="stat-chip">
          Pill {selection.pillActive ? `+${snapshot.detectedPillAttackPct || config.pillAttackBonusPct}%` : 'off'}
        </span>
        <span className="stat-chip">
          Crit dmg {snapshot.critDamagePct.toFixed(1)}%
        </span>
        <span className="stat-chip">Armor {snapshot.armorPct.toFixed(1)}%</span>
        <span className="stat-chip">Dodge {snapshot.dodgePct.toFixed(1)}%</span>
      </div>

      <div className="equipment-grid">
        {snapshot.equipment.map((item) => (
          <div
            className={`equipment-pill equipment-pill-rarity-${getItemRarity(item.code, config)}`}
            key={`${snapshot.id}-${item.slot}`}
            title={`${item.slot} (${item.state}/${item.maxState})`}
          >
            <EquipmentIcon slot={item.slot} />
            <strong>{item.slot}</strong>
            <small>
              {item.state}/{item.maxState}
            </small>
          </div>
        ))}
      </div>

      <ProjectionSummary
        battleBonusPct={battleBonusPct}
        config={config}
        hoursAhead={hoursAhead}
        onAmmoChange={onAmmoChange}
        onFoodChange={onFoodChange}
        onPillChange={onPillChange}
        selection={selection}
      />
    </article>
  )
}
