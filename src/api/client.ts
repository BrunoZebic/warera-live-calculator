import { createAPIClient } from '@wareraprojects/api'

import type {
  WareraCurrentEquipmentResponse,
  WareraUserByIdResponse,
} from './types'

const apiBaseUrl = import.meta.env.VITE_API_BASE ?? 'https://api2.warera.io/trpc'

const baseClient = createAPIClient({
  url: apiBaseUrl,
})

/**
 * `_ce` is provided by `@wareraprojects/api@0.2.2` and lets us add
 * local typing for live endpoints that are available in the API but missing
 * from the published package surface.
 */
export const api = baseClient._ce<{
  'inventory.fetchCurrentEquipment': {
    input: { userId: string }
    output: WareraCurrentEquipmentResponse
  }
  'user.getUserById': {
    input: { userId: string }
    output: WareraUserByIdResponse
  }
}>()

export { apiBaseUrl }
