/**
 * Seed script — inserts the core "cast" citizens from the Figma
 * "TOMOSAPIEN-ID-CARD-ALL-GUESTS" frame (Tomo + his inner circle), as opposed to the
 * larger generic "Tomo's Friend" batch handled by seed-citizens.mjs.
 *
 * Usage:
 *   node scripts/seed-citizens-cast.mjs
 *
 * Requires env vars from .env.local (loaded manually below).
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

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

const PHOTO_DIR = '/tmp/citizen_photos_cast'
const CREATED_AT = '2026-06-16T19:00:00Z'

const CITIZENS = [
  { name: 'TOMO', relation: 'Self', photoFile: null },
  { name: 'justin quan', relation: "Tomo's Father", photoFile: 'justin_quan.png' },
  { name: 'JACKY HUANG', relation: "Tomo's Oracle", photoFile: 'jacky_huang.png' },
  { name: 'RYLEE STANTON', relation: "Tomo's Sister", photoFile: 'rylee_stanton.png' },
  { name: 'KAREN LOU', relation: "Tomo's DJ", photoFile: 'karen_lou.png' },
  { name: 'AMY GE', relation: "Tomo's Hypewoman", photoFile: 'amy_ge.png' },
  { name: 'LUCAS QUAN', relation: "Tomo's Uncle", photoFile: 'lucas_quan.png' },
  {
    name: 'TOMO TOMO TOMO SAHUR',
    relation: "Tomo's Best Friend Forever",
    photoFile: 'tomo_tomo_tomo_sahur.png',
  },
  { name: 'RANDY PERECMAN', relation: "Tomo's Camp Counselor", photoFile: 'randy_perecman.png' },
  { name: 'RAYMOND CHEN', relation: "Tomo's Old Man", photoFile: 'raymond_chen.png' },
  { name: 'VARUN NAIR', relation: "Tomo's PCP", photoFile: 'varun_nair.png' },
  { name: 'JESSE LU', relation: "Tomo's Nanny", photoFile: 'jesse_lu.png' },
]

async function uploadPhoto(filename) {
  const filePath = join(PHOTO_DIR, filename)
  if (!existsSync(filePath)) return null

  const data = readFileSync(filePath)
  const storagePath = `photos/cast-${filename}`

  const { data: uploaded, error } = await supabase.storage
    .from('citizen-photos')
    .upload(storagePath, data, {
      contentType: 'image/png',
      cacheControl: '31536000',
      upsert: true,
    })

  if (error) throw new Error(`Storage upload failed for ${filename}: ${error.message}`)

  const {
    data: { publicUrl },
  } = supabase.storage.from('citizen-photos').getPublicUrl(uploaded.path)

  return publicUrl
}

async function insertCitizen(citizen, photoUrl) {
  const { data, error } = await supabase
    .from('citizens')
    .insert({
      name: citizen.name,
      relation_to_tomo: citizen.relation,
      place_of_issue: 'San Francisco, CA',
      photo_url: photoUrl ?? null,
      created_at: CREATED_AT,
    })
    .select()
    .single()

  if (error) throw new Error(`Insert failed for ${citizen.name}: ${error.message}`)
  return data
}

async function main() {
  console.log('🌱 Seeding Tomoland cast citizens...\n')

  let inserted = 0
  let failed = 0

  for (const citizen of CITIZENS) {
    try {
      let photoUrl = null
      if (citizen.photoFile) {
        console.log(`  📸 Uploading photo for ${citizen.name}...`)
        photoUrl = await uploadPhoto(citizen.photoFile)
        if (!photoUrl) console.log(`  ⚠️  Photo file missing for ${citizen.name}`)
      }

      const row = await insertCitizen(citizen, photoUrl)
      console.log(`  ✅ ${row.tomoland_id} — ${citizen.name}`)
      inserted++
    } catch (err) {
      console.error(`  ❌ Failed ${citizen.name}: ${err.message}`)
      failed++
    }

    await new Promise((r) => setTimeout(r, 100))
  }

  console.log(`\n🏁 Done: ${inserted} inserted, ${failed} failed`)
}

main().catch(console.error)
