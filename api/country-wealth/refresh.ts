import { refreshCountryWealthSnapshot } from '../_lib/countryWealth.ts'
import { json, jsonError } from '../_lib/http.ts'
import { isAdminSessionValid } from '../_lib/session.ts'

export const maxDuration = 300

export async function POST(request: Request) {
  if (!isAdminSessionValid(request)) {
    return jsonError('Admin refresh is locked. Enter the password first.', 401)
  }

  try {
    const snapshot = await refreshCountryWealthSnapshot()

    return json(snapshot, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Refreshing country wealth snapshot failed.', error)
    return jsonError('Refreshing the country wealth snapshot failed.', 500)
  }
}
