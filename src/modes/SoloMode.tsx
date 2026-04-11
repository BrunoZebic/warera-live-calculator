import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { getPlayerSnapshot } from '../api/user'
import { BattleControls } from '../components/BattleControls'
import { ManualPlayerCard } from '../components/ManualPlayerCard'
import { PlayerCard } from '../components/PlayerCard'
import { SearchBox } from '../components/SearchBox'
import { createManualPlayer, createSelection } from '../lib/players'
import type {
  AmmoType,
  FoodType,
  ManualPlayerSnapshot,
  PlayerSelection,
  RuntimeConfig,
  SearchResult,
} from '../types'

interface SoloModeProps {
  config: RuntimeConfig
}

export function SoloMode({ config }: SoloModeProps) {
  const queryClient = useQueryClient()
  const [battleBonusPct, setBattleBonusPct] = useState(0)
  const [hoursAhead, setHoursAhead] = useState(0)
  const [manualMode, setManualMode] = useState(false)
  const [manualSelection, setManualSelection] = useState<PlayerSelection>(() =>
    createSelection(createManualPlayer(config)),
  )
  const [liveSelection, setLiveSelection] = useState<PlayerSelection | null>(null)
  const [loadingPlayer, setLoadingPlayer] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  async function handleSelect(result: SearchResult) {
    setLoadingPlayer(true)
    setLoadError(null)

    try {
      const snapshot = await queryClient.fetchQuery({
        queryKey: ['player-snapshot', result.id],
        queryFn: () => getPlayerSnapshot(result.id),
        staleTime: 60_000,
      })

      setLiveSelection((current) => {
        const nextSelection = createSelection(snapshot)

        if (current?.snapshot.id === snapshot.id) {
          return {
            ...nextSelection,
            ammoType: current.ammoType,
            foodType: current.foodType,
            attackModifier: current.attackModifier,
          }
        }

        return nextSelection
      })
    } catch {
      setLoadError(
        'Loading that player failed. You can still calculate with the manual mode.',
      )
    } finally {
      setLoadingPlayer(false)
    }
  }

  return (
    <section className="mode-shell">
      {!manualMode ? (
        <>
          <SearchBox label="Player search" onSelect={handleSelect} />

          <BattleControls
            battleBonusPct={battleBonusPct}
            hoursAhead={hoursAhead}
            onBattleBonusChange={setBattleBonusPct}
            onHoursAheadChange={setHoursAhead}
          />

          <div className="panel simple-actions">
            <button
              className="ghost-button"
              onClick={() => setManualMode((current) => !current)}
              type="button"
            >
              Use manual mode instead
            </button>
          </div>

          {loadError ? <div className="panel error-panel">{loadError}</div> : null}

          {loadingPlayer ? (
            <div className="panel empty-panel">Loading player snapshot...</div>
          ) : null}

          {!loadingPlayer && liveSelection ? (
            <PlayerCard
              battleBonusPct={battleBonusPct}
              config={config}
              hoursAhead={hoursAhead}
              onAmmoChange={(ammoType: AmmoType) =>
                setLiveSelection((current) =>
                  current ? { ...current, ammoType } : current,
                )
              }
              onAttackModifierChange={(attackModifier) =>
                setLiveSelection((current) =>
                  current ? { ...current, attackModifier } : current,
                )
              }
              onEquipmentRowsChange={(equipmentRows) =>
                setLiveSelection((current) =>
                  current ? { ...current, equipmentRows } : current,
                )
              }
              onFoodChange={(foodType: FoodType) =>
                setLiveSelection((current) =>
                  current ? { ...current, foodType } : current,
                )
              }
              selection={liveSelection}
            />
          ) : null}

          {!loadingPlayer && !liveSelection && !loadError ? (
            <div className="panel empty-panel">
              Search for a player to load their current WarEra combat stats.
            </div>
          ) : null}
        </>
      ) : (
        <>
          <BattleControls
            battleBonusPct={battleBonusPct}
            hoursAhead={hoursAhead}
            onBattleBonusChange={setBattleBonusPct}
            onHoursAheadChange={setHoursAhead}
          />

          <div className="panel simple-actions">
            <button
              className="ghost-button"
              onClick={() => setManualMode(false)}
              type="button"
            >
              Back to API lookup
            </button>
          </div>

          <ManualPlayerCard
            battleBonusPct={battleBonusPct}
            config={config}
            hoursAhead={hoursAhead}
            onAttackModifierChange={(attackModifier) =>
              setManualSelection((current) => ({ ...current, attackModifier }))
            }
            onAmmoChange={(ammoType: AmmoType) =>
              setManualSelection((current) => ({ ...current, ammoType }))
            }
            onFoodChange={(foodType: FoodType) =>
              setManualSelection((current) => ({ ...current, foodType }))
            }
            onSnapshotChange={(snapshot: ManualPlayerSnapshot) =>
              setManualSelection((current) => ({ ...current, snapshot }))
            }
            selection={manualSelection}
          />
        </>
      )}
    </section>
  )
}
