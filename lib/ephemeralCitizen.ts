import { randomRole } from '@/lib/roles'
import { normalizeCitizenName } from '@/lib/normalizeCitizenName'
import type { Citizen } from '@/types'

export function isEphemeralMode(): boolean {
  return process.env.NEXT_PUBLIC_CITIZENS_EPHEMERAL !== 'false'
}

export function createEphemeralCitizen(
  name: string,
  photoUrl: string | null,
  relationToTomo?: string,
): Citizen {
  const citizen_number = Math.floor(Math.random() * 9000) + 1000
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return {
    id,
    citizen_number,
    name: normalizeCitizenName(name),
    relation_to_tomo: relationToTomo ?? randomRole(),
    place_of_issue: 'San Francisco, CA',
    photo_url: photoUrl,
    created_at: new Date().toISOString(),
    tomoland_id: `TOMO-${String(citizen_number).padStart(4, '0')}`,
  }
}
