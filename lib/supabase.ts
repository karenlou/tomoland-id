import { createClient } from '@supabase/supabase-js'

// Use placeholder URL at build time so the module doesn't throw during static analysis.
// At runtime, real env vars must be set.
// Empty strings from .env.local must fall through to the placeholder so the
// module doesn't throw during Next.js static analysis at build time.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
)

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  )
}
