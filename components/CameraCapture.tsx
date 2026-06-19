'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { playShutterSound } from '@/lib/clickSound'
import RedShutterSphere from './RedShutterSphere'

const CAPTURE_W = 480
const CAPTURE_H = 560
/** Outer retro camera body — kiosk text/buttons align to this width */
export const CAMERA_BODY_W = 400

interface CameraCaptureProps {
  onCapture: (blob: Blob, previewUrl: string) => void
  onClear: () => void
  capturedUrl: string | null
  compact?: boolean
  autoStart?: boolean
}

function ViewfinderOverlay({ active }: { active: boolean }) {
  if (!active) return null

  const corner = (pos: React.CSSProperties) => ({
    position: 'absolute' as const,
    width: 14,
    height: 14,
    border: '2px solid rgba(255, 255, 255, 0.92)',
    ...pos,
  })

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div style={corner({ top: 10, left: 10, borderRight: 'none', borderBottom: 'none' })} />
      <div style={corner({ top: 10, right: 10, borderLeft: 'none', borderBottom: 'none' })} />
      <div style={corner({ bottom: 10, left: 10, borderRight: 'none', borderTop: 'none' })} />
      <div style={corner({ bottom: 10, right: 10, borderLeft: 'none', borderTop: 'none' })} />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 22,
          height: 22,
          border: '1px solid rgba(255, 255, 255, 0.65)',
          borderRadius: '50%',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 10,
          right: 10,
          height: 1,
          background: 'rgba(255, 255, 255, 0.45)',
          transform: 'translateY(-50%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 10,
          bottom: 10,
          width: 1,
          background: 'rgba(255, 255, 255, 0.45)',
          transform: 'translateX(-50%)',
        }}
      />
    </div>
  )
}

function screwStyle(pos: React.CSSProperties): React.CSSProperties {
  return {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: '50%',
    background:
      'linear-gradient(135deg, transparent 44%, rgba(44,37,17,0.55) 44%, rgba(44,37,17,0.55) 56%, transparent 56%), radial-gradient(circle at 35% 30%, #f3f3f3 0%, #c4c4c4 45%, #8c8c8c 100%)',
    border: '1px solid rgba(44,37,17,0.4)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.5)',
    pointerEvents: 'none',
    ...pos,
  }
}

/** Dial-style tick ring behind the shutter button */
function ShutterBezel() {
  const ticks = Array.from({ length: 12 })
  const center = 42
  const radius = 39

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {ticks.map((_, i) => {
        const angle = (i * 360) / ticks.length
        const rad = (angle * Math.PI) / 180
        const major = i % 3 === 0
        const size = major ? 3 : 2
        const x = center + radius * Math.sin(rad)
        const y = center - radius * Math.cos(rad)
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: y,
              left: x,
              width: size,
              height: size,
              borderRadius: '50%',
              background: major ? 'rgba(44,37,17,0.55)' : 'rgba(44,37,17,0.3)',
              transform: 'translate(-50%, -50%)',
            }}
          />
        )
      })}
    </div>
  )
}

export default function CameraCapture({
  onCapture,
  onClear,
  capturedUrl,
  compact = false,
  autoStart = false,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [mode, setMode] = useState<'idle' | 'camera' | 'file'>('idle')
  const [cameraError, setCameraError] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [flash, setFlash] = useState(false)
  const [videoReady, setVideoReady] = useState(false)

  const lcdW = compact ? 180 : 240
  const lcdH = compact ? 210 : 280
  const bodyMaxW = CAMERA_BODY_W

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  const startCamera = useCallback(async () => {
    setCameraError(false)
    setPermissionDenied(false)
    stopCamera()

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(true)
      setMode('file')
      return
    }

    try {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: CAPTURE_W },
            height: { ideal: CAPTURE_H },
          },
          audio: false,
        })
      } catch (inner) {
        if (inner instanceof DOMException && inner.name === 'NotAllowedError') {
          throw inner
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        })
      }
      streamRef.current = stream
      setMode('camera')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setPermissionDenied(true)
      }
      setCameraError(true)
      setMode('file')
    }
  }, [stopCamera])

  // Video mounts only after mode === 'camera' — attach stream once the element exists.
  useEffect(() => {
    if (mode !== 'camera') {
      setVideoReady(false)
      return
    }
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return

    const onReady = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) setVideoReady(true)
    }

    video.srcObject = stream
    video.addEventListener('loadedmetadata', onReady)
    void video.play().then(onReady).catch(() => {
      setCameraError(true)
      setMode('file')
      stopCamera()
    })

    return () => {
      video.removeEventListener('loadedmetadata', onReady)
    }
  }, [mode, stopCamera])

  useEffect(() => {
    if (autoStart && !capturedUrl) {
      void startCamera()
    }
  }, [autoStart, capturedUrl, startCamera])

  useEffect(() => {
    if (!autoStart) {
      stopCamera()
      if (!capturedUrl) setMode('idle')
    }
  }, [autoStart, capturedUrl, stopCamera])

  function capture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !videoReady) return

    const vw = video.videoWidth
    const vh = video.videoHeight
    if (!vw || !vh) return

    playShutterSound()
    setFlash(true)
    setTimeout(() => setFlash(false), 180)

    canvas.width = CAPTURE_W
    canvas.height = CAPTURE_H
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const targetRatio = CAPTURE_W / CAPTURE_H
    const srcRatio = vw / vh

    let sx = 0,
      sy = 0,
      sw = vw,
      sh = vh
    if (srcRatio > targetRatio) {
      sw = vh * targetRatio
      sx = (vw - sw) / 2
    } else {
      sh = vw / targetRatio
      sy = (vh - sh) / 2
    }

    ctx.translate(CAPTURE_W, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, CAPTURE_W, CAPTURE_H)
    ctx.setTransform(1, 0, 0, 1, 0, 0)

    stopCamera()

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        onCapture(blob, url)
      },
      'image/jpeg',
      0.85,
    )
  }

  function retake() {
    onClear()
    setMode('idle')
    if (autoStart) startCamera()
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      alert('Please upload a JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File must be under 5 MB.')
      return
    }

    const url = URL.createObjectURL(file)
    onCapture(file, url)
  }

  const showOverlay = mode === 'camera' && !capturedUrl

  const lcdContent = () => {
    if (capturedUrl) {
      return (
        <img
          src={capturedUrl}
          alt="Your photo"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )
    }

    if (mode === 'camera') {
      return (
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
          }}
        />
      )
    }

    if (mode === 'file') {
      return (
        <div
          data-sound-click
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: 8,
            cursor: 'pointer',
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <span style={lcdTextStyle}>NO CAM</span>
          <span style={{ ...lcdTextStyle, fontSize: 8 }}>TAP TO UPLOAD</span>
        </div>
      )
    }

    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={lcdTextStyle}>STANDBY</span>
      </div>
    )
  }

  const captureAction = mode === 'camera' ? capture : startCamera

  const panelDisabled = Boolean(capturedUrl)
  const panelLabel = capturedUrl ? '✓ READY' : mode === 'file' ? '↻ RETRY CAM' : '↑ UPLOAD'

  function handlePanelClick() {
    if (capturedUrl) return
    if (mode === 'file') {
      setCameraError(false)
      setMode('idle')
      startCamera()
      return
    }
    stopCamera()
    setMode('file')
    fileInputRef.current?.click()
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        width: '100%',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: bodyMaxW,
          maxWidth: '100%',
          margin: '0 auto',
          background: 'linear-gradient(180deg, #d8d8d8 0%, #b8b8b8 100%)',
          border: '2px solid var(--color-border)',
          boxShadow: 'inset 0 2px 0 #ececec, inset 0 -3px 0 #9a9a9a, 3px 4px 0 rgba(44,37,17,0.12)',
          padding: '10px 10px 14px 12px',
          boxSizing: 'border-box',
        }}
      >
        <div aria-hidden style={screwStyle({ top: 5, left: 5 })} />
        <div aria-hidden style={screwStyle({ top: 5, right: 5 })} />
        <div aria-hidden style={screwStyle({ bottom: 5, left: 5 })} />
        <div aria-hidden style={screwStyle({ bottom: 5, right: 5 })} />
        <div aria-hidden style={gripStrapStyle} />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
            gap: 8,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 700,
              color: 'var(--color-ink)',
              letterSpacing: 1,
              flexShrink: 0,
            }}
          >
            TOMO CAM
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: mode === 'camera' && !capturedUrl ? '#51AAFE' : '#888',
                border: '1px solid var(--color-border)',
                boxShadow:
                  mode === 'camera' && !capturedUrl
                    ? '0 0 4px 1px rgba(81,170,254,0.8)'
                    : 'none',
                flexShrink: 0,
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 14,
            alignItems: 'stretch',
            justifyContent: 'space-between',
            paddingRight: 14,
          }}
        >
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <span aria-hidden style={lensLabelStyle}>
              AF
            </span>
            <div style={housingStyle}>
              <div
                style={{
                  position: 'relative',
                  width: lcdW,
                  height: lcdH,
                  background: '#1a2a1a',
                  border: '3px solid #2C2511',
                  boxShadow: 'inset 0 0 12px rgba(0,0,0,0.6)',
                  overflow: 'hidden',
                }}
              >
                {lcdContent()}
                <ViewfinderOverlay active={showOverlay} />
                {flash && (
                  <div
                    aria-hidden
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(255,255,255,0.85)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 40%)',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              flex: 1,
              minWidth: 0,
              paddingRight: 2,
              minHeight: lcdH,
            }}
          >
            <button
              type="button"
              onClick={handlePanelClick}
              disabled={panelDisabled}
              style={panelBtnStyle(panelDisabled)}
            >
              {panelLabel}
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'center' }}>
              <div aria-hidden style={slatStyle} />
              <div aria-hidden style={slatStyle} />
            </div>

            <div
              style={{
                position: 'relative',
                width: 84,
                height: 84,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <div aria-hidden style={haloStyle} />
              <ShutterBezel />
              <button
                type="button"
                data-sound-shutter
                aria-label="Take photo"
                onClick={captureAction}
                disabled={Boolean(capturedUrl) || (mode === 'camera' && !videoReady)}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  border: '3px solid var(--color-border)',
                  background: 'linear-gradient(180deg, #e8e8e8 0%, #a0a0a0 100%)',
                  boxShadow: 'inset 0 2px 0 #fff, 0 2px 0 rgba(44,37,17,0.2)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <RedShutterSphere size={44} inactive={Boolean(capturedUrl)} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <div aria-hidden style={knobStyle} />
              <div aria-hidden style={knobStyle} />
            </div>

            {capturedUrl && (
              <button type="button" onClick={retake} style={camBtnStyle}>
                ↻ RETAKE
              </button>
            )}
          </div>
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      {cameraError && mode === 'file' && (
        <p style={{ fontSize: 12, color: 'var(--color-ink-muted)', margin: 0, textAlign: 'center' }}>
          {permissionDenied
            ? 'Camera blocked — allow camera for this site in your browser settings, then tap ↻ RETRY CAM or the shutter.'
            : 'Camera not available — tap the shutter to try again, or upload a photo.'}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </div>
  )
}

const lcdTextStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 700,
  color: '#7fba7f',
  letterSpacing: 1,
}

const camBtnStyle: React.CSSProperties = {
  background: '#c0c0c0',
  color: 'var(--color-ink)',
  border: '1.5px solid var(--color-border)',
  padding: '6px 12px',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 0.5,
  cursor: 'pointer',
  boxShadow: 'inset 0 1px 0 #e0e0e0',
  minWidth: 64,
  textAlign: 'center',
}

const housingStyle: React.CSSProperties = {
  padding: 5,
  borderRadius: 10,
  background: 'linear-gradient(155deg, #fffef4 0%, #f1ecd2 60%, #ddd6b0 100%)',
  border: '1.5px solid rgba(44,37,17,0.5)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 1px 2px 0 rgba(44,37,17,0.15)',
}

const lensLabelStyle: React.CSSProperties = {
  position: 'absolute',
  top: -7,
  left: 8,
  zIndex: 1,
  background: 'var(--color-border)',
  color: 'var(--color-tomo-yellow)',
  fontFamily: 'var(--font-mono)',
  fontSize: 7,
  fontWeight: 900,
  padding: '1px 4px',
  letterSpacing: 0.5,
  borderRadius: 2,
}

function panelBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '8px 6px',
    borderRadius: 10,
    border: '2px solid var(--color-border)',
    background: disabled
      ? 'linear-gradient(180deg, #d4d4d4 0%, #aaa 55%, #999 100%)'
      : 'linear-gradient(180deg, #f0f0f0 0%, #c4c4c4 55%, #a8a8a8 100%)',
    boxShadow: disabled
      ? 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -2px 3px rgba(0,0,0,0.18)'
      : 'inset 0 2px 0 rgba(255,255,255,0.65), inset 0 -3px 4px rgba(0,0,0,0.22), 2px 3px 0 rgba(44,37,17,0.18)',
    color: 'var(--color-ink)',
    fontFamily: 'var(--font-mono)',
    fontWeight: 900,
    fontSize: 10,
    letterSpacing: 0.6,
    textShadow: '0 1px 0 rgba(255,255,255,0.5)',
    cursor: disabled ? 'default' : 'pointer',
    textAlign: 'center',
    flexShrink: 0,
  }
}

const slatStyle: React.CSSProperties = {
  width: 52,
  height: 9,
  borderRadius: 5,
  background: 'linear-gradient(180deg, #e6e6e6 0%, #aaa 100%)',
  border: '1px solid rgba(44,37,17,0.45)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 1px rgba(0,0,0,0.25)',
}

const haloStyle: React.CSSProperties = {
  position: 'absolute',
  width: 74,
  height: 74,
  borderRadius: '50%',
  background:
    'radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(200,200,200,0.22) 65%, transparent 100%)',
  pointerEvents: 'none',
}

const knobStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: '50%',
  background:
    'linear-gradient(145deg, transparent 46%, rgba(44,37,17,0.5) 46%, rgba(44,37,17,0.5) 54%, transparent 54%), radial-gradient(circle at 35% 30%, #f0f0f0 0%, #bdbdbd 50%, #828282 100%)',
  border: '1px solid rgba(44,37,17,0.45)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 1px 1px 0 rgba(44,37,17,0.15)',
}

const gripStrapStyle: React.CSSProperties = {
  position: 'absolute',
  right: 3,
  top: '14%',
  bottom: '14%',
  width: 9,
  borderRadius: 5,
  background: 'linear-gradient(90deg, #aeaeae 0%, #d4d4d4 45%, #9c9c9c 100%)',
  border: '1px solid rgba(44,37,17,0.4)',
  boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.5), inset -1px 0 0 rgba(0,0,0,0.2)',
  pointerEvents: 'none',
}
