import { json, jsonError } from '../_lib/http.ts'
import { getPricingQuote } from '../_lib/pricing.ts'

import type { PricingQuoteRequest } from '../../src/pricing/types.ts'

export const maxDuration = 60

export async function POST(request: Request) {
  let body: PricingQuoteRequest

  try {
    body = (await request.json()) as PricingQuoteRequest
  } catch {
    return jsonError('A JSON pricing request is required.', 400)
  }

  if (!Array.isArray(body.equipmentItems)) {
    return jsonError('equipmentItems must be an array.', 400)
  }

  try {
    const quote = await getPricingQuote(body)

    return json(quote, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Pricing quote request failed.', error)
    return jsonError('Pricing quote request failed.', 500)
  }
}
