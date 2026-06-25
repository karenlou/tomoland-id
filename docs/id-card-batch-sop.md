# Tomoland ID — batch card creation SOP

Source of truth for generating Tomosapien ID cards for everyone in the **"June 25 Launch
Supporter CRM"** Notion database and writing each card image back into that row.

The deterministic path is scripted: `scripts/crank-ids.mjs` (render) + the `/render` route.
Read this whole doc before running — the pitfalls section is the point.

---

## What the pipeline does

For each CRM row that is **blank** (`ID.png` empty) and has a usable face photo:
1. **Render** a rounded, borderless Tomosapien card (the real `CitizenCard` component, captured
   headless via Playwright at 2×) with the person's name + a random `Tomo's <role>` + their photo.
2. **Upload** the PNG into that row's `ID.png` file property via Notion's file-upload API.

Human-in-the-loop: **render → open all for review → flag bad ones → upload only the good ones.**

---

## Prerequisites / credentials (MEP)

- **Notion write token** — macOS keychain `notion-api-key` (integration "Meeting Notes (Jesse)").
  The DB **must be shared with that integration** (Notion → DB ••• → Connections → add it),
  otherwise every call 404s with "Could not find database". Verify:
  `curl -s https://api.notion.com/v1/databases/387ad0ed77d680ed8ab8d04ba5c374cf -H "Authorization: Bearer $TOKEN" -H "Notion-Version: 2022-06-28"`
- **Apify token** (for sourcing Twitter avatars) — keychain `growth-apify-api-token`.
- **Node + pnpm + Playwright** — `pnpm install` then `pnpm exec playwright install chromium`.
- **Dev server running**: `PORT=3000 pnpm dev` (the `/render` route is served from it).

Key IDs:
- CRM database id: `387ad0ed77d680ed8ab8d04ba5c374cf`  (data source `387ad0ed-77d6-8012-b615-000be9ddd3d0`)
- Notion API version: `2022-06-28`
- Next free Tomoland ID at session start: **TOMO-0336** (1–335 were already minted; see the
  snapshot in `tomo/brainstorm/tomoland-id-snapshot-*.md`). Assign sequentially from there.

### Notion property names (REST — NOT the SQLite/MCP aliases)
`Name` (title) · `ID.png` (files, ← the output) · `Twitter` (url) · `LinkedIn` (**url**) ·
`Media` (files) · `Role/Relationship` (rich_text) · `Need Tomosapien ID / Photo?` (select).
The MCP/SQLite layer aliases `ID.png`→`ID (png)` and `Media`→`Files & media` — the REST API uses
the dotted names. **The schema mutates mid-project** (e.g. `LinkedIn` started as rich_text then
became url; `ID Ready?` checkbox was deleted). Always re-read the live schema before trusting it.

---

## Photo sourcing

Photos come from the agent-curated folder **`~/Projects/tomo/launch-headshots/`** (the source of
truth — NOT the stale `_manifest.json`). Filenames are `Name__platform__handle.png`
(platform ∈ twitter/linkedin/github). Tags appended before `.png`:
- `__better` / `__best` — the chosen pick when a person had multiple candidates (LinkedIn usually
  wins over X selfies). **Always prefer the `__better` file.**
- `__bad` — a rejected photo. **Skip any file tagged `__bad`.**

Match folder → CRM by normalized name (lowercase, alphanumeric only).

If a blank row has **no folder photo** but has a handle:
- **Twitter**: pull the avatar yourself. unavatar.io rate-limits hard → instead use Apify actor
  `apidojo~twitter-user-scraper` (`run-sync-get-dataset-items`, body `{"twitterHandles":[...]}`),
  take `profilePicture`, replace `_normal`→`_400x400`, download from `pbs.twimg.com` with **curl**
  (urllib gets 403 — needs a UA).
- **LinkedIn**: harder. `dev_fusion/Linkedin-Profile-Scraper` needs account-permission approval
  (can't click headless); `harvestapi/linkedin-profile-scraper` runs but returns null pictures.
  In practice the curation agents fetch LinkedIn photos into the folder — let them, or research
  the face via a web-search subagent (find a recurring face across 2+ sources, return a direct
  image URL).

3 company rows are **logos not faces** (Capy, Slash, spotted_in_prod) — render their logo, don't
treat as a missing face.

---

## Run it

```bash
# 1. start dev server (serves /render)
cd ~/Worktrees/tomoland-id && PORT=3000 pnpm dev   # keep running

# 2. build a worklist JSON: [{ pageId, name, id, file }]  (role is auto-assigned)
#    - pull blank rows from Notion, match to folder photos, assign sequential TOMO-0XXX ids
#    - exclude logos + anyone on the needsNewPhoto list (launch-headshots/_review.json)

# 3a. render + open for review (NO upload)
node scripts/crank-ids.mjs /tmp/worklist.json --open

# 3b. after Jesse approves, upload WITHOUT re-rendering
node scripts/crank-ids.mjs /tmp/worklist.json --upload-only --conc=3
```

`crank-ids.mjs` flags: `--open` (open PNGs in Preview), `--upload` (render then upload),
`--upload-only` (skip render, push existing `out/` PNGs), `--conc=N` (upload pool size).
Default (no flag) = dry-run render only. Roles are deterministic per name (`roleFor`), so re-runs
are stable. Faces are copied to `public/faces/<slug>-<id>.png` and served same-origin.

### The review loop (what Jesse's feedback maps to)
- **"needs new photo" / "bad"** → don't upload; rename the source `…__bad.png`; add to
  `launch-headshots/_review.json` `needsNewPhoto`. If it was already live, clear its `ID.png`.
- **"center him" / "recenter"** → crop the source to center the face with PIL, re-render, upload.
  Keep the face clear of the mascot badge (bottom-right of the photo slot).
- **`__better` landed for a flagged person** → re-render with the `__better` file, upload, remove
  from `needsNewPhoto`. To overwrite a live card you need its existing id — parse it from the
  current `ID.png` filename (`…-TOMO-0XXX.png`).

`_review.json` shape: `{ needsNewPhoto: [{name,id,state:'live'|'blank',reason}], renumber: [] }`.

---

## One-off / manual cards (not from the folder)

Sometimes you make a single card outside the batch — a pasted photo, a logo, a filler.
- **Pasted image**: crop the face with PIL (center on the face, keep clear of the bottom-right
  mascot badge), then put an explicit `name` AND `role` in the worklist entry. `role` overrides the
  random `roleFor()` (e.g. `"Tomo's Security Guard"`). No `pageId` → render+`--open` only, hand over
  the PNG (don't upload unless a CRM row is intended).
- **Logo rows** (Capy/Slash/spotted_in_prod): set a clean display `name` (strip CRM parenthetical
  notes like "(we are customers…)") and a manual `role` (Slash → `"Tomo's Bank"`). The card `name`
  is independent of the messy CRM Name field — leave the CRM field unless asked to tidy it.
- **Filler / gag**: the CRM is an internal launch-party gag, so a deliberately-random stand-in is
  fine when asked (e.g. Dan Seals — no handle — got a random "Dan Burns" headshot a subagent found).

## Finding a face when there's no folder photo and no clean avatar

Web-search subagent: hand it name + LinkedIn + role context, ask for a **direct image URL** of a
recurring face (same person across 2+ sources). GitHub avatars (`avatars.githubusercontent.com/u/<id>`)
and company team-page headshots work well and are directly downloadable. Label confidence; **verify
it's a real face** (Read the image) before rendering. Worked for Jaiveer (GitHub avatar, medium conf).

## Notion file-upload write-back (the 3-call dance)

There is **no bulk update** — each card is 3 calls, fanned out concurrently with 429+network retry:
1. `POST /v1/file_uploads` (body `{}`) → `{id}`
2. `POST /v1/file_uploads/{id}/send` (multipart `file=@card.png`) → status `uploaded`
3. `PATCH /v1/pages/{pageId}` with
   `{"properties":{"ID.png":{"files":[{"type":"file_upload","file_upload":{"id"},"name":"…"}]}}}`

Notion rate-limits ~3 req/s — `--conc=3` with backoff is the sweet spot; the script retries on
429/5xx **and** raw socket errors (`UND_ERR_SOCKET`), isolating per-card failures so one bad upload
doesn't kill the batch.

---

## Render mechanics (how the rounded/borderless look is produced)

- `app/render/page.tsx` mounts the real `CitizenCard` from URL params, neutralizes the shared
  layout's background (so corners capture transparent), and signals `window.__cardReady`.
- The capture wrapper has `borderRadius: 28` + `overflow:hidden`; a `<style>` override sets the
  card's `.id-surface { border:none; box-shadow:none }` (kills the dark-yellow edge line).
- The script screenshots `.id-capture` with `omitBackground:true` at `deviceScaleFactor:2`
  → 1366×866 RGBA PNG with rounded transparent corners.
- To backfill rounding onto already-square cards: re-render every session id from
  `public/faces/<slug>-<id>.png` and `--upload`.

---

## Pitfalls (we already hit these — don't repeat)

- **`/tmp` gets wiped** mid-session (tmp-cleaner reset a clone to pristine, losing the render route
  + faces). Work in `~/Worktrees/`, never `/tmp`.
- **unavatar.io rate-limits** after a few hits and then hangs curl for minutes. Use Apify→pbs.
- **Circle/stylized X avatars** (e.g. swyx) come back as a circle on a **black** square → black
  corners on the card. Re-pulling Twitter gives the same image; fix is image-processing (crop) or a
  different source, not a re-fetch.
- **Notion schema changes mid-project** — re-read the live schema; don't trust an earlier read
  (`LinkedIn` rich_text→url cost a wrong "no handles" conclusion).
- **`copyFileSync` self-copy** — when the worklist `file` is already `public/faces/<slug>-<id>.png`
  the copy throws; the script guards with `resolve(src) !== resolve(dest)`.
- **The folder is live-edited by agents** — files get renamed between scan and render
  (`__github__heesooy` → `__photo__cropped`). Re-glob current paths right before rendering.
- **Baked-in artifacts** — some sources have video-UI/captions/glitch baked in (Mohith's blue bar,
  Nitasha's chyron). Crop them out; a "better" tag isn't always actually better — still review.
- **ID numbering** — never reuse 1–335; assign from 336 up. Early ad-hoc cards used placeholder
  ids (Riley `TOMO-9002`) that had to be renumbered — assign real sequential ids from the start.
- **Apify Twitter actor silently returns the WRONG person** when a handle is dead/protected/renamed —
  it hands back an unrelated cached account instead of erroring. **Always check the returned
  `userName` equals the requested handle (case-insensitive) before using `profilePicture`.** Burned:
  `annbordetsky`→"Eric Bahn", `mohith_dzn`/`austinmoninger`→swyx/kentcdodds junk. A 0-item response
  is also valid-but-empty — don't treat the first item as truth.
- **Notion full-DB REST scan times out** (~495 rows, 60s) — use a targeted `title contains` filter
  query instead of paginating the whole DB to find one row.
- **CRM names contain control characters** — `json.loads(..., strict=False)` is required (raw
  `json.load` throws "Invalid control character"), and names can have a **leading newline** (Slash is
  `"\nSlash (…)"`), so `.startswith()`/exact-match checks fail — `.strip()` and normalize first.

---

## Related
- `scripts/crank-ids.mjs` — the render+upload script (this SOP's deterministic half).
- `app/render/page.tsx` — the headless render route.
- `~/Projects/tomo/launch-headshots/_review.json` — the needsNewPhoto / review ledger.
- `~/Projects/tomo/brainstorm/tomoland-id-snapshot-*.md` — minted-id snapshot (numbering).
