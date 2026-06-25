import { createClient } from '@supabase/supabase-js'
import type { Citizen } from '@/types'

/** Shared between the main directory and the /download admin page. */
export async function getCitizens(): Promise<Citizen[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return []

  const supabase = createClient(url, key)
  const { data } = await supabase
    .from('citizens')
    .select(
      'id, citizen_number, name, relation_to_tomo, place_of_issue, photo_url, created_at, tomoland_id',
    )
    .order('citizen_number', { ascending: true })

  return (data as Citizen[]) ?? []
}
