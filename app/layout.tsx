import type { Metadata } from 'next'
import ClickSoundProvider from '@/components/ClickSoundProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tomoland — Yellow Pages',
  description: 'The official directory of Tomoland citizens.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body style={{ height: '100vh', overflow: 'hidden' }}>
        <ClickSoundProvider>{children}</ClickSoundProvider>
      </body>
    </html>
  )
}
