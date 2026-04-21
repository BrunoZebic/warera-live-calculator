import type {
  PricingQuoteRequest,
  PricingQuoteResponse,
} from '../pricing/types'

const PRICING_API_BASE = '/api/pricing'

export class PricingApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'PricingApiError'
    this.status = status
  }
}

async function readErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { error?: unknown }

    if (typeof data.error === 'string') {
      return data.error
    }
  } catch {
    // Ignore JSON parsing failures and fall back to the status text.
  }

  return response.statusText || 'Pricing request failed.'
}

export async function getPricingQuote(
  request: PricingQuoteRequest,
): Promise<PricingQuoteResponse> {
  const response = await fetch(PRICING_API_BASE, {
    body: JSON.stringify(request),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new PricingApiError(await readErrorMessage(response), response.status)
  }

  return (await response.json()) as PricingQuoteResponse
}
