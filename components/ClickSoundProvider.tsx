'use client'

import { useEffect } from 'react'
import { isClickSoundTarget, playClickSound } from '@/lib/clickSound'

export default function ClickSoundProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return
      if (!isClickSoundTarget(event.target as Element)) return
      playClickSound()
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  return children
}
