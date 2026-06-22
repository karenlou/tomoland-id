import { xShareIntentUrl } from '@/lib/xShareTemplate'

/** Long enough to always overflow the narrow list column at this font size,
 * so it gets clipped flush with the text's full width rather than falling short. */
const DIVIDER_DOTS = '.'.repeat(120)

// Reference measurements straight from the Figma mockup (node 80:3632) —
// its native scale already lands almost exactly at SPOTLIGHT_SLEEVE_W, so
// these are used directly rather than scaled down.
const LEFT_BOX_W = 282
const RIGHT_RECT_W = 163.064
/** /ad-phone-tag.svg's own viewBox: full size (incl. tail) vs. rectangle-only */
const TAG_FULL_W = 171.065
const TAG_FULL_H = 207.106
const TAG_RECT_H = 185.611

/** Percent split so left-box + right-box-*rectangle* (excluding the tail)
 * sum to exactly 100% of the available width — responsive, not fixed px.
 * This is what lets the whole block stretch to fill any container width
 * (e.g. matching the directory list beside/below it) without distorting it. */
const LEFT_PCT = (LEFT_BOX_W / (LEFT_BOX_W + RIGHT_RECT_W)) * 100
/** The actual right-panel content is rendered wider than its flex slot by
 * this ratio, so the tail pokes out past the nominal 100% width boundary
 * instead of being squeezed inside it. */
const TAIL_WIDTH_RATIO = (TAG_FULL_W / RIGHT_RECT_W) * 100

/** Slightly under the mockup's own native height, to keep the tail compact
 * once the whole block gets scaled up to match the directory's height.
 * Fixed regardless of width — the padding/sizing here is tuned to the
 * mockup and shouldn't vary with viewport. */
const LEFT_PANEL_H = 160
const RIGHT_PANEL_H = Math.round(LEFT_PANEL_H * (TAG_FULL_H / TAG_RECT_H))

const displayFont = "'Reform ST Trial', 'Arial Black', Impact, sans-serif"

const adLinkStyle: React.CSSProperties = {
  color: 'inherit',
  textDecoration: 'underline',
  textUnderlineOffset: 2,
}

const adSteps: React.ReactNode[] = [
  <>
    Post your newly-issued ID on{' '}
    <a
      href={xShareIntentUrl()}
      target="_blank"
      rel="noopener noreferrer"
      style={adLinkStyle}
    >
      X
    </a>{' '}
    and tag @tomo
  </>,
  'We will reach out and send you your physical ID',
  'Now you’re officially a Tomosapien!!!!!!!!!!!!!!!',
]

/**
 * Per Figma node 80:3632 — a yellow-pages-style classified ad for getting a
 * physical ID printed. Two panels side by side: instructions + mascot badge
 * on the left, a speech-bubble-tag phone number callout on the right. Flat
 * black/transparent (no fill), so it reads as a printed insert, not UI chrome.
 */
export default function PrintAd() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        width: '100%',
        flexShrink: 0,
      }}
    >
      {/* Left panel — header, mascot badge, instructions */}
      <div
        style={{
          flex: `0 0 ${LEFT_PCT}%`,
          minWidth: 0,
          /* A minimum rather than a fixed height — the header's font shrinks
           * to fit the available width (below), but the body copy doesn't,
           * so on a narrow panel it can wrap to extra lines; the box grows
           * to hug that instead of clipping it. */
          minHeight: LEFT_PANEL_H,
          boxSizing: 'border-box',
          border: '1.5px solid #000000',
          padding: '9px 10px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 9,
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: displayFont,
            fontWeight: 700,
            /* Shrinks to fit the panel's width instead of overflowing it —
             * 20px is the original/desktop size (panel comfortably exceeds
             * that width there), down to a 11px floor so it stays legible. */
            fontSize: 'clamp(11px, 4.5vw, 20px)',
            color: '#000000',
            textAlign: 'center',
            lineHeight: 1.15,
            whiteSpace: 'nowrap',
          }}
        >
          Want your ID in print?
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div
            style={{
              flexShrink: 0,
              width: 60,
              height: 60,
              background: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img src="/ad-mascot-white.svg" alt="" aria-hidden width={44} height={47} />
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: 'var(--font-body)',
              fontWeight: 'var(--weight-regular)',
              fontSize: 10,
              color: '#000000',
              lineHeight: 1.3,
            }}
          >
            {adSteps.map((step, i) => (
              <div key={i}>
                {i > 0 && (
                  <p style={{ margin: 0, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {DIVIDER_DOTS}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 4 }}>
                  <span style={{ flexShrink: 0 }}>{i + 1}.</span>
                  <span>{step}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — phone number tag. Sized to its rectangle-only width
       * in the flex layout; the inner content overflows wider to show the tail. */}
      <div style={{ flex: 1, minWidth: 0, height: RIGHT_PANEL_H, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${TAIL_WIDTH_RATIO}%`,
            height: '100%',
          }}
        >
          <img
            src="/ad-phone-tag.svg"
            alt=""
            aria-hidden
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          />
          <p
            style={{
              position: 'absolute',
              left: '44%',
              top: '14%',
              transform: 'translate(-50%, -50%)',
              margin: 0,
              fontFamily: 'var(--font-body)',
              fontWeight: 500,
              fontSize: 12,
              color: '#000000',
              whiteSpace: 'nowrap',
            }}
          >
            Text Tomo at
          </p>
          <p
            style={{
              position: 'absolute',
              left: '44%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              margin: 0,
              width: '81%',
              fontFamily: displayFont,
              fontWeight: 700,
              fontSize: 24,
              color: '#000000',
              textAlign: 'center',
              lineHeight: 0.95,
            }}
          >
            +1 (415) 770 - 0048
          </p>
        </div>
      </div>
    </div>
  )
}
