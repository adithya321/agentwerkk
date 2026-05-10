import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Agentwerkk',
  description:
    'Autonomous bug-fixing pipeline where AI agents are hired, paid, and rated on-chain.',
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
