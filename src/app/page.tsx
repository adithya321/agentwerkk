'use client'
import { useState, useRef, useCallback } from 'react'
import type { PipelineEvent, ClodUsage } from '@/types'
import BountyForm from './components/BountyForm'
import PipelineLog, { type AgentDef, type AgentStatus, type LogEntry } from './components/PipelineLog'
import ClodPanel from './components/ClodPanel'
import OutputPanel from './components/OutputPanel'
import SponsorStrip, { type SponsorState } from './components/SponsorStrip'

const AGENTS: AgentDef[] = [
  { id: 'orchestrator', emoji: '🎯', name: 'Orchestrator', role: 'plan + delegate' },
  { id: 'repo-scout', emoji: '🔍', name: 'Repo Scout', role: 'index codebase' },
  { id: 'docs-scout', emoji: '📚', name: 'Docs Scout', role: 'fetch context' },
  { id: 'fix-agent', emoji: '🔧', name: 'Fix Agent', role: 'author patch' },
  { id: 'github', emoji: '🐙', name: 'GitHub', role: 'open PR' },
  { id: 'reputation', emoji: '⭐', name: 'Reputation', role: 'on-chain rating' },
]

const INITIAL_STATUSES = (): Record<string, AgentStatus> =>
  AGENTS.reduce(
    (acc, a) => {
      acc[a.id] = { status: 'queued' }
      return acc
    },
    {} as Record<string, AgentStatus>
  )

export default function Home() {
  const [statuses, setStatuses] = useState<Record<string, AgentStatus>>(INITIAL_STATUSES)
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [clod, setClod] = useState<ClodUsage | null>(null)
  const [pr, setPr] = useState<{ url: string; repo?: string; num?: number } | null>(null)
  const [tx, setTx] = useState<{ hash: string; explorerUrl: string } | null>(null)
  const [sponsors, setSponsors] = useState<Record<string, SponsorState>>({})
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const t0Ref = useRef<number>(0)

  const handleSubmit = useCallback(async (issueUrl: string, bountyUsdc: number) => {
    setStatuses(INITIAL_STATUSES())
    setLogEntries([])
    setClod(null)
    setPr(null)
    setTx(null)
    setSponsors({})
    setRunning(true)
    setDone(false)
    t0Ref.current = Date.now()

    const response = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issueUrl, bountyUsdc }),
    })

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    const consumeSseLine = (line: string) => {
      if (!line.startsWith('data: ')) return
      try {
        const event = JSON.parse(line.slice(6)) as PipelineEvent
        const ts = Date.now() - t0Ref.current

        if (event.type === 'status') {
          setStatuses((s) => ({
            ...s,
            [event.agent]: { status: event.status, message: event.message, ts },
          }))
          setLogEntries((prev) => [
            ...prev,
            {
              ts,
              agent: event.agent,
              message: `→ ${event.status}${event.message ? ' · ' + event.message : ''}`,
              level: event.status === 'error' ? 'error' : 'info',
            },
          ])
        } else if (event.type === 'log') {
          setLogEntries((prev) => [
            ...prev,
            { ts, agent: event.agent, message: event.message, level: event.level },
          ])
        } else if (event.type === 'clod_usage') {
          setClod(event.data)
        } else if (event.type === 'pr_created') {
          const m = event.url.match(/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/)
          setPr({ url: event.url, repo: m?.[1], num: m ? parseInt(m[2], 10) : undefined })
        } else if (event.type === 'reputation_updated') {
          setTx({ hash: event.txHash, explorerUrl: event.explorerUrl })
        } else if (event.type === 'sponsor') {
          setSponsors((s) => ({ ...s, [event.id]: { value: event.value, sub: event.sub } }))
        } else if (event.type === 'done' || event.type === 'error') {
          setRunning(false)
          setDone(true)
        }
      } catch {
        // ignore malformed frames / partial JSON
      }
    }

    while (true) {
      const { done: streamDone, value } = await reader.read()
      if (streamDone) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        consumeSseLine(line)
      }
    }
    buffer += decoder.decode()
    for (const line of buffer.split('\n')) {
      consumeSseLine(line)
    }
    setRunning(false)
  }, [])

  const completedCount = AGENTS.filter((a) => statuses[a.id]?.status === 'done').length
  const elapsed = logEntries.length ? logEntries[logEntries.length - 1].ts : 0
  const pillLabel = running ? 'pipeline active' : done ? 'pipeline complete' : 'idle'

  return (
    <div className="app">
      {/* Topbar */}
      <div className="topbar">
        <div className="brand">
          <span className="dot"></span>
          agentwerkk<span style={{ color: 'var(--ink-4)' }}>/</span>
          <span style={{ color: 'var(--ink-2)' }}>console</span>
        </div>
        <div className="crumbs">
          <span>org</span><span className="sep">/</span>
          <span>acme</span><span className="sep">/</span>
          <span className="active">dashboard</span>
        </div>
        <div className="right">
          <span className="pill">
            <span className="ledge"></span> {pillLabel}
          </span>
          <span>base-sepolia</span>
          <span className="wallet">0x7c…F1aE</span>
        </div>
      </div>

      {/* Hero */}
      <div className="hero">
        <div>
          <h1>
            Agentwerkk<span className="accent">.</span>
            <span className="cursor"></span>
          </h1>
          <p>Autonomous bug bounty — agents earn, agents build, reputation on-chain.</p>
        </div>
        <div className="meta">
          <div>
            base-sepolia · chain id <b>84532</b>
          </div>
        </div>
      </div>

      <div className="grid-layout">
        <div className="col">
          <BountyForm onSubmit={handleSubmit} disabled={running} />
          <PipelineLog
            agents={AGENTS}
            statuses={statuses}
            logEntries={logEntries}
            running={running}
            completedCount={completedCount}
            elapsed={elapsed}
          />
        </div>
        <div className="col">
          <ClodPanel usage={clod} running={running} done={done} />
          <SponsorStrip sponsors={sponsors} />
          <OutputPanel pr={pr} tx={tx} />
        </div>
      </div>

      <div className="footstrip">
        <div>agentwerkk · hackathon build</div>
        <div className="links">
          <span>powered by CLōD</span>
        </div>
      </div>
    </div>
  )
}
