export const SESSION_KEY = 'vnr_game_session'

function parseSession(raw) {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed?.gameId || !parsed?.teamKey) return null
    return parsed
  } catch {
    return null
  }
}

// Prefers the tab-scoped sessionStorage copy, but falls back to the durable
// localStorage copy — kept around (never deleted) so a device that closes or
// gets its tab killed can recover the same team instead of finding it
// permanently locked out as "already taken" on /pick-team.
export function readSession() {
  const fresh = sessionStorage.getItem(SESSION_KEY)
  if (fresh) return parseSession(fresh)
  const session = parseSession(localStorage.getItem(SESSION_KEY))
  if (session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }
  return session
}

export function saveSession(session) {
  const payload = JSON.stringify(session)
  sessionStorage.setItem(SESSION_KEY, payload)
  localStorage.setItem(SESSION_KEY, payload)
}
