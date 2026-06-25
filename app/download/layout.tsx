import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tomoland ID Downloads',
  description: 'Bulk ID card export. Not linked from the main Tomoland directory.',
  robots: { index: false, follow: false },
}

export default function DownloadLayout({ children }: { children: React.ReactNode }) {
  return children
}
