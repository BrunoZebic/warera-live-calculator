import {
  buildLiveSkillOverrides,
  formatSkillEffectValue,
  getSkillIncrementCost,
  getSkillRefund,
  LIVE_SKILL_GROUPS,
  LIVE_SKILL_LABELS,
  resolveLiveSkillPlan,
} from '../lib/liveSkills'
import { formatPreciseNumber } from '../lib/players'
import type {
  LiveSkillKey,
  LiveSkillLevelMap,
  LiveSkillOverrides,
  PlayerSnapshot,
  RuntimeConfig,
} from '../types'

interface LiveSkillEditorPopoverProps {
  config: RuntimeConfig
  onChange: (nextOverrides: LiveSkillOverrides | undefined) => void
  onClose: () => void
  onReset: () => void
  overrides?: LiveSkillOverrides
  snapshot: PlayerSnapshot
}

function getCompanyDeltaCopy(nextCompanies: number, liveCompanies: number): string {
  const difference = Math.round(nextCompanies - liveCompanies)

  if (difference < 0) {
    return `Disable ${Math.abs(difference)} compan${Math.abs(difference) === 1 ? 'y' : 'ies'}`
  }

  if (difference > 0) {
    return `+${difference} compan${difference === 1 ? 'y' : 'ies'}`
  }

  return 'No company change'
}

export function LiveSkillEditorPopover({
  config,
  onChange,
  onClose,
  onReset,
  overrides,
  snapshot,
}: LiveSkillEditorPopoverProps) {
  const plan = resolveLiveSkillPlan(snapshot, overrides, config)

  function commitPlan(
    playerLevel: number,
    skillLevels: LiveSkillLevelMap,
  ) {
    onChange(buildLiveSkillOverrides(snapshot, playerLevel, skillLevels))
  }

  function handlePlayerLevelStep(delta: -1 | 1) {
    const nextPlayerLevel = Math.max(0, plan.playerLevel + delta)
    if (nextPlayerLevel === plan.playerLevel) {
      return
    }

    const nextTotalSkillPoints =
      snapshot.totalSkillPoints + (nextPlayerLevel - snapshot.level) * 4
    if (nextTotalSkillPoints < plan.spentSkillPoints) {
      return
    }

    commitPlan(nextPlayerLevel, plan.skillLevels)
  }

  function handleSkillStep(
    key: LiveSkillKey,
    delta: -1 | 1,
  ) {
    const currentLevel = plan.skillLevels[key]

    if (delta < 0) {
      if (currentLevel <= 0) {
        return
      }

      commitPlan(plan.playerLevel, {
        ...plan.skillLevels,
        [key]: currentLevel - 1,
      })
      return
    }

    const nextCost = getSkillIncrementCost(currentLevel)
    if (plan.availableSkillPoints < nextCost) {
      return
    }

    commitPlan(plan.playerLevel, {
      ...plan.skillLevels,
      [key]: currentLevel + 1,
    })
  }

  const canDecreasePlayerLevel =
    plan.playerLevel > 0 &&
    snapshot.totalSkillPoints + (plan.playerLevel - 1 - snapshot.level) * 4 >=
      plan.spentSkillPoints

  return (
    <div className="live-skill-popover">
      <div className="live-skill-popover-header">
        <div>
          <strong>Skill planner</strong>
          <small>
            Attack scaling x{formatPreciseNumber(snapshot.liveCombatBase.attackPercentMultiplier)}
          </small>
        </div>

        <button
          className="live-skill-popover-close"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>

      <div className="live-skill-budget-grid">
        <div className="live-skill-budget-card live-skill-budget-card-level">
          <span>Player level</span>
          <div className="live-skill-stepper">
            <button
              className="ghost-button live-skill-step-button"
              disabled={!canDecreasePlayerLevel}
              onClick={() => handlePlayerLevelStep(-1)}
              type="button"
            >
              -
            </button>
            <strong>{plan.playerLevel}</strong>
            <button
              className="ghost-button live-skill-step-button"
              onClick={() => handlePlayerLevelStep(1)}
              type="button"
            >
              +
            </button>
          </div>
          <small>Live {snapshot.level}</small>
        </div>

        <div className="live-skill-budget-card">
          <span>Total SP</span>
          <strong>{plan.totalSkillPoints}</strong>
          <small>Live {snapshot.totalSkillPoints}</small>
        </div>

        <div className="live-skill-budget-card">
          <span>Available SP</span>
          <strong>{plan.availableSkillPoints}</strong>
          <small>Live {snapshot.availableSkillPoints}</small>
        </div>

        <div className="live-skill-budget-card">
          <span>Spent SP</span>
          <strong>{plan.spentSkillPoints}</strong>
          <small>Live {snapshot.spentSkillPoints}</small>
        </div>
      </div>

      <div className="live-skill-group-stack">
        {LIVE_SKILL_GROUPS.map((group) => (
          <section className="live-skill-group" key={group.title}>
            <div className="live-skill-group-header">
              <strong>{group.title}</strong>
              <small>{group.description}</small>
            </div>

            <div className="live-skill-row-list">
              {group.keys.map((key) => {
                const currentLevel = plan.skillLevels[key]
                const currentValue = plan.skillValues[key]
                const liveSkill = snapshot.liveSkills[key]
                const nextCost = getSkillIncrementCost(currentLevel)
                const refund = getSkillRefund(currentLevel)
                const companyCopy =
                  key === 'companies'
                    ? getCompanyDeltaCopy(currentValue, liveSkill.value)
                    : null

                return (
                  <div className="live-skill-row" key={key}>
                    <div className="live-skill-row-copy">
                      <strong>{LIVE_SKILL_LABELS[key]}</strong>
                      <small>
                        Lv {currentLevel} now
                        {companyCopy ? ` - ${companyCopy}` : ''}
                      </small>
                    </div>

                    <div className="live-skill-row-value">
                      <strong>{formatSkillEffectValue(key, currentValue)}</strong>
                      <small>
                        Live {formatSkillEffectValue(key, liveSkill.value)}
                      </small>
                    </div>

                    <div className="live-skill-row-controls">
                      <button
                        className="ghost-button live-skill-step-button"
                        disabled={currentLevel <= 0}
                        onClick={() => handleSkillStep(key, -1)}
                        type="button"
                      >
                        -
                      </button>
                      <button
                        className="ghost-button live-skill-step-button"
                        disabled={plan.availableSkillPoints < nextCost}
                        onClick={() => handleSkillStep(key, 1)}
                        type="button"
                      >
                        +
                      </button>
                    </div>

                    <div className="live-skill-row-costs">
                      <small>Next + costs {nextCost} SP</small>
                      <small>- refunds {refund} SP</small>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="live-skill-popover-actions">
        <small>
          Available points update live from player level and every skill change.
        </small>
        <button className="ghost-button" onClick={onReset} type="button">
          Reset to live
        </button>
      </div>
    </div>
  )
}
