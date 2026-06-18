/**
 * Seed script — inserts citizens from the Figma "GUESTS ~20-80" batch.
 * Run after citizen_photos.json and /tmp/citizen_photos/ are populated by the Figma extraction agent.
 *
 * Usage:
 *   node scripts/seed-citizens.mjs
 *
 * Requires env vars from .env.local (loaded automatically via --env-file flag or dotenv).
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local manually
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

const PHOTO_DIR = '/tmp/citizen_photos'
const PHOTO_JSON = '/tmp/citizen_photos.json'

// All 50 citizens in order (matching the 01.jpg … 50.jpg files)
const CITIZENS = [
  { name: 'Aaron Weldy',             relation: "Tomo's Friend", tomoland_id: 'TOMO-0020' },
  { name: 'Albert Tian',             relation: "Tomo's Friend", tomoland_id: 'TOMO-0021' },
  { name: 'Ally Nakamura',           relation: "Tomo's Friend", tomoland_id: 'TOMO-0022' },
  { name: 'Charles Gao',             relation: "Tomo's Friend", tomoland_id: 'TOMO-0023' },
  { name: 'Annie Ma',                relation: "Tomo's Friend", tomoland_id: 'TOMO-0026' },
  { name: 'Arman Kumaraswamy',       relation: "Tomo's Friend", tomoland_id: 'TOMO-0027' },
  { name: 'Rohil Agarwal',           relation: "Tomo's Friend", tomoland_id: 'TOMO-0028' },
  { name: 'Amin Hamrah',             relation: "Tomo's Friend", tomoland_id: 'TOMO-0029' },
  { name: 'Bassil Shama',            relation: "Tomo's Friend", tomoland_id: 'TOMO-0030' },
  { name: 'Bill',                    relation: "Tomo's Friend", tomoland_id: 'TOMO-0031' },
  { name: 'Chrissy Sun',             relation: "Tomo's Friend", tomoland_id: 'TOMO-0032' },
  { name: 'Christina Melas-Kyriazi', relation: "Tomo's Friend", tomoland_id: 'TOMO-0033' },
  { name: 'Andy',                    relation: "Tomo's Friend", tomoland_id: 'TOMO-0034' },
  { name: 'Christopher Zhu',         relation: "Tomo's Friend", tomoland_id: 'TOMO-0034' },
  { name: 'Emma',                    relation: "Tomo's Friend", tomoland_id: 'TOMO-0035' },
  { name: 'Eunice Lai',              relation: "Tomo's Friend", tomoland_id: 'TOMO-0036' },
  { name: 'Foy',                     relation: "Tomo's Friend", tomoland_id: 'TOMO-0037' },
  { name: 'Haris',                   relation: "Tomo's Friend", tomoland_id: 'TOMO-0038' },
  { name: 'Hyden Polikoff',          relation: "Tomo's Friend", tomoland_id: 'TOMO-0039' },
  { name: 'Jackie Chen',             relation: "Tomo's Friend", tomoland_id: 'TOMO-0040' },
  { name: 'Jae Park',                relation: "Tomo's Friend", tomoland_id: 'TOMO-0041' },
  { name: 'Jenny Sun',               relation: "Tomo's Friend", tomoland_id: 'TOMO-0042' },
  { name: 'Jia Chen',                relation: "Tomo's Friend", tomoland_id: 'TOMO-0043' },
  { name: 'Kaitlyn Luo',             relation: "Tomo's Friend", tomoland_id: 'TOMO-0044' },
  { name: 'Ker Lee Yap',             relation: "Tomo's Friend", tomoland_id: 'TOMO-0045' },
  { name: 'Maja Wilbrink',           relation: "Tomo's Friend", tomoland_id: 'TOMO-0046' },
  { name: 'Mathurah Ravigulan',      relation: "Tomo's Friend", tomoland_id: 'TOMO-0047' },
  { name: 'Matthew Guillod',         relation: "Tomo's Friend", tomoland_id: 'TOMO-0048' },
  { name: 'Megan Mou',               relation: "Tomo's Friend", tomoland_id: 'TOMO-0049' },
  { name: 'Mei Mei',                 relation: "Tomo's Friend", tomoland_id: 'TOMO-0050' },
  { name: 'Michael Zhu',             relation: "Tomo's Friend", tomoland_id: 'TOMO-0051' },
  { name: 'Michelle Schwartzman',    relation: "Tomo's Friend", tomoland_id: 'TOMO-0052' },
  { name: 'Ming',                    relation: "Tomo's Friend", tomoland_id: 'TOMO-0053' },
  { name: 'Nalin Semwal',            relation: "Tomo's Friend", tomoland_id: 'TOMO-0054' },
  { name: 'Amy Zhou',                relation: "Tomo's Friend", tomoland_id: 'TOMO-0055' },
  { name: "Nick O'Brien",            relation: "Tomo's Friend", tomoland_id: 'TOMO-0056' },
  { name: 'Nicole Summer Hsing',     relation: "Tomo's Friend", tomoland_id: 'TOMO-0057' },
  { name: 'Ryan Kim',                relation: "Tomo's Friend", tomoland_id: 'TOMO-0058' },
  { name: 'Raymond Ma Quan',         relation: "Tomo's Friend", tomoland_id: 'TOMO-0059' },
  { name: 'Shaahana Naufal',         relation: "Tomo's Friend", tomoland_id: 'TOMO-0060' },
  { name: 'Justin Quan',             relation: "Tomo's Friend", tomoland_id: 'TOMO-0061' },
  { name: 'Simon',                   relation: "Tomo's Friend", tomoland_id: 'TOMO-0062' },
  { name: 'Simon Wijckman',          relation: "Tomo's Friend", tomoland_id: 'TOMO-0063' },
  { name: 'Si Jia Wen',              relation: "Tomo's Friend", tomoland_id: 'TOMO-0064' },
  { name: 'Ted Chai',                relation: "Tomo's Friend", tomoland_id: 'TOMO-0065' },
  { name: 'Tiffany',                 relation: "Tomo's Friend", tomoland_id: 'TOMO-0066' },
  { name: 'Tyler McNierney',         relation: "Tomo's Friend", tomoland_id: 'TOMO-0068' },
  { name: 'Will Hoppin',             relation: "Tomo's Friend", tomoland_id: 'TOMO-0069' },
  { name: 'Yang Fan Yun',            relation: "Tomo's Friend", tomoland_id: 'TOMO-0070' },
  { name: 'Zen',                     relation: "Tomo's Friend", tomoland_id: 'TOMO-0071' },
]

async function uploadPhoto(filePath, filename) {
  const data = readFileSync(filePath)
  const contentType = filePath.endsWith('.png') ? 'image/png' : 'image/jpeg'
  const storagePath = `photos/seed-${filename}`

  const { data: uploaded, error } = await supabase.storage
    .from('citizen-photos')
    .upload(storagePath, data, { contentType, cacheControl: '31536000', upsert: true })

  if (error) throw new Error(`Storage upload failed for ${filename}: ${error.message}`)

  const { data: { publicUrl } } = supabase.storage
    .from('citizen-photos')
    .getPublicUrl(uploaded.path)

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
      created_at: '2026-06-16T20:00:00Z',
    })
    .select()
    .single()

  if (error) throw new Error(`Insert failed for ${citizen.name}: ${error.message}`)
  return data
}

async function main() {
  console.log('🌱 Seeding Tomoland citizens...\n')

  // Load photo mapping (written by the Figma extraction agent)
  let photoMap = {}
  if (existsSync(PHOTO_JSON)) {
    const json = JSON.parse(readFileSync(PHOTO_JSON, 'utf8'))
    // Build name → index map so we can find the right file
    json.forEach((entry, i) => {
      photoMap[entry.name] = String(i + 1).padStart(2, '0')
    })
  }

  let inserted = 0
  let failed = 0

  for (let i = 0; i < CITIZENS.length; i++) {
    const citizen = CITIZENS[i]
    const idx = String(i + 1).padStart(2, '0')

    try {
      // Find photo file — try .jpg first, then .png
      let photoUrl = null
      for (const ext of ['jpg', 'png', 'jpeg']) {
        const filePath = join(PHOTO_DIR, `${idx}.${ext}`)
        if (existsSync(filePath)) {
          console.log(`  📸 Uploading photo for ${citizen.name}...`)
          photoUrl = await uploadPhoto(filePath, `${idx}.${ext}`)
          break
        }
      }

      if (!photoUrl) {
        console.log(`  ⚠️  No photo found for ${citizen.name} (${idx}.jpg) — inserting without photo`)
      }

      const row = await insertCitizen(citizen, photoUrl)
      console.log(`  ✅ ${row.tomoland_id} — ${citizen.name}`)
      inserted++
    } catch (err) {
      console.error(`  ❌ Failed ${citizen.name}: ${err.message}`)
      failed++
    }

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 100))
  }

  console.log(`\n🏁 Done: ${inserted} inserted, ${failed} failed`)
}

main().catch(console.error)
