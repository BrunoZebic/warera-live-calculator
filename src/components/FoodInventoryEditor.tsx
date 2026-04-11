import { useState } from 'react'
import type { FormEvent } from 'react'

import { createEmptyFoodInventory } from '../lib/players'
import type { FoodInventory } from '../types'

interface FoodInventoryEditorProps {
  currentHunger: number
  foodInventory: FoodInventory
  onChange: (foodInventory: FoodInventory) => void
}

type FoodKey = keyof FoodInventory

const FOOD_LABELS: Record<FoodKey, string> = {
  bread: 'Bread',
  steak: 'Steak',
  cookedFish: 'Tuna',
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

export function FoodInventoryEditor({
  currentHunger,
  foodInventory,
  onChange,
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
        <span>{currentHunger.toFixed(1)} hunger</span>
      </div>

      <form className="food-inventory-grid" onSubmit={handleSubmit}>
        {(Object.keys(FOOD_LABELS) as FoodKey[]).map((foodType) => (
          <div
            className={`food-inventory-item food-inventory-item-${foodType}`}
            key={foodType}
          >
            <strong>{FOOD_LABELS[foodType]}</strong>

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
    </div>
  )
}
