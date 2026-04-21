import { createHmac, timingSafeEqual } from 'node:crypto'

const ADMIN_SESSION_COOKIE_NAME = 'warera-country-wealth-admin'
const ADMIN_SESSION_PAYLOAD = 'country-wealth-admin'

function getAdminSessionSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ??
    process.env.ADMIN_PAGE_PASSWORD ??
    'AdminPassWarEra'
  )
}

function signAdminSession(secret: string) {
  return createHmac('sha256', secret)
    .update(ADMIN_SESSION_PAYLOAD)
    .digest('base64url')
}

function getCookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get('cookie')

  if (!cookieHeader) {
    return null
  }

  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim()

    if (!trimmed.startsWith(`${name}=`)) {
      continue
    }

    return decodeURIComponent(trimmed.slice(name.length + 1))
  }

  return null
}

function shouldUseSecureCookies(request: Request) {
  const forwardedProto = request.headers.get('x-forwarded-proto')

  if (forwardedProto) {
    return forwardedProto.includes('https')
  }

  return new URL(request.url).protocol === 'https:'
}

export function getAdminPassword() {
  return process.env.ADMIN_PAGE_PASSWORD ?? 'AdminPassWarEra'
}

export function createAdminSessionCookie(request: Request) {
  const cookieParts = [
    `${ADMIN_SESSION_COOKIE_NAME}=${encodeURIComponent(
      signAdminSession(getAdminSessionSecret()),
    )}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
  ]

  if (shouldUseSecureCookies(request)) {
    cookieParts.push('Secure')
  }

  return cookieParts.join('; ')
}

export function isAdminSessionValid(request: Request) {
  const session = getCookieValue(request, ADMIN_SESSION_COOKIE_NAME)

  if (!session) {
    return false
  }

  const expected = Buffer.from(signAdminSession(getAdminSessionSecret()))
  const received = Buffer.from(session)

  if (expected.length !== received.length) {
    return false
  }

  return timingSafeEqual(expected, received)
}
