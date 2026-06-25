import { Suspense } from 'react'
import DirectoryList from '@/components/DirectoryList'
import { getCitizens } from '@/lib/getCitizens'

export const dynamic = 'force-dynamic'

export default async function DirectoryPage() {
  const citizens = await getCitizens()

  return (
    <div
      className="page-shell"
      style={{
        height: '100dvh',
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
        className="page-header"
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 10,
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
          <h1 style={{ margin: 0, lineHeight: 1 }}>
            <a
              href="/"
              data-sound-click="off"
              className="page-title-link"
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

        <div className="page-header-meta" style={{ textAlign: 'right' }}>
          {/* Desktop: label and link stack as two right-aligned lines */}
          <p
            className="page-header-meta-desktop"
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
            className="page-header-meta-desktop"
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

          {/* Mobile: same copy, one line, under the wordmark */}
          <p
            className="page-header-meta-mobile"
            style={{
              display: 'none',
              alignItems: 'center',
              gap: 6,
              margin: 0,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                fontSize: 13,
                color: '#2C2511',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              YELLOW PAGES INDEX
            </span>
            <span aria-hidden style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#2C2511' }}>
              -
            </span>
            <img
              src="/RetroMac.png"
              alt=""
              aria-hidden
              width={16}
              height={16}
              style={{ imageRendering: 'pixelated', flexShrink: 0 }}
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
          </p>
        </div>
      </header>

      <div style={{ borderTop: '2px solid #2C2511', marginBottom: 20, flexShrink: 0 }} />

      <Suspense fallback={null}>
        <DirectoryList initialCitizens={citizens} />
      </Suspense>
    </div>
  )
}
