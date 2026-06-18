'use client'

import { useCallback, useEffect, useState } from 'react'
import { playClickSound } from '@/lib/clickSound'
import CameraCapture from './CameraCapture'
import CitizenCard from './CitizenCard'
import RoleSlotMachine from './RoleSlotMachine'
import { CARD_BORDER, CARD_H, CARD_W, CARD_SHADOW, cardRadiusAtScale } from '@/lib/cardConstants'
import { getOrCreateDeviceToken, getStoredMyCitizenId } from '@/lib/deviceAuth'
import { createEphemeralCitizen, isEphemeralMode } from '@/lib/ephemeralCitizen'
import type { Role } from '@/lib/roles'
import type { Citizen } from '@/types'

const SPOTLIGHT_W = 400
const SCALE = SPOTLIGHT_W / CARD_W

type CreateStep = 'name' | 'role' | 'photo' | 'submit'

const STEP_ORDER: CreateStep[] = ['name', 'role', 'photo', 'submit']

function StepProgress({ step }: { step: CreateStep }) {
  const currentIdx = STEP_ORDER.indexOf(step)
  return (
    <div
      style={{ display: 'flex', gap: 5, flexShrink: 0 }}
      aria-label={`Step ${currentIdx + 1} of ${STEP_ORDER.length}`}
    >
      {STEP_ORDER.map((_, i) => (
        <div
          key={i}
          aria-hidden
          style={{
            width: 8,
            height: 8,
            border: '1.5px solid var(--color-border)',
            background: i <= currentIdx ? 'var(--color-ink)' : 'transparent',
            boxSizing: 'border-box',
            transition: 'background 0.25s ease',
          }}
        />
      ))}
    </div>
  )
}

interface CreatePanelProps {
  onCancel: () => void
  onIssue: (citizen: Citizen) => void
}

const PREVIEW_GAP = 20
const FORM_STEP_MIN_H = 280
const STEP_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

export default function CreatePanel({ onCancel, onIssue }: CreatePanelProps) {
  const [step, setStep] = useState<CreateStep>('name')
  const [prevStep, setPrevStep] = useState<CreateStep | null>(null)
  const [stepDirection, setStepDirection] = useState<'forward' | 'back'>('forward')
  const [previewCollapsed, setPreviewCollapsed] = useState(false)
  const [name, setName] = useState('')
  const [relationToTomo, setRelationToTomo] = useState<Role | null>(null)
  const [roleSpinning, setRoleSpinning] = useState(false)
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCapture = useCallback((blob: Blob, url: string) => {
    setPhotoBlob(blob)
    setPhotoPreviewUrl(url)
  }, [])

  const handleClear = useCallback(() => {
    setPhotoBlob(null)
    setPhotoPreviewUrl(null)
  }, [])

  const cardH = Math.round(CARD_H * SCALE)
  const cardRadius = cardRadiusAtScale(SCALE)
  const previewHidden =
    step === 'role' || step === 'photo' || (step === 'name' && previewCollapsed)

  const previewCitizen = {
    name: name || undefined,
    relation_to_tomo: relationToTomo ?? undefined,
    photo_url: photoPreviewUrl,
    created_at: new Date().toISOString(),
  }

  function changeStep(next: CreateStep) {
    const currentIdx = STEP_ORDER.indexOf(step)
    const nextIdx = STEP_ORDER.indexOf(next)
    setStepDirection(nextIdx > currentIdx ? 'forward' : 'back')
    setPrevStep(step)
    setStep(next)
  }

  const stepAnimClass = stepDirection === 'back' ? 'create-step-back' : 'create-step-forward'

  function goToRole() {
    setError(null)
    if (!name.trim()) {
      setError('Please enter your name.')
      return
    }
    if (name.trim().length > 60) {
      setError('Name must be 60 characters or fewer.')
      return
    }
    setPreviewCollapsed(true)
    changeStep('role')
  }

  function goToPhoto() {
    setError(null)
    if (!relationToTomo) {
      setError('Pull the lever to choose your role.')
      return
    }
    if (roleSpinning) {
      setError('Wait for the reel to land.')
      return
    }
    changeStep('photo')
  }

  function goToSubmit() {
    setError(null)
    if (!photoBlob && !photoPreviewUrl) {
      setError('Please take or upload a photo.')
      return
    }
    changeStep('submit')
  }

  async function handleSubmit() {
    setError(null)
    setSubmitting(true)

    try {
      if (isEphemeralMode()) {
        const citizen = createEphemeralCitizen(name, photoPreviewUrl, relationToTomo ?? undefined)
        onIssue(citizen)
        return
      }

      let photoUrl: string | null = photoPreviewUrl

      if (photoBlob) {
        const { supabase } = await import('@/lib/supabase')
        const ext = photoBlob.type === 'image/png' ? 'png' : 'jpg'
        const path = `photos/${crypto.randomUUID()}.${ext}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('citizen-photos')
          .upload(path, photoBlob, {
            contentType: photoBlob.type,
            cacheControl: '31536000',
          })
        if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`)
        const {
          data: { publicUrl },
        } = supabase.storage.from('citizen-photos').getPublicUrl(uploadData.path)
        photoUrl = publicUrl
      }

      const res = await fetch('/api/citizens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          photoUrl,
          relationToTomo,
          deviceToken: getOrCreateDeviceToken(),
          previousCitizenId: getStoredMyCitizenId(),
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Something went wrong.')
      onIssue(json.citizen as Citizen)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  const previewReserve =
    step === 'submit' || (step === 'name' && !previewCollapsed) ? cardH + PREVIEW_GAP : 0

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        width: '100%',
        maxWidth: '100%',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            width: SPOTLIGHT_W,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            position: 'relative',
          }}
        >
          {/* Preview floats above the form — padding animates so the form eases up in sync */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              opacity: previewHidden ? 0 : 1,
              transform: previewHidden ? 'translateY(-12px) scale(0.98)' : 'translateY(0) scale(1)',
              pointerEvents: previewHidden ? 'none' : 'auto',
              transition: `opacity 0.42s ${STEP_EASE}, transform 0.42s ${STEP_EASE}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                className="id-surface"
                style={{
                  width: SPOTLIGHT_W,
                  height: cardH,
                  overflow: 'hidden',
                  borderRadius: cardRadius,
                  border: CARD_BORDER,
                  boxShadow: CARD_SHADOW,
                }}
              >
                <div
                  style={{
                    transform: `scale(${SCALE})`,
                    transformOrigin: 'top left',
                    width: CARD_W,
                    height: CARD_H,
                  }}
                >
                  <CitizenCard citizen={previewCitizen} preview />
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              paddingTop: previewReserve,
              transition: `padding-top 0.42s ${STEP_EASE}`,
            }}
          >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: 12,
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                fontWeight: 'var(--weight-bold)',
                color: 'var(--color-ink)',
                margin: 0,
              }}
            >
              ID Registration
            </h2>
            <StepProgress step={step} />
          </div>

          <div
            key={`${step}-${stepDirection}`}
            className={stepAnimClass}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              minHeight:
                step === 'photo'
                  ? 320
                  : step === 'role' || step === 'name'
                    ? FORM_STEP_MIN_H
                    : step === 'submit'
                      ? 48
                      : undefined,
            }}
          >
          {step === 'name' && (
            <>
              <p style={promptStyle}>What&apos;s your name?</p>
              <input
                id="create-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={60}
                autoFocus
                style={inputStyle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    playClickSound()
                    goToRole()
                  }
                }}
              />
            </>
          )}

          {step === 'role' && (
            <>
              <p style={promptStyle}>What&apos;s your relationship to Tomo?</p>
              <RoleSlotMachine onResolved={setRelationToTomo} onSpinChange={setRoleSpinning} />
            </>
          )}

          {step === 'photo' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <p style={promptStyle}>Say cheese!</p>
              <CameraCapture
                onCapture={handleCapture}
                onClear={handleClear}
                capturedUrl={photoPreviewUrl}
                compact
                autoStart
              />
            </div>
          )}

          {step === 'submit' && <p style={promptStyle}>Does everything look good?</p>}

          {error && (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                color: 'var(--color-error)',
                margin: 0,
              }}
            >
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            {step === 'name' ? (
              <button type="button" onClick={onCancel} style={secondaryBtnStyle}>
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  const prev = STEP_ORDER[STEP_ORDER.indexOf(step) - 1]
                  if (prev === 'name') setPreviewCollapsed(false)
                  changeStep(prev)
                }}
                style={secondaryBtnStyle}
              >
                Back
              </button>
            )}

            {step === 'name' && (
              <button type="button" onClick={goToRole} style={primaryBtnStyle(false)}>
                Next
              </button>
            )}

            {step === 'role' && (
              <button
                type="button"
                onClick={goToPhoto}
                disabled={!relationToTomo || roleSpinning}
                style={primaryBtnStyle(!relationToTomo || roleSpinning)}
              >
                Next
              </button>
            )}

            {step === 'photo' && (
              <button type="button" onClick={goToSubmit} style={primaryBtnStyle(false)}>
                Next
              </button>
            )}

            {step === 'submit' && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                style={primaryBtnStyle(submitting)}
              >
                {submitting ? 'Issuing…' : 'Issue my ID'}
              </button>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}

const promptStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 16,
  color: 'var(--color-ink)',
  margin: 0,
}

const inputStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-body)',
  color: 'var(--color-ink)',
  background: 'transparent',
  border: '1.5px solid var(--color-border)',
  padding: '10px 12px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

function primaryBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    flex: 1,
    background: disabled ? 'var(--color-ink-muted)' : 'var(--color-ink)',
    color: 'var(--color-tomo-yellow)',
    border: '1.5px solid var(--color-border)',
    padding: '10px 16px',
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    fontWeight: 'var(--weight-bold)',
    cursor: disabled ? 'not-allowed' : 'pointer',
  }
}

const secondaryBtnStyle: React.CSSProperties = {
  background: 'transparent',
  color: 'var(--color-ink)',
  border: '1.5px solid var(--color-border)',
  padding: '10px 16px',
  fontFamily: 'var(--font-body)',
  fontSize: 14,
  fontWeight: 'var(--weight-bold)',
  cursor: 'pointer',
}
