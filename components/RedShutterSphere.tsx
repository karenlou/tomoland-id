interface RedShutterSphereProps {
  size?: number
  inactive?: boolean
}

/** Saturated red shutter sphere — shared by camera capture button and slot lever. */
export default function RedShutterSphere({
  size = 44,
  inactive = false,
}: RedShutterSphereProps) {
  const scale = size / 44

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        background: inactive
          ? 'linear-gradient(180deg, #999 0%, #666 100%)'
          : 'linear-gradient(180deg, #ff1212 0%, #e80000 45%, #b50000 100%)',
        border: inactive ? '2px solid #2C2511' : '2.5px solid #141008',
        boxShadow: inactive
          ? 'inset 0 1px 0 rgba(255,255,255,0.15)'
          : 'inset 0 -6px 10px rgba(70,0,0,0.55), inset 0 2px 0 rgba(255,90,90,0.75)',
        boxSizing: 'border-box',
      }}
    >
      {!inactive && (
        <>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 3 * scale,
              left: 5 * scale,
              width: 22 * scale,
              height: 13 * scale,
              borderRadius: '50%',
              background:
                'linear-gradient(180deg, #ffffff 0%, #ffb0b0 38%, transparent 72%)',
              transform: 'rotate(-14deg)',
              pointerEvents: 'none',
            }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 5 * scale,
              left: 8 * scale,
              width: 8 * scale,
              height: 4 * scale,
              borderRadius: '50%',
              background: '#fff',
              opacity: 0.95,
              transform: 'rotate(-14deg)',
              pointerEvents: 'none',
            }}
          />
        </>
      )}
    </div>
  )
}
