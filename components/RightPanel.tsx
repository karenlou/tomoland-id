'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import IdSpotlight from './IdSpotlight'
import CreatePanel from './CreatePanel'
import RetroPrinter from './RetroPrinter'
import PrintAd from './PrintAd'
import type { Citizen } from '@/types'

export type RightPanelMode = 'view' | 'create' | 'print'

interface RightPanelProps {
  mode: RightPanelMode
  citizen: Citizen | null
  printingCitizen: Citizen | null
  myCitizenId: string | null
  onGetId: () => void
  onViewMyId: () => void
  onReissue: () => void
  onDelete: () => void
  onCancelCreate: () => void
  onIssue: (citizen: Citizen) => void
  onPrintComplete: () => void
}

export default function RightPanel({
  mode,
  citizen,
  printingCitizen,
  myCitizenId,
  onGetId,
  onViewMyId,
  onReissue,
  onDelete,
  onCancelCreate,
  onIssue,
  onPrintComplete,
}: RightPanelProps) {
  const [visibleMode, setVisibleMode] = useState<RightPanelMode>(mode)
  const [phase, setPhase] = useState<'in' | 'out'>('in')
  const [revealFooter, setRevealFooter] = useState(false)
  const skipNextTransition = useRef(false)

  useEffect(() => {
    if (mode === visibleMode) return

    if (skipNextTransition.current) {
      skipNextTransition.current = false
      setVisibleMode(mode)
      setPhase('in')
      return
    }

    setPhase('out')
    const t = setTimeout(() => {
      setVisibleMode(mode)
      setPhase('in')
    }, 220)
    return () => clearTimeout(t)
  }, [mode, visibleMode])

  const handlePrintComplete = useCallback(() => {
    skipNextTransition.current = true
    setRevealFooter(true)
    onPrintComplete()
  }, [onPrintComplete])

  useEffect(() => {
    if (visibleMode !== 'view') {
      setRevealFooter(false)
    }
  }, [visibleMode])

  let content: React.ReactNode
  if (visibleMode === 'print' && printingCitizen) {
    content = <RetroPrinter citizen={printingCitizen} onComplete={handlePrintComplete} />
  } else if (visibleMode === 'create') {
    content = <CreatePanel onCancel={onCancelCreate} onIssue={onIssue} />
  } else {
    content = (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          width: '100%',
        }}
      >
        <IdSpotlight
          citizen={citizen}
          onGetId={onGetId}
          onViewMyId={onViewMyId}
          onReissue={onReissue}
          onDelete={onDelete}
          myCitizenId={myCitizenId}
          revealFooter={revealFooter}
        />
        <PrintAd />
      </div>
    )
  }

  return (
    <div
      className={`right-panel-stage right-panel-${phase}`}
      style={{ width: '100%' }}
    >
      {content}
    </div>
  )
}
