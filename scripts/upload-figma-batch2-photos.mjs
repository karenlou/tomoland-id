/**
 * One-time helper — uploads the 6 replacement photos for the second
 * tomoland-6.19-new-cards batch (node 29:10857) to Supabase storage.
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

const cards = [
  {
    id: 'a6759808-bcc5-49ab-84bb-818ae73bd743',
    name: 'MAJA WILBRINK',
    num: 121,
    relation: "TOMO'S LORE AUTHOR",
    photoUrl: 'https://www.figma.com/api/mcp/asset/1c7cee48-687a-4605-8dea-fea3a4292c88',
  },
  {
    id: 'd64f26b3-d810-46ce-99b1-be899a1f490d',
    name: 'CHRISSY SUN',
    num: 125,
    relation: "TOMO'S TRIPLET",
    photoUrl: 'https://www.figma.com/api/mcp/asset/0153449b-e9d9-406c-8683-33ab431b9afc',
  },
  {
    id: 'ea75fe69-1724-4f4b-8ee0-c8d13116c7ef',
    name: 'JENNY SUN',
    num: 126,
    relation: "TOMO'S TRIPLET",
    photoUrl: 'https://www.figma.com/api/mcp/asset/14ff87ae-1d8a-4ace-8f7c-63d67be9ca78',
  },
  {
    id: '97f19f57-63cf-410c-89f2-e0779ef4e66f',
    name: 'AMY ZHOU',
    num: 123,
    relation: "TOMO'S PRETZEL BAKER",
    photoUrl: 'https://www.figma.com/api/mcp/asset/4d32ca28-92d9-415f-9329-1522ebae6a7c',
  },
  {
    id: '432b268c-5903-4b6f-aaba-81fd197ddfc9',
    name: 'RYAN KIM',
    num: 51,
    relation: "TOMO'S GUARDIAN ANGEL",
    photoUrl: 'https://www.figma.com/api/mcp/asset/33764f81-66d8-40be-a4d6-d96f459fadc3',
  },
  {
    id: '965ea3f4-7ba7-4258-bee4-0c4ac6f331e2',
    name: 'Christina Melas-KyriazI',
    num: 50,
    relation: "TOMO'S GUARDIAN ANGEL",
    photoUrl: 'https://www.figma.com/api/mcp/asset/d1103f82-78d0-465e-9389-a33ce5dc5145',
  },
]

async function main() {
  console.log(`Uploading ${cards.length} photos...\n`)
  const results = []

  for (const card of cards) {
    try {
      const res = await fetch(card.photoUrl)
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

  writeFileSync('/tmp/figma_batch2_uploaded.json', JSON.stringify(results, null, 1))
  const failed = results.filter((r) => !r.uploaded_photo_url)
  console.log(`\n🏁 Done: ${results.length - failed.length} uploaded, ${failed.length} failed`)
}

main().catch(console.error)
