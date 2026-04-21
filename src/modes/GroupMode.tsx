import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { getPlayerSnapshot } from '../api/user'
import { BattleControls } from '../components/BattleControls'
import { GroupSummary } from '../components/GroupSummary'
import { ManualPlayerCard } from '../components/ManualPlayerCard'
import { PlayerCard } from '../components/PlayerCard'
import { SearchBox } from '../components/SearchBox'
import { createManualPlayer, createSelection } from '../lib/players'
import type {
  AmmoType,
  FoodInventory,
  ManualPlayerSnapshot,
  PlayerSelection,
  RuntimeConfig,
  SearchResult,
} from '../types'

interface GroupModeProps {
  config: RuntimeConfig
}

export function GroupMode({ config }: GroupModeProps) {
  const queryClient = useQueryClient()
  const [battleHours, setBattleHours] = useState(0)
  const [battleBonusPct, setBattleBonusPct] = useState(0)
  const [hoursAhead, setHoursAhead] = useState(0)
  const [players, setPlayers] = useState<PlayerSelection[]>([])
  const [addingPlayer, setAddingPlayer] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  async function handleAddPlayer(result: SearchResult) {
    setAddingPlayer(true)
    setLoadError(null)

    try {
      const snapshot = await queryClient.fetchQuery({
        queryKey: ['player-snapshot', result.id],
        queryFn: () => getPlayerSnapshot(result.id),
        staleTime: 60_000,
      })

      setPlayers((current) => {
        if (current.some((entry) => entry.snapshot.id === snapshot.id)) {
          return current
        }

        return [...current, createSelection(snapshot)]
      })
    } catch {
      setLoadError('Adding that player failed. You can still add a manual entry.')
    } finally {
      setAddingPlayer(false)
    }
  }

  return (
    <section className="mode-shell">
      <SearchBox label="Add live player" onSelect={handleAddPlayer} />

      <BattleControls
        battleHours={battleHours}
        battleBonusPct={battleBonusPct}
        hoursAhead={hoursAhead}
        onBattleHoursChange={setBattleHours}
        onBattleBonusChange={setBattleBonusPct}
        onHoursAheadChange={setHoursAhead}
        pillBuffDurationHours={config.pillBuffDurationHours}
      />

      <div className="panel simple-actions">
        <button
          className="ghost-button"
          onClick={() =>
            setPlayers((current) => [
              ...current,
              createSelection(createManualPlayer(config, `Manual ${current.length + 1}`)),
            ])
          }
          type="button"
        >
          Add manual player
        </button>
      </div>

      {loadError ? <div className="panel error-panel">{loadError}</div> : null}
      {addingPlayer ? <div className="panel empty-panel">Loading player snapshot...</div> : null}

      {players.length > 0 ? (
        <GroupSummary
          battleHours={battleHours}
          battleBonusPct={battleBonusPct}
          config={config}
          hoursAhead={hoursAhead}
          players={players}
        />
      ) : (
        <div className="panel empty-panel">
          Add players from the API or create manual entries to start the team
          calculation.
        </div>
      )}

      <div className="card-stack">
        {players.map((selection) =>
          selection.snapshot.source === 'live' ? (
            <PlayerCard
              battleBonusPct={battleBonusPct}
              battleHours={battleHours}
              config={config}
              hoursAhead={hoursAhead}
              key={selection.key}
              onAmmoChange={(ammoType: AmmoType) =>
                setPlayers((current) =>
                  current.map((entry) =>
                    entry.key === selection.key ? { ...entry, ammoType } : entry,
                  ),
                )
              }
              onAttackModifierChange={(attackModifier) =>
                setPlayers((current) =>
                  current.map((entry) =>
                    entry.key === selection.key
                      ? { ...entry, attackModifier }
                      : entry,
                  ),
                )
              }
              onEquipmentRowsChange={(equipmentRows) =>
                setPlayers((current) =>
                  current.map((entry) =>
                    entry.key === selection.key
                      ? { ...entry, equipmentRows }
                      : entry,
                  ),
                )
              }
              onLiveBaseSkillOverridesChange={(liveBaseSkillOverrides) =>
                setPlayers((current) =>
                  current.map((entry) =>
                    entry.key === selection.key
                      ? { ...entry, liveBaseSkillOverrides }
                      : entry,
                  ),
                )
              }
              onWeaponAmmoLoadoutsChange={(weaponAmmoLoadouts) =>
                setPlayers((current) =>
                  current.map((entry) =>
                    entry.key === selection.key
                      ? { ...entry, weaponAmmoLoadouts }
                      : entry,
                  ),
                )
              }
              onFoodInventoryChange={(foodInventory: FoodInventory) =>
                setPlayers((current) =>
                  current.map((entry) =>
                    entry.key === selection.key
                      ? { ...entry, foodInventory }
                      : entry,
                  ),
                )
              }
              onRemove={() =>
                setPlayers((current) =>
                  current.filter((entry) => entry.key !== selection.key),
                )
              }
              selection={selection}
            />
          ) : (
            <ManualPlayerCard
              battleBonusPct={battleBonusPct}
              battleHours={battleHours}
              config={config}
              hoursAhead={hoursAhead}
              key={selection.key}
              onAttackModifierChange={(attackModifier) =>
                setPlayers((current) =>
                  current.map((entry) =>
                    entry.key === selection.key
                      ? { ...entry, attackModifier }
                      : entry,
                  ),
                )
              }
              onAmmoChange={(ammoType: AmmoType) =>
                setPlayers((current) =>
                  current.map((entry) =>
                    entry.key === selection.key ? { ...entry, ammoType } : entry,
                  ),
                )
              }
              onFoodInventoryChange={(foodInventory: FoodInventory) =>
                setPlayers((current) =>
                  current.map((entry) =>
                    entry.key === selection.key
                      ? { ...entry, foodInventory }
                      : entry,
                  ),
                )
              }
              onRemove={() =>
                setPlayers((current) =>
                  current.filter((entry) => entry.key !== selection.key),
                )
              }
              onSnapshotChange={(snapshot: ManualPlayerSnapshot) =>
                setPlayers((current) =>
                  current.map((entry) =>
                    entry.key === selection.key ? { ...entry, snapshot } : entry,
                  ),
                )
              }
              selection={selection}
            />
          ),
        )}
      </div>
    </section>
  )
}
