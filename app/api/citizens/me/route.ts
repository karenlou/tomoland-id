import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const PUBLIC_COLUMNS =
  'id, citizen_number, name, relation_to_tomo, place_of_issue, photo_url, created_at, tomoland_id'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')?.trim()
  if (!token) {
    return NextResponse.json({ error: 'Device token is required.' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('citizens')
    .select(PUBLIC_COLUMNS)
    .eq('owner_token', token)
    .maybeSingle()

  if (error) {
    if (error.message.includes('owner_token')) {
      return NextResponse.json(
        { error: 'Owner token support is not configured yet.' },
        { status: 503 },
      )
    }
    console.error('Supabase owner lookup error:', error)
    return NextResponse.json({ error: 'Failed to look up your ID.' }, { status: 500 })
  }

  return NextResponse.json({ citizen: data ?? null })
}
