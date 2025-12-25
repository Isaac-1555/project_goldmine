const STORAGE_KEYS = {
  LOCAL_NOTEBOOKS: 'sat-brain-local-notebooks',
  NOTEBOOK_STATE: 'sat-brain-notebook-state',
} as const

export type LocalNotebookDraft = Record<string, any>

function safeParseArray(raw: string | null): any[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function loadLocalNotebookDrafts(): LocalNotebookDraft[] {
  if (typeof window === 'undefined') return []
  return safeParseArray(localStorage.getItem(STORAGE_KEYS.LOCAL_NOTEBOOKS))
}

export function getLatestLocalNotebookDraft(): LocalNotebookDraft | null {
  const drafts = loadLocalNotebookDrafts()
  if (drafts.length === 0) return null

  // Defensive: support older shapes that may have last_saved.
  const sorted = [...drafts].sort((a: any, b: any) => {
    const aTime = new Date(a?.lastSaved || a?.last_saved || 0).getTime()
    const bTime = new Date(b?.lastSaved || b?.last_saved || 0).getTime()
    return bTime - aTime
  })

  return sorted[0] || null
}

export function saveLatestLocalNotebookDraft(draft: LocalNotebookDraft): void {
  if (typeof window === 'undefined') return

  // This app surfaces only the latest local notebook, so keep a single-entry cache.
  localStorage.setItem(STORAGE_KEYS.LOCAL_NOTEBOOKS, JSON.stringify([draft]))
}

export function clearLocalNotebookCache(): void {
  if (typeof window === 'undefined') return

  // Always wipe the local notebook drafts.
  try {
    localStorage.removeItem(STORAGE_KEYS.LOCAL_NOTEBOOKS)
  } catch {
    // ignore
  }

  // Clear draft-specific fields from the notebook state cache while preserving layout prefs.
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTEBOOK_STATE)
    if (!raw) {
      localStorage.removeItem(STORAGE_KEYS.NOTEBOOK_STATE)
      return
    }

    const parsed = JSON.parse(raw)
    const leftPanelWidth =
      typeof parsed?.leftPanelWidth === 'number' ? parsed.leftPanelWidth : undefined

    if (leftPanelWidth !== undefined) {
      localStorage.setItem(
        STORAGE_KEYS.NOTEBOOK_STATE,
        JSON.stringify({ leftPanelWidth, lastModified: new Date().toISOString() })
      )
    } else {
      localStorage.removeItem(STORAGE_KEYS.NOTEBOOK_STATE)
    }
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEYS.NOTEBOOK_STATE)
    } catch {
      // ignore
    }
  }
}
