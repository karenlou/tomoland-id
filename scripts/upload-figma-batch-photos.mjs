/**
 * One-time helper — downloads the photo export for each new Figma card
 * (tomoland-6.19-new-cards) and uploads it to Supabase storage, writing the
 * resulting public URLs to /tmp/figma_batch_uploaded.json for the SQL
 * migration script to consume.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'
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

const winners = JSON.parse(readFileSync('/tmp/winners.json', 'utf8'))
const losers = JSON.parse(readFileSync('/tmp/losers.json', 'utf8'))
const allCards = [...winners, ...losers]

async function main() {
  console.log(`Uploading ${allCards.length} photos...\n`)
  const results = []

  for (const card of allCards) {
    try {
      const res = await fetch(card.photo_url)
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())

      const path = `photos/figma-${crypto.randomUUID()}.png`
      const { error: uploadError } = await supabase.storage
        .from('citizen-photos')
        .upload(path, buf, { contentType: 'image/png', cacheControl: '31536000' })
      if (uploadError) throw new Error(uploadError.message)

      const {
        data: { publicUrl },
      } = supabase.storage.from('citizen-photos').getPublicUrl(path)

      results.push({ ...card, uploaded_photo_url: publicUrl })
      console.log(`  ✅ ${card.name} (TOMO-${String(card.num).padStart(4, '0')}) -> ${path}`)
    } catch (err) {
      console.error(`  ❌ ${card.name}: ${err.message}`)
      results.push({ ...card, uploaded_photo_url: null, error: err.message })
    }

    await new Promise((r) => setTimeout(r, 60))
  }

  writeFileSync('/tmp/figma_batch_uploaded.json', JSON.stringify(results, null, 1))
  const failed = results.filter((r) => !r.uploaded_photo_url)
  console.log(`\n🏁 Done: ${results.length - failed.length} uploaded, ${failed.length} failed`)
}

main().catch(console.error)
