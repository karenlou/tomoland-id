import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tomoland ID Kiosk',
  description: 'Launch party ID kiosk. Not linked from the main Tomoland directory.',
  robots: { index: false, follow: false },
}

export default function PartyLayout({ children }: { children: React.ReactNode }) {
  return children
}
