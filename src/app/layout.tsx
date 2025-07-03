import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TipTap Minimal Reproduction',
  description: 'A minimal Next.js app demonstrating TipTap editor functionality',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
