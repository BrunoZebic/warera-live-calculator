import { ProjectionSummary } from './ProjectionSummary'
import type {
  AmmoType,
  AttackModifierMode,
  FoodType,
  ManualPlayerSnapshot,
  PlayerSelection,
  RuntimeConfig,
} from '../types'

interface ManualPlayerCardProps {
  battleBonusPct: number
  config: RuntimeConfig
  hoursAhead: number
  onAttackModifierChange: (attackModifier: AttackModifierMode) => void
  onAmmoChange: (ammoType: AmmoType) => void
  onFoodChange: (foodType: FoodType) => void
  onRemove?: () => void
  onSnapshotChange: (snapshot: ManualPlayerSnapshot) => void
  selection: PlayerSelection
}

function toNumber(value: string, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function ManualPlayerCard({
  battleBonusPct,
  config,
  hoursAhead,
  onAttackModifierChange,
  onAmmoChange,
  onFoodChange,
  onRemove,
  onSnapshotChange,
  selection,
}: ManualPlayerCardProps) {
  if (selection.snapshot.source !== 'manual') {
    return null
  }

  const snapshot = selection.snapshot

  function patchSnapshot<K extends keyof ManualPlayerSnapshot>(
    key: K,
    value: ManualPlayerSnapshot[K],
  ) {
    onSnapshotChange({
      ...snapshot,
      [key]: value,
    })
  }

  return (
    <article className="panel player-card manual-card">
      <div className="card-header">
        <div>
          <h3>Manual calculator</h3>
          <p>Fallback entry for API outages or quick custom scenarios.</p>
        </div>

        {onRemove ? (
          <button className="ghost-button" onClick={onRemove} type="button">
            Remove
          </button>
        ) : null}
      </div>

      <div className="manual-grid">
        <label className="field-label">
          <span>Player label</span>
          <input
            className="text-input"
            onChange={(event) => patchSnapshot('username', event.target.value)}
            type="text"
            value={snapshot.username}
          />
        </label>

        <label className="field-label">
          <span>Weapon label</span>
          <input
            className="text-input"
            onChange={(event) => patchSnapshot('weaponCode', event.target.value)}
            type="text"
            value={snapshot.weaponCode ?? ''}
          />
        </label>

        <label className="field-label">
          <span>Current health</span>
          <input
            className="text-input"
            onChange={(event) =>
              patchSnapshot(
                'currentHealth',
                toNumber(event.target.value, snapshot.currentHealth),
              )
            }
            step="0.1"
            type="number"
            value={snapshot.currentHealth}
          />
        </label>

        <label className="field-label">
          <span>Max health</span>
          <input
            className="text-input"
            onChange={(event) =>
              patchSnapshot(
                'maxHealth',
                toNumber(event.target.value, snapshot.maxHealth),
              )
            }
            step="0.1"
            type="number"
            value={snapshot.maxHealth}
          />
        </label>

        <label className="field-label">
          <span>Current hunger</span>
          <input
            className="text-input"
            onChange={(event) =>
              patchSnapshot(
                'currentHunger',
                toNumber(event.target.value, snapshot.currentHunger),
              )
            }
            step="0.1"
            type="number"
            value={snapshot.currentHunger}
          />
        </label>

        <label className="field-label">
          <span>Max hunger</span>
          <input
            className="text-input"
            onChange={(event) =>
              patchSnapshot(
                'maxHunger',
                toNumber(event.target.value, snapshot.maxHunger),
              )
            }
            step="0.1"
            type="number"
            value={snapshot.maxHunger}
          />
        </label>

        <label className="field-label">
          <span>Health regen / hour</span>
          <input
            className="text-input"
            onChange={(event) =>
              patchSnapshot(
                'healthHourlyRegen',
                toNumber(event.target.value, snapshot.healthHourlyRegen),
              )
            }
            step="0.1"
            type="number"
            value={snapshot.healthHourlyRegen}
          />
        </label>

        <label className="field-label">
          <span>Hunger regen / hour</span>
          <input
            className="text-input"
            onChange={(event) =>
              patchSnapshot(
                'hungerHourlyRegen',
                toNumber(event.target.value, snapshot.hungerHourlyRegen),
              )
            }
            step="0.1"
            type="number"
            value={snapshot.hungerHourlyRegen}
          />
        </label>

        <label className="field-label">
          <span>Attack before ammo/pill</span>
          <input
            className="text-input"
            onChange={(event) =>
              patchSnapshot(
                'attackPreAmmo',
                toNumber(event.target.value, snapshot.attackPreAmmo),
              )
            }
            step="0.1"
            type="number"
            value={snapshot.attackPreAmmo}
          />
        </label>

        <label className="field-label">
          <span>Precision %</span>
          <input
            className="text-input"
            onChange={(event) =>
              patchSnapshot(
                'precisionPct',
                toNumber(event.target.value, snapshot.precisionPct),
              )
            }
            step="0.1"
            type="number"
            value={snapshot.precisionPct}
          />
        </label>

        <label className="field-label">
          <span>Crit chance %</span>
          <input
            className="text-input"
            onChange={(event) =>
              patchSnapshot(
                'criticalChancePct',
                toNumber(event.target.value, snapshot.criticalChancePct),
              )
            }
            step="0.1"
            type="number"
            value={snapshot.criticalChancePct}
          />
        </label>

        <label className="field-label">
          <span>Crit damage bonus %</span>
          <input
            className="text-input"
            onChange={(event) =>
              patchSnapshot(
                'critDamagePct',
                toNumber(event.target.value, snapshot.critDamagePct),
              )
            }
            step="0.1"
            title="50 means crits deal 1.5x base damage. 100 means 2.0x."
            type="number"
            value={snapshot.critDamagePct}
          />
        </label>

        <label className="field-label">
          <span>Armor %</span>
          <input
            className="text-input"
            onChange={(event) =>
              patchSnapshot(
                'armorPct',
                toNumber(event.target.value, snapshot.armorPct),
              )
            }
            step="0.1"
            type="number"
            value={snapshot.armorPct}
          />
        </label>

        <label className="field-label">
          <span>Dodge %</span>
          <input
            className="text-input"
            onChange={(event) =>
              patchSnapshot(
                'dodgePct',
                toNumber(event.target.value, snapshot.dodgePct),
              )
            }
            step="0.1"
            type="number"
            value={snapshot.dodgePct}
          />
        </label>
      </div>

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
