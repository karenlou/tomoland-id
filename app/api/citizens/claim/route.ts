import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

/** Link an existing citizen (no owner yet) to this device's token. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { citizenId, deviceToken } = body as {
    citizenId?: string
    deviceToken?: string
  }

  if (!citizenId || !deviceToken || !isUuid(citizenId) || !isUuid(deviceToken)) {
    return NextResponse.json({ error: 'Invalid claim request.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: citizen, error: lookupError } = await supabase
    .from('citizens')
    .select('id, owner_token')
    .eq('id', citizenId)
    .maybeSingle()

  if (lookupError) {
    if (lookupError.message.includes('owner_token')) {
      return NextResponse.json({ ok: true, linked: false })
    }
    console.error('Supabase claim lookup error:', lookupError)
    return NextResponse.json({ error: 'Failed to claim citizen.' }, { status: 500 })
  }

  if (!citizen) {
    return NextResponse.json({ error: 'Citizen not found.' }, { status: 404 })
  }

  if (citizen.owner_token && citizen.owner_token !== deviceToken) {
    return NextResponse.json({ error: 'This ID belongs to another device.' }, { status: 403 })
  }

  if (citizen.owner_token === deviceToken) {
    return NextResponse.json({ ok: true, linked: true })
  }

  const { error: updateError } = await supabase
    .from('citizens')
    .update({ owner_token: deviceToken })
    .eq('id', citizenId)
    .is('owner_token', null)

  if (updateError) {
    console.error('Supabase claim update error:', updateError)
    return NextResponse.json({ error: 'Failed to claim citizen.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, linked: true })
}
