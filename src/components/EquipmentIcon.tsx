import type { EquipmentSummary } from '../types'

interface EquipmentIconProps {
  slot: EquipmentSummary['slot']
}

function SlotShape({ slot }: { slot: EquipmentSummary['slot'] }) {
  switch (slot) {
    case 'weapon':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path
            d="M5 18L18 5M14 5h4v4M6 14l4 4M4 20l3-1 1-3"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.9"
          />
        </svg>
      )
    case 'helmet':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path
            d="M6 13a6 6 0 1112 0v2H6v-2zm2 2v3h8v-3"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.9"
          />
        </svg>
      )
    case 'chest':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path
            d="M9 4h6l2 3 3 2-2 10H6L4 9l3-2 2-3z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.9"
          />
        </svg>
      )
    case 'pants':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path
            d="M8 4h8l1 15h-4l-1-6-1 6H7L8 4z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.9"
          />
        </svg>
      )
    case 'boots':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path
            d="M8 5v7l4 2h5v4H7l-2-2v-3h3V5h0z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.9"
          />
        </svg>
      )
    case 'gloves':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path
            d="M8 11V6m3 5V5m3 7V7m-8 4l1 7h9l1-6-3-2-2 1-2-1-2 1-2-1z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.9"
          />
        </svg>
      )
  }
}

export function EquipmentIcon({ slot }: EquipmentIconProps) {
  return (
    <span className="equipment-icon" aria-hidden="true">
      <SlotShape slot={slot} />
    </span>
  )
}
