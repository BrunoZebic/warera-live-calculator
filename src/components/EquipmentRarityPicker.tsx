import { useEffect, useRef } from 'react'

import { EquipmentIcon } from './EquipmentIcon'
import type { EquipmentItemMeta, EquipmentSlot } from '../types'

interface EquipmentRarityPickerProps {
  items: EquipmentItemMeta[]
  onClose: () => void
  onSelect: (meta: EquipmentItemMeta) => void
  slot: EquipmentSlot
}

export function EquipmentRarityPicker({
  items,
  onClose,
  onSelect,
  slot,
}: EquipmentRarityPickerProps) {
  const pickerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) {
        onClose()
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div className="equipment-rarity-picker" ref={pickerRef} role="dialog">
      {items.map((item) => (
        <button
          className={`equipment-rarity-picker-item equipment-pill-rarity-${item.rarity}`}
          key={item.code}
          onClick={() => onSelect(item)}
          title={`Use ${item.rarity} ${slot}`}
          type="button"
        >
          <EquipmentIcon slot={slot} />
          <span>{item.rarity.slice(0, 1).toUpperCase()}</span>
        </button>
      ))}
    </div>
  )
}
