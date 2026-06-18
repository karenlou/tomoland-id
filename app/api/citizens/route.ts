import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { createEphemeralCitizen } from '@/lib/ephemeralCitizen'
import { isValidRole, randomRole } from '@/lib/roles'
import { isProfane } from '@/lib/profanity'

const EPHEMERAL = process.env.CITIZENS_EPHEMERAL !== 'false'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { name, photoUrl, relationToTomo } = body as {
    name?: string
    photoUrl?: string
    relationToTomo?: string
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

  // Ephemeral mode — skip DB persistence (testing)
  if (EPHEMERAL) {
    return NextResponse.json(
      { citizen: createEphemeralCitizen(name, photoUrl ?? null, relation) },
      { status: 201 },
    )
  }

  // Insert citizen
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('citizens')
    .insert({
      name: name.trim(),
      relation_to_tomo: relation,
      place_of_issue: 'San Francisco, CA',
      photo_url: photoUrl ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('Supabase insert error:', error)
    return NextResponse.json({ error: 'Failed to create citizen.' }, { status: 500 })
  }

  return NextResponse.json({ citizen: data }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Citizen id is required.' }, { status: 400 })
  }

  if (EPHEMERAL) {
    return NextResponse.json({ ok: true })
  }

  const supabase = createServiceClient()
  const { error } = await supabase.from('citizens').delete().eq('id', id)

  if (error) {
    console.error('Supabase delete error:', error)
    return NextResponse.json({ error: 'Failed to delete citizen.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
