'use client'
import { useState, useEffect, useCallback, Fragment } from 'react'

type BulletItem = { text: string; variant: 'check' | 'cross' }
type SponsorItem = { name: string; description: string }
type FlowNode = { emoji: string; label: string }

type SlideData = {
  tag: string
  headline: string
  timing: string
  accent: string
  sub?: string
  flow?: FlowNode[]
  bullets?: BulletItem[]
  sponsors?: SponsorItem[]
  live?: true
}

const SLIDES: SlideData[] = [
  {
    tag: 'Hook / Title',
    headline: 'Agentwerkk',
    timing: '0:00 – 0:30',
    accent: '#a78bfa',
    sub: 'AI agents that fix bugs. Hired, paid & rated on-chain.',
    flow: [
      { emoji: '📝', label: 'GitHub Issue' },
      { emoji: '🤖', label: 'AI Agents' },
      { emoji: '🚀', label: 'Merged PR' },
    ],
  },
  {
    tag: 'Problem',
    headline: 'Bug bounties are broken',
    timing: '0:30 – 1:00',
    accent: '#f87171',
    bullets: [
      { text: 'Days of back-and-forth to assign & scope work', variant: 'cross' },
      { text: 'Payments are manual, slow, trust-dependent', variant: 'cross' },
      { text: 'No accountability — agents vanish, quality varies', variant: 'cross' },
      { text: 'No reusable reputation across projects', variant: 'cross' },
    ],
  },
  {
    tag: 'How it works',
    headline: 'Paste URL. Get a PR.',
    timing: '1:00 – 1:30',
    accent: '#34d399',
    sub: '6 agents, fully autonomous, end-to-end in minutes.',
    flow: [
      { emoji: '🎯', label: 'Orchestrate' },
      { emoji: '🔍', label: 'Scout' },
      { emoji: '📚', label: 'Docs' },
      { emoji: '🔧', label: 'Fix' },
      { emoji: '🐙', label: 'PR' },
      { emoji: '⭐', label: 'Rate' },
    ],
  },
  {
    tag: 'Live Demo',
    headline: 'Watch it run',
    timing: '1:30 – 3:30',
    accent: '#60a5fa',
    sub: 'Paste a real GitHub issue. Watch the pipeline execute live.',
    live: true,
  },
  {
    tag: 'Built on',
    headline: '6 sponsor integrations, real usage',
    timing: '3:30 – 4:15',
    accent: '#fbbf24',
    sponsors: [
      { name: 'CLōD',       description: 'All LLM inference + cost savings' },
      { name: 'AllScale',   description: 'USDC bounty checkout' },
      { name: 'Base / BGA', description: 'On-chain reputation' },
      { name: 'Clustly',    description: 'Sub-task marketplace' },
      { name: 'Nia',        description: 'Docs context via MCP' },
      { name: 'Greptile',   description: 'PR review on every commit' },
    ],
  },
  {
    tag: 'What we built',
    headline: 'End-to-end in one weekend',
    timing: '4:15 – 5:00',
    accent: '#a78bfa',
    bullets: [
      { text: 'Real GitHub PRs opened by AI agents',      variant: 'check' },
      { text: 'Stablecoin payments via AllScale',         variant: 'check' },
      { text: 'On-chain reputation on Base Sepolia',      variant: 'check' },
      { text: 'Cost savings visible in the UI via CLōD', variant: 'check' },
    ],
  },
]

export default function SlidesPage() {
  const [current, setCurrent] = useState(0)

  const prev = useCallback(() => setCurrent(c => Math.max(0, c - 1)), [])
  const next = useCallback(() => setCurrent(c => Math.min(SLIDES.length - 1, c + 1)), [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [next, prev])

  const slide = SLIDES[current]

  return (
    <div
      onClick={next}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        userSelect: 'none',
        padding: '48px',
        position: 'relative',
      }}
    >
      {/* Slide counter — bottom right */}
      <div style={{
        position: 'fixed', bottom: '24px', right: '32px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '0.75rem', color: 'var(--ink-4)', letterSpacing: '0.08em',
      }}>
        {current + 1} / {SLIDES.length}
      </div>

      {/* Timing — bottom left */}
      <div style={{
        position: 'fixed', bottom: '24px', left: '32px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '0.75rem', color: 'var(--ink-4)', letterSpacing: '0.08em',
      }}>
        {slide.timing}
      </div>

      {/* Navigation hint — top right, first slide only */}
      {current === 0 && (
        <div style={{
          position: 'fixed', top: '24px', right: '32px',
          fontSize: '0.72rem', color: 'var(--ink-4)',
          fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em',
        }}>
          click · space · → to advance
        </div>
      )}

      <div style={{ maxWidth: '820px', width: '100%' }}>
        {/* Tag */}
        <div style={{
          fontSize: '0.7rem', fontWeight: 700,
          letterSpacing: '0.15em', textTransform: 'uppercase',
          color: 'var(--ink-4)', marginBottom: '16px',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          {slide.tag}
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
          fontWeight: 800, lineHeight: 1.1,
          color: slide.accent, marginBottom: '24px',
          fontFamily: 'JetBrains Mono, monospace', letterSpacing: '-0.02em',
        }}>
          {slide.headline}
        </h1>

        {/* Sub-headline */}
        {slide.sub && (
          <p style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.35rem)',
            color: 'var(--ink-2)', marginBottom: '32px',
            lineHeight: 1.5, fontFamily: 'Inter, sans-serif',
          }}>
            {slide.sub}
          </p>
        )}

        {/* Flow nodes */}
        {slide.flow && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {slide.flow.map((node, i) => (
              <Fragment key={node.label}>
                {i > 0 && (
                  <span style={{ color: 'var(--ink-4)', fontSize: '1.1rem' }}>→</span>
                )}
                <span style={{
                  background: 'var(--panel-2)',
                  border: '1px solid var(--line-2)',
                  borderRadius: '8px', padding: '8px 16px',
                  fontSize: '0.9rem', color: 'var(--ink-2)',
                  fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap',
                }}>
                  {node.emoji} {node.label}
                </span>
              </Fragment>
            ))}
          </div>
        )}

        {/* Bullets */}
        {slide.bullets && (
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {slide.bullets.map((b) => (
              <li key={b.text} style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                fontSize: 'clamp(0.95rem, 2vw, 1.15rem)',
                color: 'var(--ink-2)', fontFamily: 'Inter, sans-serif', lineHeight: 1.5,
              }}>
                <span style={{
                  color: b.variant === 'check' ? 'var(--green)' : 'var(--red)',
                  fontWeight: 700, flexShrink: 0, marginTop: '2px',
                }}>
                  {b.variant === 'check' ? '✓' : '✗'}
                </span>
                {b.text}
              </li>
            ))}
          </ul>
        )}

        {/* Sponsors grid */}
        {slide.sponsors && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px',
          }}>
            {slide.sponsors.map((s) => (
              <div key={s.name} style={{
                background: 'var(--panel-2)',
                border: '1px solid var(--line-2)',
                borderRadius: '10px', padding: '14px 16px',
              }}>
                <div style={{
                  fontWeight: 700, fontSize: '1rem',
                  color: 'var(--ink)', fontFamily: 'JetBrains Mono, monospace', marginBottom: '4px',
                }}>
                  {s.name}
                </div>
                <div style={{
                  fontSize: '0.82rem', color: 'var(--ink-3)',
                  fontFamily: 'Inter, sans-serif', lineHeight: 1.4,
                }}>
                  {s.description}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Live badge */}
        {slide.live && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            background: 'rgba(22,163,74,0.1)',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: '10px', padding: '12px 24px', marginTop: '16px',
            fontWeight: 700, fontSize: '1rem',
            color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em',
          }}>
            <span style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: 'var(--green)', display: 'inline-block',
              animation: 'livepulse 1.2s ease-in-out infinite',
            }} />
            LIVE
          </div>
        )}
      </div>

      <style>{`
        @keyframes livepulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
