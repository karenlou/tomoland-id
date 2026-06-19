'use client'

import { useCallback, useRef, useState, type RefObject } from 'react'
import CameraCapture, { CAMERA_BODY_W } from './CameraCapture'
import PartyCard from './PartyCard'
import RoleSlotMachine from './RoleSlotMachine'
import { supabase } from '@/lib/supabase'
import { isProfane } from '@/lib/profanity'
import { CARD_BORDER, CARD_H, CARD_W, CARD_SHADOW, PARTY_CARD_H, PARTY_CARD_SCALE, PARTY_CARD_W, cardRadiusAtScale } from '@/lib/cardConstants'
import type { Role } from '@/lib/roles'
import type { Citizen } from '@/types'

type Step = 'name' | 'role' | 'photo' | 'saving' | 'preview'

const PLACE_OF_ISSUE = 'San Francisco, CA'
/** Content column matches retro camera body width */
const KIOSK_CONTENT_W = CAMERA_BODY_W
/** Scale card preview to the same width as the camera graphic */
const PREVIEW_DISPLAY_SCALE = KIOSK_CONTENT_W / PARTY_CARD_W
const PREVIEW_CONTENT_GAP = 28
const STEP_GAP = 12
const ACTION_GAP = 16

function sanitizeFilename(name: string): string {
  return name.trim().replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, ' ').trim() || 'Guest'
}

function PartyCardPreview({
  citizen,
  preview,
  exportRef,
}: {
  citizen: Partial<Citizen>
  preview?: boolean
  exportRef?: RefObject<HTMLDivElement | null>
}) {
  const visibleW = PARTY_CARD_W * PREVIEW_DISPLAY_SCALE
  const visibleH = PARTY_CARD_H * PREVIEW_DISPLAY_SCALE
  const frameRadius = cardRadiusAtScale(PREVIEW_DISPLAY_SCALE * PARTY_CARD_SCALE)

  return (
    <div
      className="id-surface"
      style={{
        width: visibleW,
        height: visibleH,
        overflow: 'hidden',
        flexShrink: 0,
        borderRadius: frameRadius,
        border: CARD_BORDER,
        boxShadow: CARD_SHADOW,
      }}
    >
      <div
        style={{
          transform: `scale(${PREVIEW_DISPLAY_SCALE})`,
          transformOrigin: 'top left',
          width: PARTY_CARD_W,
          height: PARTY_CARD_H,
        }}
      >
        <div
          ref={exportRef}
          style={{
            width: PARTY_CARD_W,
            height: PARTY_CARD_H,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              transform: `scale(${PARTY_CARD_SCALE})`,
              transformOrigin: 'top left',
              width: CARD_W,
              height: CARD_H,
            }}
          >
            <PartyCard citizen={citizen} preview={preview} />
          </div>
        </div>
      </div>
    </div>
  )
}

function StepActionSlot({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`kiosk-step-action-slot ${open ? 'kiosk-step-action-slot--open' : 'kiosk-step-action-slot--closed'}`}
    >
      <div>{open ? <div className="kiosk-step-action-reveal">{children}</div> : null}</div>
    </div>
  )
}

export default function PartyKiosk() {
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role | null>(null)
  const [roleSpinning, setRoleSpinning] = useState(false)
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [savedCitizen, setSavedCitizen] = useState<Citizen | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  const previewCitizen: Partial<Citizen> = {
    name: name || undefined,
    relation_to_tomo: role ?? undefined,
    photo_url: photoPreviewUrl,
    place_of_issue: PLACE_OF_ISSUE,
  }

  function resetAll() {
    setStep('name')
    setName('')
    setRole(null)
    setRoleSpinning(false)
    setPhotoBlob(null)
    setPhotoPreviewUrl(null)
    setSavedCitizen(null)
    setError(null)
    setDownloading(false)
  }

  const handleCapture = useCallback((blob: Blob, url: string) => {
    setPhotoBlob(blob)
    setPhotoPreviewUrl(url)
  }, [])

  const handleClear = useCallback(() => {
    setPhotoBlob(null)
    setPhotoPreviewUrl(null)
  }, [])

  function goToRole() {
    setError(null)
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Enter a name to continue.')
      return
    }
    if (trimmed.length > 60) {
      setError('Name must be 60 characters or fewer.')
      return
    }
    if (isProfane(trimmed)) {
      setError('Please use your real name.')
      return
    }
    setRole(null)
    setRoleSpinning(false)
    setStep('role')
  }

  function goToPhoto() {
    setError(null)
    if (!role) {
      setError('Tap Randomize to pick a role.')
      return
    }
    if (roleSpinning) {
      setError('Wait for the reel to land.')
      return
    }
    setStep('photo')
  }

  async function handleSave() {
    setError(null)
    setStep('saving')

    try {
      let photoUrl: string | null = null

      if (photoBlob) {
        const ext = photoBlob.type === 'image/png' ? 'png' : 'jpg'
        const path = `photos/party-${crypto.randomUUID()}.${ext}`
        const { data: uploaded, error: uploadError } = await supabase.storage
          .from('citizen-photos')
          .upload(path, photoBlob, {
            contentType: photoBlob.type,
            cacheControl: '31536000',
          })
        if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`)
        const {
          data: { publicUrl },
        } = supabase.storage.from('citizen-photos').getPublicUrl(uploaded.path)
        photoUrl = publicUrl
      }

      const { data, error: insertError } = await supabase
        .from('party_citizens')
        .insert({
          name: name.trim(),
          relation_to_tomo: role,
          place_of_issue: PLACE_OF_ISSUE,
          photo_url: photoUrl,
        })
        .select()
        .single()

      if (insertError) throw new Error(insertError.message)

      setSavedCitizen(data as Citizen)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong saving your ID.')
      setStep('photo')
    }
  }

  async function handleDownload() {
    if (!exportRef.current || downloading) return
    setDownloading(true)
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(exportRef.current, { pixelRatio: 1 })
      const link = document.createElement('a')
      link.download = `${sanitizeFilename(name)}-TomolandID.png`
      link.href = dataUrl
      link.click()
    } catch {
      setError('Download failed — try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      style={{
        height: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 36,
        background: 'var(--color-paper)',
        padding: '32px 24px',
        boxSizing: 'border-box',
      }}
    >
      <p
        style={{
          position: 'absolute',
          top: 28,
          left: 0,
          right: 0,
          textAlign: 'center',
          margin: 0,
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          color: 'var(--color-ink-muted)',
          textTransform: 'none',
          letterSpacing: 1,
        }}
      >
        Tomoland ID Kiosk
      </p>

      {step === 'name' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: PREVIEW_CONTENT_GAP,
            width: '100%',
            maxWidth: KIOSK_CONTENT_W,
          }}
        >
          <PartyCardPreview citizen={previewCitizen} preview />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: STEP_GAP,
              width: '100%',
            }}
          >
            <p style={stepPromptStyle}>What&apos;s your name?</p>
            <div style={{ display: 'flex', gap: 16, width: '100%', alignItems: 'stretch' }}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={60}
                autoFocus
                style={stepInputStyle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    goToRole()
                  }
                }}
              />
              <button
                type="button"
                onClick={goToRole}
                style={stepBtnStyle(!name.trim())}
                disabled={!name.trim()}
              >
                Next →
              </button>
            </div>
            {error && <p style={errorStyle}>{error}</p>}
          </div>
        </div>
      )}

      {step === 'role' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: ACTION_GAP,
            width: '100%',
            maxWidth: KIOSK_CONTENT_W,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: STEP_GAP, width: '100%' }}>
            <p style={stepPromptStyle}>What&apos;s your role in Tomoland?</p>
            <RoleSlotMachine onResolved={setRole} onSpinChange={setRoleSpinning} bigButton />
            {error && <p style={errorStyle}>{error}</p>}
          </div>
          <StepActionSlot open={!!role}>
            <button
              type="button"
              onClick={goToPhoto}
              style={{ ...stepBtnStyle(roleSpinning), width: '100%' }}
              disabled={roleSpinning}
            >
              Next →
            </button>
          </StepActionSlot>
        </div>
      )}

      {step === 'photo' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: ACTION_GAP,
            width: '100%',
            maxWidth: KIOSK_CONTENT_W,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: STEP_GAP, width: '100%' }}>
            <p style={stepPromptStyle}>Smile!</p>
            <CameraCapture
              onCapture={handleCapture}
              onClear={handleClear}
              capturedUrl={photoPreviewUrl}
              autoStart
            />
            {error && <p style={errorStyle}>{error}</p>}
          </div>
          <StepActionSlot open={!!photoPreviewUrl}>
            <button
              type="button"
              onClick={handleSave}
              style={{ ...stepBtnStyle(false), width: '100%' }}
            >
              Looks good →
            </button>
          </StepActionSlot>
        </div>
      )}

      {step === 'saving' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            background: 'var(--color-paper)',
          }}
        >
          <img
            src="/RetroMac.png"
            alt=""
            aria-hidden
            width={192}
            height={192}
            style={{ imageRendering: 'pixelated', display: 'block' }}
          />
          <p style={{ ...stepPromptStyle, textAlign: 'center' }}>Printing...</p>
        </div>
      )}

      {step === 'preview' && savedCitizen && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: ACTION_GAP,
            width: '100%',
            maxWidth: KIOSK_CONTENT_W,
          }}
        >
          <PartyCardPreview citizen={savedCitizen} exportRef={exportRef} />

          {error && <p style={errorStyle}>{error}</p>}

          <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              aria-label="Download ID"
              style={stepPreviewBtnStyle(downloading)}
            >
              <DownloadIcon />
            </button>
            <button type="button" onClick={resetAll} style={stepPreviewSecondaryBtnStyle}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const stepPromptStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 24,
  color: 'var(--color-ink)',
  margin: 0,
  textAlign: 'left',
  width: '100%',
}

const stepInputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontFamily: 'var(--font-body)',
  fontSize: 24,
  color: 'var(--color-ink)',
  background: 'transparent',
  border: '2px solid var(--color-border)',
  padding: '14px 18px',
  outline: 'none',
  boxSizing: 'border-box',
}

function stepBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    flexShrink: 0,
    background: disabled ? 'var(--color-ink-muted)' : 'var(--color-ink)',
    color: 'var(--color-tomo-yellow)',
    border: '2px solid var(--color-border)',
    padding: '14px 24px',
    fontFamily: 'var(--font-body)',
    fontSize: 20,
    fontWeight: 'var(--weight-bold)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    whiteSpace: 'nowrap',
  }
}

const stepSecondaryBtnStyle: React.CSSProperties = {
  background: 'transparent',
  color: 'var(--color-ink)',
  border: '2px solid var(--color-border)',
  padding: '14px 24px',
  fontFamily: 'var(--font-body)',
  fontSize: 20,
  fontWeight: 'var(--weight-bold)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

function stepPreviewBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    ...stepBtnStyle(disabled),
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  }
}

const stepPreviewSecondaryBtnStyle: React.CSSProperties = {
  ...stepSecondaryBtnStyle,
  flex: 1,
  minWidth: 0,
  textAlign: 'center',
}

function DownloadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4v10M8 10l4 4 4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <path d="M5 19h14" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  )
}

const errorStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 24,
  color: 'var(--color-error)',
  margin: 0,
  textAlign: 'left',
}
