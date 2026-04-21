import { json, jsonError } from '../_lib/http.ts'
import { readCountryWealthSnapshot } from '../_lib/countryWealth.ts'

export async function GET() {
  try {
    const snapshot = await readCountryWealthSnapshot()

    if (!snapshot) {
      return jsonError('No country wealth snapshot is available yet.', 404)
    }

    return json(snapshot, {
      headers: {
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Reading country wealth snapshot failed.', error)
    return jsonError('Reading the latest country wealth snapshot failed.', 500)
  }
}
