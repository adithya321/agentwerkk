'use client'
import { useState } from 'react'
import BountyForm from './components/BountyForm'
import PipelineLog from './components/PipelineLog'
import ClodPanel from './components/ClodPanel'
import OutputPanel from './components/OutputPanel'
import type { PipelineEvent, ClodUsage } from '@/types'

export default function Home() {
  const [events, setEvents] = useState<PipelineEvent[]>([])
  const [running, setRunning] = useState(false)

  const handleSubmit = async (issueUrl: string, bountyUsdc: number) => {
    setEvents([])
    setRunning(true)
    const response = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issueUrl, bountyUsdc }),
    })
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.slice(6)) as PipelineEvent
            setEvents((prev) => [...prev, event])
            if (event.type === 'done' || event.type === 'error') setRunning(false)
          } catch {
            // ignore malformed frames
          }
        }
      }
    }
    buffer += decoder.decode()
    for (const line of buffer.split('\n')) {
      if (!line.startsWith('data: ')) continue
      try {
        const event = JSON.parse(line.slice(6)) as PipelineEvent
        setEvents((prev) => [...prev, event])
        if (event.type === 'done' || event.type === 'error') setRunning(false)
      } catch {
        // ignore malformed frames
      }
    }
    setRunning(false)
  }

  const clodEvent = events.find(
    (e): e is Extract<PipelineEvent, { type: 'clod_usage' }> => e.type === 'clod_usage'
  )
  const prEvent = events.find(
    (e): e is Extract<PipelineEvent, { type: 'pr_created' }> => e.type === 'pr_created'
  )
  const repEvent = events.find(
    (e): e is Extract<PipelineEvent, { type: 'reputation_updated' }> => e.type === 'reputation_updated'
  )

  return (
    <main className="min-h-screen bg-black text-white p-8 font-mono">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-green-400 mb-1">Agentwerkk</h1>
        <p className="text-gray-500 text-sm mb-8">
          Autonomous bug bounty — agents earn, agents build, reputation on-chain
        </p>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <BountyForm onSubmit={handleSubmit} disabled={running} />
            <PipelineLog events={events} />
          </div>
          <div>
            {clodEvent && <ClodPanel usage={clodEvent.data} />}
            {(prEvent || repEvent) && (
              <OutputPanel prUrl={prEvent?.url} reputationTx={repEvent} />
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
