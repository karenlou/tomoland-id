import {
  clearMyCitizen,
  getOrCreateDeviceToken,
  getStoredMyCitizenId,
  setMyCitizen,
} from '@/lib/deviceAuth'
import type { Citizen } from '@/types'

/** Link a legacy citizen row (no owner_token yet) to this device. */
export async function linkCitizenToDevice(
  citizenId: string,
  deviceToken: string,
): Promise<boolean> {
  try {
    const res = await fetch('/api/citizens/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ citizenId, deviceToken }),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Server is source of truth — looks up citizen by device token. */
export async function fetchOwnedCitizen(
  deviceToken: string,
): Promise<Citizen | null> {
  try {
    const res = await fetch(
      `/api/citizens/mine?token=${encodeURIComponent(deviceToken)}`,
    )
    if (!res.ok) return null
    const json = (await res.json()) as { citizen: Citizen | null }
    return json.citizen ?? null
  } catch {
    return null
  }
}

/**
 * Resolve whether this device owns a citizen.
 * Order: server lookup by device token → local cache if still in directory → clear stale data.
 */
export async function resolveOwnership(
  citizens: Citizen[],
): Promise<Citizen | null> {
  const token = getOrCreateDeviceToken()
  if (!token) {
    clearMyCitizen()
    return null
  }

  const owned = await fetchOwnedCitizen(token)
  if (owned) {
    setMyCitizen(owned.id)
    return owned
  }

  const storedId = getStoredMyCitizenId()
  if (storedId) {
    const inList = citizens.find((c) => c.id === storedId)
    if (inList) {
      await linkCitizenToDevice(storedId, token)
      setMyCitizen(storedId)
      return inList
    }
  }

  clearMyCitizen()
  return null
}

/** Delete the citizen owned by this device (server-side by device token). */
export async function deleteOwnedCitizen(): Promise<{
  ok: boolean
  error?: string
}> {
  const token = getOrCreateDeviceToken()
  if (!token) {
    return { ok: false, error: 'Could not identify this device.' }
  }

  try {
    const res = await fetch(
      `/api/citizens/mine?token=${encodeURIComponent(token)}`,
      { method: 'DELETE' },
    )
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean
      error?: string
    }
    if (!res.ok) {
      return { ok: false, error: json.error ?? 'Failed to delete your ID.' }
    }
    clearMyCitizen()
    return { ok: true }
  } catch {
    return { ok: false, error: 'Failed to delete your ID.' }
  }
}

export function registerOwnership(citizen: Citizen): void {
  setMyCitizen(citizen.id)
}
