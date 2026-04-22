import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { getPlayerSnapshot } from '../api/user'
import { BattleControls } from '../components/BattleControls'
import { GroupSummary } from '../components/GroupSummary'
import { PlayerCard } from '../components/PlayerCard'
import { SearchBox } from '../components/SearchBox'
import { createSelection } from '../lib/players'
import type {
  FoodInventory,
  PlayerSelection,
  RuntimeConfig,
  SearchResult,
} from '../types'

interface GroupModeProps {
  config: RuntimeConfig
}

export function GroupMode({ config }: GroupModeProps) {
  const queryClient = useQueryClient()
  const [followupRecoveryHours, setFollowupRecoveryHours] = useState(0)
  const [battleBonusPct, setBattleBonusPct] = useState(0)
  const [prepHours, setPrepHours] = useState(0)
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
      setLoadError('Adding that player failed. Try searching again.')
    } finally {
      setAddingPlayer(false)
    }
  }

  return (
    <section className="mode-shell">
      <SearchBox label="Add live player" onSelect={handleAddPlayer} />

      <BattleControls
        battleBonusPct={battleBonusPct}
        followupRecoveryHours={followupRecoveryHours}
        onBattleBonusChange={setBattleBonusPct}
        onFollowupRecoveryHoursChange={setFollowupRecoveryHours}
        onPrepHoursChange={setPrepHours}
        pillBuffDurationHours={config.pillBuffDurationHours}
        prepHours={prepHours}
      />

      {loadError ? <div className="panel error-panel">{loadError}</div> : null}
      {addingPlayer ? <div className="panel empty-panel">Loading player snapshot...</div> : null}

      {players.length > 0 ? (
        <GroupSummary
          battleBonusPct={battleBonusPct}
          config={config}
          followupRecoveryHours={followupRecoveryHours}
          players={players}
          prepHours={prepHours}
        />
      ) : (
        <div className="panel empty-panel">
          Add live players from the API to start the team calculation.
        </div>
      )}

      <div className="card-stack">
        {players.map((selection) => (
          <PlayerCard
            battleBonusPct={battleBonusPct}
            config={config}
            followupRecoveryHours={followupRecoveryHours}
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
            onEquipmentRowsChange={(equipmentRows) =>
              setPlayers((current) =>
                current.map((entry) =>
                  entry.key === selection.key
                    ? { ...entry, equipmentRows }
                    : entry,
                ),
              )
            }
            onLiveSkillOverridesChange={(liveSkillOverrides) =>
              setPlayers((current) =>
                current.map((entry) =>
                  entry.key === selection.key
                    ? { ...entry, liveSkillOverrides }
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
            prepHours={prepHours}
            selection={selection}
          />
        ))}
      </div>
    </section>
  )
}
