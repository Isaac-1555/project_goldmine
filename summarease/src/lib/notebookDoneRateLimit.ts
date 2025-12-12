const WINDOW_MS = 60 * 60 * 1000
const LIMIT = 5

type StoredShape = {
  timestampsMs: number[]
}

function storageKey(userId: string) {
  return `sat-brain_notebook_done_rate_limit_v1:${userId}`
}

function safeRead(userId: string): StoredShape {
  if (!userId) return { timestampsMs: [] }
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return { timestampsMs: [] }
    const parsed = JSON.parse(raw)
    const timestampsMs = Array.isArray(parsed?.timestampsMs) ? parsed.timestampsMs : []
    return { timestampsMs }
  } catch {
    return { timestampsMs: [] }
  }
}

function safeWrite(userId: string, value: StoredShape) {
  if (!userId) return
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(value))
  } catch {
    // Ignore quota / privacy mode failures; limiter becomes best-effort.
  }
}

function normalizeAndPrune(timestampsMs: unknown[], nowMs: number): number[] {
  const cutoff = nowMs - WINDOW_MS

  const cleaned = timestampsMs
    .filter((t): t is number => typeof t === 'number' && Number.isFinite(t))
    // Keep only timestamps strictly within the last hour.
    .filter((t) => t > cutoff && t <= nowMs)
    .sort((a, b) => a - b)

  return cleaned
}

export function getDoneTimestamps(userId: string, nowMs: number = Date.now()): number[] {
  const stored = safeRead(userId)
  const cleaned = normalizeAndPrune(stored.timestampsMs, nowMs)

  // Persist cleaned list (helps keep data small and consistent across tabs).
  if (cleaned.length !== stored.timestampsMs.length) {
    safeWrite(userId, { timestampsMs: cleaned })
  }

  return cleaned
}

export function getDoneLimitStatus(
  userId: string,
  nowMs: number = Date.now()
): { allowed: boolean; remainingMs?: number; countInWindow: number } {
  const timestamps = getDoneTimestamps(userId, nowMs)
  const countInWindow = timestamps.length

  if (countInWindow < LIMIT) {
    return { allowed: true, countInWindow }
  }

  const oldest = timestamps[0]
  const remainingMs = Math.max(0, oldest + WINDOW_MS - nowMs)

  return { allowed: false, remainingMs, countInWindow }
}

export function recordDoneSuccess(userId: string, nowMs: number = Date.now()): void {
  const timestamps = getDoneTimestamps(userId, nowMs)
  const next = [...timestamps, nowMs]
  safeWrite(userId, { timestampsMs: next })
}

export const NOTEBOOK_DONE_LIMIT = LIMIT
export const NOTEBOOK_DONE_WINDOW_MS = WINDOW_MS
