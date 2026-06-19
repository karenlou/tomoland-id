/**
 * One-time migration — copies party_citizens entries into the main citizens
 * table, per the launch-party brief. Run after the event.
 *
 * Usage:
 *   node scripts/migrate-party-to-main.mjs
 *
 * citizens assigns its own fresh citizen_number/tomoland_id (identity
 * column), so id/citizen_number/tomoland_id/created_at are deliberately not
 * copied from party_citizens — only name/relation_to_tomo/place_of_issue/
 * photo_url. Rows are inserted in created_at-ascending order so the fresh
 * numbers preserve the original party signup order.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const envPath = join(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const [key, ...rest] = trimmed.split('=')
  if (key && rest.length) process.env[key] = rest.join('=')
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

async function main() {
  console.log('Fetching party_citizens...\n')

  const { data: party, error: fetchError } = await supabase
    .from('party_citizens')
    .select('name, relation_to_tomo, place_of_issue, photo_url, created_at')
    .order('created_at', { ascending: true })

  if (fetchError) {
    console.error('Failed to fetch party_citizens:', fetchError.message)
    process.exit(1)
  }

  console.log(`Found ${party.length} party entries. Migrating to citizens...\n`)

  let inserted = 0
  let failed = 0

  for (const guest of party) {
    try {
      const { data, error } = await supabase
        .from('citizens')
        .insert({
          name: guest.name,
          relation_to_tomo: guest.relation_to_tomo,
          place_of_issue: guest.place_of_issue,
          photo_url: guest.photo_url,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)
      console.log(`  ✅ ${data.tomoland_id} — ${guest.name}`)
      inserted++
    } catch (err) {
      console.error(`  ❌ Failed ${guest.name}: ${err.message}`)
      failed++
    }

    await new Promise((r) => setTimeout(r, 80))
  }

  console.log(`\n🏁 Done: ${inserted} migrated, ${failed} failed`)
}

main().catch(console.error)
