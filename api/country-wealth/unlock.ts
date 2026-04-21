import { json, jsonError } from '../_lib/http.ts'
import {
  createAdminSessionCookie,
  getAdminPassword,
} from '../_lib/session.ts'

export async function POST(request: Request) {
  let password = ''

  try {
    const body = (await request.json()) as { password?: unknown }
    password = typeof body.password === 'string' ? body.password : ''
  } catch {
    return jsonError('A JSON body with the admin password is required.', 400)
  }

  if (password !== getAdminPassword()) {
    return jsonError('That admin password is not valid.', 401)
  }

  return json(
    { ok: true },
    {
      headers: {
        'Cache-Control': 'no-store',
        'Set-Cookie': createAdminSessionCookie(request),
      },
    },
  )
}
