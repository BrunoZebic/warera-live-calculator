import { json, jsonError } from '../_lib/http.ts'
import { refreshEquipmentPriceSnapshot } from '../_lib/pricing.ts'

export const maxDuration = 300

function isRefreshAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET

  if (!secret) {
    return true
  }

  return request.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!isRefreshAuthorized(request)) {
    return jsonError('Pricing refresh is locked.', 401)
  }

  try {
    const snapshot = await refreshEquipmentPriceSnapshot()

    return json(
      {
        generatedAt: snapshot.generatedAt,
        itemCodeCount: Object.keys(snapshot.salesByCode).length,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  } catch (error) {
    console.error('Refreshing equipment pricing snapshot failed.', error)
    return jsonError('Refreshing the equipment pricing snapshot failed.', 500)
  }
}
