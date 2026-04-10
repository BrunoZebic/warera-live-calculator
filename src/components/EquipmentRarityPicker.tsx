import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { RefObject } from 'react'

import { EquipmentIcon } from './EquipmentIcon'
import type { EquipmentItemMeta, EquipmentSlot } from '../types'

interface EquipmentRarityPickerProps {
  anchorRef: RefObject<HTMLDivElement | null>
  items: EquipmentItemMeta[]
  onClose: () => void
  onSelect: (meta: EquipmentItemMeta) => void
  slot: EquipmentSlot
}

export function EquipmentRarityPicker({
  anchorRef,
  items,
  onClose,
  onSelect,
  slot,
}: EquipmentRarityPickerProps) {
  const pickerRef = useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = useState<{
    left: number
    top: number
    placeBelow: boolean
  } | null>(null)

  useLayoutEffect(() => {
    function updatePosition() {
      const anchor = anchorRef.current
      const picker = pickerRef.current
      if (!anchor || !picker) {
        return
      }

      const anchorRect = anchor.getBoundingClientRect()
      const pickerHeight = picker.offsetHeight
      const gap = 8
      const placeBelow = anchorRect.top < pickerHeight + gap + 12

      setPosition({
        left: anchorRect.left + anchorRect.width / 2,
        top: placeBelow ? anchorRect.bottom + gap : anchorRect.top - gap,
        placeBelow,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [anchorRef, items.length])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const targetNode = event.target as Node
      if (
        !pickerRef.current?.contains(targetNode) &&
        !anchorRef.current?.contains(targetNode)
      ) {
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
  }, [anchorRef, onClose])

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      className={`equipment-rarity-picker ${position?.placeBelow ? 'equipment-rarity-picker-below' : ''}`}
      ref={pickerRef}
      role="dialog"
      style={
        position
          ? {
              left: `${position.left}px`,
              top: `${position.top}px`,
            }
          : {
              visibility: 'hidden',
            }
      }
    >
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
    </div>,
    document.body,
  )
}
