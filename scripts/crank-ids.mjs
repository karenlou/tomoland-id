/**
 * crank-ids.mjs — batch Tomoland ID generator.
 *
 * Pipeline per person: render the CitizenCard (headless Chrome, 2x) -> upload
 * the PNG into the Notion CRM row's `ID.png` file property.
 *
 * Render is serial off ONE persistent browser page (tens of ms each). Notion
 * has no bulk endpoint, so uploads (3 calls each: create file-upload, send
 * bytes, patch page) are fanned out through a concurrency pool with 429
 * backoff — that's the closest thing to "batching" Notion allows.
 *
 * Usage:
 *   node scripts/crank-ids.mjs <worklist.json> [--upload] [--open] [--conc=4]
 *
 * Worklist entry: { pageId, name, role, id, file }  (file = absolute path to a square headshot)
 * Defaults to DRY-RUN (renders only). Pass --upload to write to Notion.
 */

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, readFileSync as rf } from 'node:fs'
import { basename, join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const FACES_DIR = join(ROOT, 'public', 'faces')
const OUT_DIR = join(ROOT, 'out')
const BASE = process.env.RENDER_BASE ?? 'http://localhost:3000'

const args = process.argv.slice(2)
const worklistPath = args.find((a) => !a.startsWith('--'))
const DO_UPLOAD = args.includes('--upload')
const UPLOAD_ONLY = args.includes('--upload-only') // skip render, push existing out/ PNGs
const DO_OPEN = args.includes('--open')
const CONC = Number((args.find((a) => a.startsWith('--conc=')) ?? '--conc=4').split('=')[1])

if (!worklistPath) {
  console.error('usage: node scripts/crank-ids.mjs <worklist.json> [--upload] [--open] [--conc=N]')
  process.exit(1)
}

const keychain = (svc) =>
  execSync(`security find-generic-password -s "${svc}" -w`, { encoding: 'utf8' }).trim()
const NOTION_TOKEN = DO_UPLOAD || UPLOAD_ONLY ? keychain('notion-api-key') : null
const NV = '2022-06-28'

const worklist = JSON.parse(readFileSync(worklistPath, 'utf8'))
mkdirSync(FACES_DIR, { recursive: true })
mkdirSync(OUT_DIR, { recursive: true })

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Fun roles — mirror of lib/roles.ts JOB_TITLES, as "Tomo's <title>".
// Assigned deterministically per name so re-runs are stable (no bio lookup).
const TITLES = ['Mayor','Town Crier','Town Clerk','Town Historian','Baker','Librarian','Postal Carrier','Doctor','Dentist','Pharmacist','Veterinarian','Barber','Hairdresser','Florist','Butcher','Grocer','Tailor','Locksmith','Plumber','Electrician','Carpenter','Mechanic','Landscaper','Beekeeper','Farmer','Fisherman','Innkeeper','Hotel Manager','Diner Owner','Bartender','Barista','Chef','Pastry Chef','Food Vendor','Market Vendor','Antique Dealer','Bookshop Owner','Record Store Owner','Photographer','Mural Artist','Sign Painter','Tattoo Artist','Street Musician','DJ','Radio Host','Local Reporter','Newspaper Editor','Museum Curator','Park Ranger','Tour Guide','Bus Driver','Taxi Driver','Crossing Guard','Lifeguard','Fire Chief','Sheriff','Deputy','Night Watchman','Security Guard','Judge','Lawyer','Notary','Accountant','Banker','Realtor','Architect','City Planner','Council Member','School Teacher','Principal','Coach','Referee','Scout Leader','Choir Director','Church Organist','Pastor','Yoga Instructor','Personal Trainer','Nutritionist','Therapist','Social Worker','Handyman','Janitor','Weather Forecaster','Theater Director','Stagehand','Ticket Seller','Local Legend','Neighborhood Watch','PTA President','Block Captain','Old-Timer','Newcomer']
const roleFor = (name) => {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return `Tomo's ${TITLES[h % TITLES.length]}`
}

// Stable output path + role per card.
for (const item of worklist) {
  item.role = item.role ?? roleFor(item.name)
  item.out = join(OUT_DIR, `${slug(item.name)}-${item.id}.png`)
}

// ---------- Render (serial, one browser) ----------
async function renderAll() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ deviceScaleFactor: 2 })
  const t0 = Date.now()
  for (const item of worklist) {
    const faceName = `${slug(item.name)}-${item.id}.png`
    const facePath = join(FACES_DIR, faceName)
    if (resolve(item.file) !== resolve(facePath)) copyFileSync(item.file, facePath)
    const url =
      `${BASE}/render?name=${encodeURIComponent(item.name)}` +
      `&role=${encodeURIComponent(item.role)}` +
      `&photo=${encodeURIComponent('/faces/' + faceName)}` +
      `&id=${encodeURIComponent(item.id)}`
    const s = Date.now()
    await page.goto(url, { waitUntil: 'load' })
    await page.waitForFunction(() => window.__cardReady === true, { timeout: 10000 })
    await page.locator('.id-capture').screenshot({ path: item.out, omitBackground: true })
    console.log(`  rendered ${item.id} ${item.name} (${Date.now() - s}ms)`)
  }
  await browser.close()
  console.log(`render total: ${Date.now() - t0}ms for ${worklist.length} (${Math.round((Date.now() - t0) / worklist.length)}ms/card)`)
}

// ---------- Notion upload (concurrent pool, 429 backoff) ----------
async function notion(path, opts = {}, tries = 8) {
  let lastErr
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`https://api.notion.com/v1/${path}`, {
        ...opts,
        headers: { Authorization: `Bearer ${NOTION_TOKEN}`, 'Notion-Version': NV, ...(opts.headers ?? {}) },
      })
      if (res.status === 429 || res.status >= 500) {
        const wait = (Number(res.headers.get('retry-after')) || 1) * 1000
        await new Promise((r) => setTimeout(r, wait * (i + 1)))
        continue
      }
      return res.json()
    } catch (e) {
      // network/socket error (UND_ERR_SOCKET, fetch failed) — back off and retry
      lastErr = e
      await new Promise((r) => setTimeout(r, 800 * (i + 1)))
    }
  }
  throw new Error(`Notion ${path} failed after ${tries} tries: ${lastErr?.message ?? ''}`)
}

async function uploadOne(item) {
  // 1. create file upload
  const fu = await notion('file_uploads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
  // 2. send bytes
  const form = new FormData()
  form.append('file', new Blob([rf(item.out)], { type: 'image/png' }), `${item.id}.png`)
  await notion(`file_uploads/${fu.id}/send`, { method: 'POST', body: form })
  // 3. patch page
  const patched = await notion(`pages/${item.pageId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: {
        'ID.png': { files: [{ type: 'file_upload', file_upload: { id: fu.id }, name: `${slug(item.name)}-${item.id}.png` }] },
      },
    }),
  })
  const ok = patched.object === 'page' && patched.properties['ID.png'].files.length === 1
  console.log(`  ${ok ? '✓ uploaded' : '✗ FAILED'} ${item.id} ${item.name}${ok ? '' : ' :: ' + (patched.message ?? '')}`)
  return ok
}

async function pool(items, n, fn) {
  const q = [...items]
  let ok = 0
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (q.length) {
        const it = q.shift()
        try {
          if (await fn(it)) ok++
        } catch (e) {
          console.log(`  ✗ ERROR ${it.id} ${it.name} :: ${e.message}`)
        }
      }
    }),
  )
  return ok
}

// ---------- run ----------
console.log(`crank-ids: ${worklist.length} cards | upload=${DO_UPLOAD || UPLOAD_ONLY} uploadOnly=${UPLOAD_ONLY} conc=${CONC}`)
if (!UPLOAD_ONLY) await renderAll()
if (DO_OPEN && !UPLOAD_ONLY) {
  execSync(`open ${worklist.map((w) => `'${w.out}'`).join(' ')}`)
}
if (DO_UPLOAD || UPLOAD_ONLY) {
  const t0 = Date.now()
  const ok = await pool(worklist, CONC, uploadOne)
  console.log(`upload total: ${Date.now() - t0}ms | ${ok}/${worklist.length} ok`)
}
console.log('done.')
