import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const PUBLIC_COLUMNS =
  'id, citizen_number, name, relation_to_tomo, place_of_issue, photo_url, created_at, tomoland_id'

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

function parseToken(req: NextRequest): string | null {
  const token = req.nextUrl.searchParams.get('token')?.trim()
  return token && isUuid(token) ? token : null
}

/** Return the citizen owned by this device's token. */
export async function GET(req: NextRequest) {
  const token = parseToken(req)
  if (!token) {
    return NextResponse.json({ error: 'Valid device token is required.' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('citizens')
    .select(PUBLIC_COLUMNS)
    .eq('owner_token', token)
    .maybeSingle()

  if (error) {
    if (error.message.includes('owner_token')) {
      return NextResponse.json({ citizen: null })
    }
    console.error('Supabase mine lookup error:', error)
    return NextResponse.json({ error: 'Failed to look up your ID.' }, { status: 500 })
  }

  return NextResponse.json({ citizen: data ?? null })
}

/** Delete the citizen owned by this device's token. */
export async function DELETE(req: NextRequest) {
  const token = parseToken(req)
  if (!token) {
    return NextResponse.json({ error: 'Valid device token is required.' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('citizens')
    .delete()
    .eq('owner_token', token)
    .select('id')

  if (error) {
    console.error('Supabase mine delete error:', error)
    return NextResponse.json({ error: 'Failed to delete your ID.' }, { status: 500 })
  }

  if (!data?.length) {
    return NextResponse.json({ error: 'No ID found for this device.' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, id: data[0].id })
}
