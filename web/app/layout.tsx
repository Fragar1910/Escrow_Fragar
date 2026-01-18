import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '../lib/providers'

export const metadata: Metadata = {
  title: 'Escrow DApp',
  description: 'Decentralized escrow application for ERC20 token swaps',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
