import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { createEphemeralCitizen } from '@/lib/ephemeralCitizen'
import { isValidRole, randomRole } from '@/lib/roles'
import { isProfane } from '@/lib/profanity'

const EPHEMERAL = process.env.CITIZENS_EPHEMERAL !== 'false'

const PUBLIC_COLUMNS =
  'id, citizen_number, name, relation_to_tomo, place_of_issue, photo_url, created_at, tomoland_id'

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { name, photoUrl, relationToTomo, deviceToken, previousCitizenId } = body as {
    name?: string
    photoUrl?: string
    relationToTomo?: string
    deviceToken?: string
    previousCitizenId?: string
  }

  // Validate name
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  }
  if (name.trim().length > 60) {
    return NextResponse.json({ error: 'Name is too long.' }, { status: 400 })
  }
  if (isProfane(name)) {
    return NextResponse.json(
      { error: 'Name contains inappropriate content.' },
      { status: 400 },
    )
  }

  // Relation must be one of the canonical roles the slot machine can land on —
  // never trust a client-supplied string straight into the public directory.
  if (relationToTomo !== undefined && !isValidRole(relationToTomo)) {
    return NextResponse.json({ error: 'Invalid relation.' }, { status: 400 })
  }
  const relation = relationToTomo ?? randomRole()

  // Validate photo URL if provided
  if (photoUrl && typeof photoUrl !== 'string') {
    return NextResponse.json({ error: 'Invalid photo URL.' }, { status: 400 })
  }

  const ownerToken =
    deviceToken && isUuid(deviceToken) ? deviceToken : crypto.randomUUID()

  // Ephemeral mode — skip DB persistence (testing)
  if (EPHEMERAL) {
    return NextResponse.json(
      {
        citizen: createEphemeralCitizen(name, photoUrl ?? null, relation),
        deviceToken: ownerToken,
      },
      { status: 201 },
    )
  }

  const supabase = createServiceClient()

  // Re-issue: one device token maps to one live citizen
  const { error: clearError } = await supabase
    .from('citizens')
    .delete()
    .eq('owner_token', ownerToken)

  if (clearError && !clearError.message.includes('owner_token')) {
    console.error('Supabase re-issue clear error:', clearError)
    return NextResponse.json({ error: 'Failed to create citizen.' }, { status: 500 })
  }

  // Legacy rows created before owner_token existed (same device re-issuing)
  if (previousCitizenId && isUuid(previousCitizenId)) {
    const { data: previous } = await supabase
      .from('citizens')
      .select('owner_token')
      .eq('id', previousCitizenId)
      .maybeSingle()

    if (
      previous &&
      (previous.owner_token === null || previous.owner_token === ownerToken)
    ) {
      await supabase.from('citizens').delete().eq('id', previousCitizenId)
    }
  }

  const { data, error } = await supabase
    .from('citizens')
    .insert({
      name: name.trim(),
      relation_to_tomo: relation,
      place_of_issue: 'San Francisco, CA',
      photo_url: photoUrl ?? null,
      owner_token: ownerToken,
    })
    .select(PUBLIC_COLUMNS)
    .single()

  if (error) {
    if (error.message.includes('owner_token')) {
      console.error(
        'Missing owner_token column — run scripts/add-owner-token.sql in Supabase SQL Editor.',
      )
      const { data: fallback, error: fallbackError } = await supabase
        .from('citizens')
        .insert({
          name: name.trim(),
          relation_to_tomo: relation,
          place_of_issue: 'San Francisco, CA',
          photo_url: photoUrl ?? null,
        })
        .select(PUBLIC_COLUMNS)
        .single()

      if (fallbackError) {
        console.error('Supabase insert error:', fallbackError)
        return NextResponse.json({ error: 'Failed to create citizen.' }, { status: 500 })
      }

      return NextResponse.json(
        { citizen: fallback, deviceToken: ownerToken },
        { status: 201 },
      )
    }

    console.error('Supabase insert error:', error)
    return NextResponse.json({ error: 'Failed to create citizen.' }, { status: 500 })
  }

  return NextResponse.json({ citizen: data, deviceToken: ownerToken }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const token = req.nextUrl.searchParams.get('token')?.trim()

  if (!id) {
    return NextResponse.json({ error: 'Citizen id is required.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  if (token) {
    const { data: owned, error: lookupError } = await supabase
      .from('citizens')
      .select('id')
      .eq('id', id)
      .eq('owner_token', token)
      .maybeSingle()

    if (lookupError?.message.includes('owner_token')) {
      // Column not migrated yet — allow delete by id only (legacy behavior)
    } else if (lookupError) {
      console.error('Supabase owner lookup error:', lookupError)
      return NextResponse.json({ error: 'Failed to delete citizen.' }, { status: 500 })
    } else if (!owned) {
      const { data: legacy } = await supabase
        .from('citizens')
        .select('owner_token')
        .eq('id', id)
        .maybeSingle()

      if (legacy?.owner_token) {
        return NextResponse.json(
          { error: 'You can only delete an ID created on this device.' },
          { status: 403 },
        )
      }
      // Legacy row without owner_token — allow delete if client knows the id
    }
  }

  const { error } = await supabase.from('citizens').delete().eq('id', id)

  if (error) {
    console.error('Supabase delete error:', error)
    return NextResponse.json({ error: 'Failed to delete citizen.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
