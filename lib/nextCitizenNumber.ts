import type { SupabaseClient } from '@supabase/supabase-js'

/** Next resident number — always max + 1; intentional gaps are never filled. */
export async function nextCitizenNumber(
  supabase: SupabaseClient,
): Promise<number> {
  const { data, error } = await supabase
    .from('citizens')
    .select('citizen_number')
    .order('citizen_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return (data?.citizen_number ?? 0) + 1
}
