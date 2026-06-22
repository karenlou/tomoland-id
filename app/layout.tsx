import type { Metadata } from 'next'
import ClickSoundProvider from '@/components/ClickSoundProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tomosapiens of Tomoland',
  description: 'The official directory of Tomoland citizens.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <div className="paper-texture-overlay" aria-hidden />
        <ClickSoundProvider>{children}</ClickSoundProvider>
      </body>
    </html>
  )
}
