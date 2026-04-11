import { useState } from 'react'
import type { FormEvent } from 'react'

import { createEmptyFoodInventory } from '../lib/players'
import type { AttackModifierMode, FoodInventory } from '../types'

interface FoodInventoryEditorProps {
  attackModifier: AttackModifierMode
  buffAttackPct: number
  currentHunger: number
  debuffAttackPct: number
  foodInventory: FoodInventory
  onChange: (foodInventory: FoodInventory) => void
  onAttackModifierChange: (attackModifier: AttackModifierMode) => void
}

type FoodKey = keyof FoodInventory

const FOOD_LABELS: Record<FoodKey, string> = {
  bread: 'Bread',
  steak: 'Steak',
  cookedFish: 'Fish',
}

function clampFoodCount(value: number): number {
  return Math.max(0, Math.floor(value))
}

function ForkKnifeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="food-hunger-icon"
      viewBox="0 0 24 24"
    >
      <path
        d="M6 3v6M8 3v6M7 3v18M13 3v8c0 1.1.9 2 2 2h1v8M18 3c0 3-1 5-3 6V3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function FoodTypeIcon({ foodType }: { foodType: FoodKey }) {
  switch (foodType) {
    case 'bread':
      return (
        <svg
          aria-hidden="true"
          className="food-inventory-item-icon"
          viewBox="0 0 24 24"
        >
          <path
            d="M7 10.5a3 3 0 0 1 5-2.2 3 3 0 0 1 5 2.2v5.2a2.3 2.3 0 0 1-2.3 2.3H9.3A2.3 2.3 0 0 1 7 15.7Z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
          <path
            d="M10 12.5h4M9.5 15h5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.5"
          />
        </svg>
      )
    case 'steak':
      return (
        <svg
          aria-hidden="true"
          className="food-inventory-item-icon"
          viewBox="0 0 24 24"
        >
          <path
            d="M12.3 6.5c3.8 0 6.7 2.3 6.7 5.6 0 3.1-2.5 5.4-6 5.4-2.2 0-3.5-.6-5.1-2.1-1.2-1.1-2.9-1.5-2.9-3.6 0-3.2 3.4-5.3 7.3-5.3Z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
          <circle cx="14.8" cy="11.7" r="1.2" fill="currentColor" />
        </svg>
      )
    case 'cookedFish':
      return (
        <svg
          aria-hidden="true"
          className="food-inventory-item-icon"
          viewBox="0 0 24 24"
        >
          <path
            d="M5 12c2.2-2.9 4.8-4.4 8.1-4.4 2.5 0 4.8.8 6.9 2.4L17.7 12l2.3 2c-2.1 1.6-4.4 2.4-6.9 2.4-3.3 0-5.9-1.5-8.1-4.4Z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
          <circle cx="10.2" cy="10.9" r="0.9" fill="currentColor" />
        </svg>
      )
  }
}

export function FoodInventoryEditor({
  attackModifier,
  buffAttackPct,
  currentHunger,
  debuffAttackPct,
  foodInventory,
  onChange,
  onAttackModifierChange,
}: FoodInventoryEditorProps) {
  const [draftValues, setDraftValues] = useState<Record<FoodKey, string>>(() => ({
    bread: String(foodInventory.bread),
    steak: String(foodInventory.steak),
    cookedFish: String(foodInventory.cookedFish),
  }))
  const maxUses = Math.max(0, Math.floor(currentHunger))

  function commitDraftValues(nextDraftValues: Record<FoodKey, string> = draftValues) {
    const nextInventory: FoodInventory = {
      bread: clampFoodCount(Number(nextDraftValues.bread ?? foodInventory.bread)),
      steak: clampFoodCount(Number(nextDraftValues.steak ?? foodInventory.steak)),
      cookedFish: clampFoodCount(
        Number(nextDraftValues.cookedFish ?? foodInventory.cookedFish),
      ),
    }

    setDraftValues({
      bread: String(nextInventory.bread),
      steak: String(nextInventory.steak),
      cookedFish: String(nextInventory.cookedFish),
    })
    onChange(nextInventory)
  }

  function adjustFoodCount(foodType: FoodKey, delta: number) {
    const parsed = Number(draftValues[foodType] ?? '')
    const baseValue = Number.isFinite(parsed) ? parsed : foodInventory[foodType]
    const nextDraftValues = {
      ...draftValues,
      [foodType]: String(clampFoodCount(baseValue + delta)),
    }

    setDraftValues(nextDraftValues)
    commitDraftValues(nextDraftValues)
  }

  function setFoodTypeToMax(foodType: FoodKey) {
    const nextInventory = createEmptyFoodInventory()
    nextInventory[foodType] = maxUses
    const nextDraftValues = {
      bread: String(nextInventory.bread),
      steak: String(nextInventory.steak),
      cookedFish: String(nextInventory.cookedFish),
    }

    setDraftValues(nextDraftValues)
    onChange(nextInventory)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    commitDraftValues()
  }

  return (
    <div className="food-inventory-panel">
      <div className="food-hunger-pill">
        <ForkKnifeIcon />
        <span>Hunger {currentHunger.toFixed(1)}</span>
      </div>

      <form className="food-inventory-form" onSubmit={handleSubmit}>
        {(Object.keys(FOOD_LABELS) as FoodKey[]).map((foodType) => (
          <div
            className={`food-inventory-item food-inventory-item-${foodType}`}
            key={foodType}
          >
            <div className="food-inventory-item-heading">
              <FoodTypeIcon foodType={foodType} />
              <strong className="food-inventory-item-label">{FOOD_LABELS[foodType]}</strong>
            </div>

            <div className="food-inventory-controls">
              <input
                className="text-input food-inventory-input"
                min={0}
                onBlur={() => commitDraftValues()}
                onChange={(event) =>
                  setDraftValues((current) => ({
                    ...current,
                    [foodType]: event.target.value,
                  }))
                }
                step="1"
                type="number"
                value={draftValues[foodType] ?? '0'}
              />

              <div className="food-inventory-buttons">
                <button
                  className="food-inventory-btn"
                  onClick={() => adjustFoodCount(foodType, 1)}
                  type="button"
                >
                  +
                </button>
                <button
                  className="food-inventory-btn"
                  onClick={() => adjustFoodCount(foodType, -1)}
                  type="button"
                >
                  -
                </button>
                <button
                  className="food-inventory-btn food-inventory-btn-max"
                  onClick={() => setFoodTypeToMax(foodType)}
                  type="button"
                >
                  Max
                </button>
              </div>
            </div>
          </div>
        ))}
      </form>

      <label className="food-pill-picker">
        <span>Pill</span>
        <select
          className="select-input food-pill-picker-select"
          onChange={(event) =>
            onAttackModifierChange(event.target.value as AttackModifierMode)
          }
          value={attackModifier}
        >
          <option value="none">No buff</option>
          <option value="buff">Buff (+{buffAttackPct}% attack)</option>
          <option value="debuff">Debuff (-{debuffAttackPct}% attack)</option>
        </select>
      </label>
    </div>
  )
}
