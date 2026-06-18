import { createClient } from '@supabase/supabase-js'
import { Suspense } from 'react'
import DirectoryList from '@/components/DirectoryList'
import type { Citizen } from '@/types'

export const dynamic = 'force-dynamic'

async function getCitizens(): Promise<Citizen[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return []

  const supabase = createClient(url, key)
  const { data } = await supabase
    .from('citizens')
    .select(
      'id, citizen_number, name, relation_to_tomo, place_of_issue, photo_url, created_at, tomoland_id',
    )
    .order('citizen_number', { ascending: true })
    .limit(200)

  return (data as Citizen[]) ?? []
}

export default async function DirectoryPage() {
  const citizens = await getCitizens()

  return (
    <div
      style={{
        height: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: '28px 48px',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {/* Page header — Yellow Pages style */}
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 8,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 700,
              color: '#2C2511',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            2026
          </span>
          <h1 style={{ margin: 0 }}>
            <a
              href="/"
              data-sound-click="off"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 28,
                color: '#2C2511',
                textDecoration: 'none',
              }}
            >
              TOMOLAND
            </a>
          </h1>
        </div>

        <div style={{ textAlign: 'right' }}>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              fontSize: 13,
              color: '#2C2511',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            YELLOW PAGES INDEX
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 6,
              marginTop: 2,
            }}
          >
            <img
              src="/RetroMac.png"
              alt=""
              aria-hidden
              width={18}
              height={18}
              style={{ imageRendering: 'pixelated' }}
            />
            <a
              href="https://www.tomo.ai"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                color: '#A89A70',
                textDecoration: 'none',
              }}
            >
              www.tomo.ai
            </a>
          </div>
        </div>
      </header>

      <div style={{ borderTop: '2px solid #2C2511', marginBottom: 20, flexShrink: 0 }} />

      <Suspense fallback={null}>
        <DirectoryList initialCitizens={citizens} />
      </Suspense>

      <p
        style={{
          position: 'absolute',
          right: 48,
          bottom: 28,
          margin: 0,
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          fontWeight: 'var(--weight-regular)',
          color: '#000000',
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        Questions? Text us at +1 (415) 770 - 0048
      </p>
    </div>
  )
}
