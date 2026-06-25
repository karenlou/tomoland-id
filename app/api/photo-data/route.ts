import { NextRequest, NextResponse } from 'next/server'

function allowedPhotoHost(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  try {
    return new URL(base).hostname
  } catch {
    return null
  }
}

/** Server-side photo fetch for mobile card export — bypasses browser CORS when
 * the client cannot read Supabase storage URLs directly. */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  const host = allowedPhotoHost()

  if (!url || !host) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid URL.' }, { status: 400 })
  }

  if (
    parsed.hostname !== host ||
    !parsed.pathname.includes('/storage/v1/object/public/citizen-photos/')
  ) {
    return NextResponse.json({ error: 'URL not allowed.' }, { status: 400 })
  }

  const res = await fetch(url)
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch photo.' }, { status: 502 })
  }

  const blob = await res.blob()
  const buffer = Buffer.from(await blob.arrayBuffer())
  const type = blob.type || 'image/jpeg'

  return NextResponse.json({
    dataUrl: `data:${type};base64,${buffer.toString('base64')}`,
  })
}
