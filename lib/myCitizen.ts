const STORAGE_KEY = 'tomoland_my_citizen_id'

export function getStoredMyCitizenId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setStoredMyCitizenId(id: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // Quota / private browsing — in-memory state still works this session
  }
}

export function clearStoredMyCitizenId(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
