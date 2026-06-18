/**
 * Verifies owner_token column exists. If missing, prints SQL to run in Supabase.
 *
 * Usage: node scripts/migrate-owner-token.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')

for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const [key, ...rest] = trimmed.split('=')
  if (key && rest.length) process.env[key] = rest.join('=')
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const { error } = await supabase.from('citizens').select('owner_token').limit(1)

if (!error) {
  console.log('✅ owner_token column is ready.')
  process.exit(0)
}

if (!error.message.includes('owner_token')) {
  console.error('❌ Unexpected error:', error.message)
  process.exit(1)
}

const sql = readFileSync(join(__dirname, 'add-owner-token.sql'), 'utf8')
console.log('⚠️  owner_token column is missing.\n')
console.log('Run this SQL in Supabase → SQL Editor:\n')
console.log(sql)
process.exit(1)
