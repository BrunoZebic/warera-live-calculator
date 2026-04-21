import type { EquipmentStatValues } from '../types'
import type { EquipmentPriceQuote } from './equipmentQuotes'

export interface PricingRequestEquipmentItem {
  itemId: string
  code: string
  maxState: number
  skills: EquipmentStatValues
  state: number
}

export interface PricingQuoteRequest {
  equipmentItems: PricingRequestEquipmentItem[]
}

export interface ConsumablePriceTable {
  lightAmmo: number
  ammo: number
  heavyAmmo: number
  bread: number
  steak: number
  cookedFish: number
  cocain: number
}

export interface EquipmentPriceQuoteResponseItem extends EquipmentPriceQuote {
  code: string
  itemId: string
}

export interface PricingQuoteResponse {
  generatedAt: string
  consumablePrices: ConsumablePriceTable
  equipmentQuotes: Record<string, EquipmentPriceQuoteResponseItem>
}
