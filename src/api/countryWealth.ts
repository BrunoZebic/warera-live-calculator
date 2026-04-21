import type { CountryWealthSnapshot } from '../countryWealth/types'

const COUNTRY_WEALTH_API_BASE = '/api/country-wealth'

export class CountryWealthApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'CountryWealthApiError'
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

  return response.statusText || 'Request failed.'
}

async function assertOk(response: Response) {
  if (response.ok) {
    return
  }

  throw new CountryWealthApiError(
    await readErrorMessage(response),
    response.status,
  )
}

export async function getCountryWealthSnapshot() {
  const response = await fetch(COUNTRY_WEALTH_API_BASE, {
    credentials: 'include',
  })

  if (response.status === 404) {
    return null
  }

  await assertOk(response)

  return (await response.json()) as CountryWealthSnapshot
}

export async function unlockCountryWealthAdmin(password: string) {
  const response = await fetch(`${COUNTRY_WEALTH_API_BASE}/unlock`, {
    body: JSON.stringify({ password }),
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  await assertOk(response)
}

export async function refreshCountryWealthSnapshot() {
  const response = await fetch(`${COUNTRY_WEALTH_API_BASE}/refresh`, {
    credentials: 'include',
    method: 'POST',
  })

  await assertOk(response)

  return (await response.json()) as CountryWealthSnapshot
}
