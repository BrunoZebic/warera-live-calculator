import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { getPlayerSnapshot } from '../api/user'
import { BattleControls } from '../components/BattleControls'
import { PlayerCard } from '../components/PlayerCard'
import { SearchBox } from '../components/SearchBox'
import { createSelection, mergeSelectionWithSnapshot } from '../lib/players'
import type {
  FoodInventory,
  PlayerSelection,
  RuntimeConfig,
  SearchResult,
} from '../types'

interface SoloModeProps {
  config: RuntimeConfig
}

export function SoloMode({ config }: SoloModeProps) {
  const queryClient = useQueryClient()
  const [followupRecoveryHours, setFollowupRecoveryHours] = useState(0)
  const [battleBonusPct, setBattleBonusPct] = useState(0)
  const [prepHours, setPrepHours] = useState(0)
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

      setLiveSelection((current) =>
        current
          ? mergeSelectionWithSnapshot(current, snapshot)
          : createSelection(snapshot),
      )
    } catch {
      setLoadError('Loading that player failed. Try searching again.')
    } finally {
      setLoadingPlayer(false)
    }
  }

  return (
    <section className="mode-shell">
      <SearchBox label="Player search" onSelect={handleSelect} />

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

      {loadingPlayer ? (
        <div className="panel empty-panel">Loading player snapshot...</div>
      ) : null}

      {!loadingPlayer && liveSelection ? (
        <PlayerCard
          battleBonusPct={battleBonusPct}
          config={config}
          followupRecoveryHours={followupRecoveryHours}
          key={liveSelection.key}
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
          onLiveSkillOverridesChange={(liveSkillOverrides) =>
            setLiveSelection((current) =>
              current ? { ...current, liveSkillOverrides } : current,
            )
          }
          onFoodInventoryChange={(foodInventory: FoodInventory) =>
            setLiveSelection((current) =>
              current ? { ...current, foodInventory } : current,
            )
          }
          onWeaponAmmoLoadoutsChange={(weaponAmmoLoadouts) =>
            setLiveSelection((current) =>
              current ? { ...current, weaponAmmoLoadouts } : current,
            )
          }
          prepHours={prepHours}
          selection={liveSelection}
        />
      ) : null}

      {!loadingPlayer && !liveSelection && !loadError ? (
        <div className="panel empty-panel">
          Search for a player to load their current WarEra combat stats.
        </div>
      ) : null}
    </section>
  )
}
