export function json(
  body: unknown,
  init: ResponseInit = {},
) {
  return Response.json(body, init)
}

export function jsonError(message: string, status: number) {
  return json({ error: message }, { status })
}
