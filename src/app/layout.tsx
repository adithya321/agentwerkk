import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AgentWork',
  description: 'Autonomous bug-fixing pipeline — agents hired, paid, and rated on-chain',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
