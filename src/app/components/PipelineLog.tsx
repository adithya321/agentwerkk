'use client'
import { useRef, useEffect, useMemo } from 'react'

export interface AgentDef {
  id: string
  emoji: string
  name: string
  role: string
}

export interface AgentStatus {
  status: 'queued' | 'running' | 'done' | 'error'
  message?: string
  ts?: number
}

export interface LogEntry {
  ts: number
  agent: string
  message: string
  level?: string
}

interface Props {
  agents: AgentDef[]
  statuses: Record<string, AgentStatus>
  logEntries: LogEntry[]
  running: boolean
  completedCount: number
  elapsed: number
}

export default function PipelineLog({ agents, statuses, logEntries, running, completedCount, elapsed }: Props) {
  const termRef = useRef<HTMLDivElement>(null)

  const dedupedLogs = useMemo(() => {
    const seen = new Set<string>();
    return logEntries.filter(log => {
      const key = `${log.agent}-${log.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [logEntries]);

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight
  }, [dedupedLogs.length])

  const runningCount = agents.filter((a) => statuses[a.id]?.status === 'running').length

  return (
    <>
      {/* Pipeline */}
      <div className={`panel${running ? ' running-pulse' : ''}`}>
        <div className="panel-head">
          <div className="ttl">
            <span className="ix">02</span> Agent Pipeline
          </div>
          <div className="meta mono-tab">
            {completedCount}/{agents.length} done · {(elapsed / 1000).toFixed(2)}s
          </div>
        </div>
        <div className="panel-body" style={{ paddingBottom: 0 }}>
          <div className="pipeline-list">
            {agents.map((a, i) => {
              const s = statuses[a.id] ?? { status: 'queued' as const }
              return (
                <div className="pl-row" key={a.id}>
                  <div className="pl-ix">{String(i + 1).padStart(2, '0')}</div>
                  <div className="pl-icon">{a.emoji}</div>
                  <div className="pl-name">
                    {a.name} <span className="role">· {a.role}</span>
                  </div>
                  <div className="pl-time">{s.ts != null ? (s.ts / 1000).toFixed(2) + 's' : '—'}</div>
                  <div className={`pl-status ${s.status}`}>
                    <span className={`dot ${s.status}`}></span> {s.status}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="pipeline-stats">
            <div className="stat green">
              <div className="k">success</div>
              <div className="v">{completedCount}</div>
            </div>
            <div className="stat">
              <div className="k">running</div>
              <div className="v">{runningCount}</div>
            </div>
            <div className="stat">
              <div className="k">elapsed</div>
              <div className="v">{(elapsed / 1000).toFixed(2)}s</div>
            </div>
            <div className="stat">
              <div className="k">retries</div>
              <div className="v">0</div>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal logs */}
      <div className="panel">
        <div className="panel-head">
          <div className="ttl">
            <span className="ix">03</span> Terminal Logs
          </div>
        </div>
        <div className="panel-body terminal" ref={termRef}>
          {dedupedLogs.map((e, i) => (
            <div key={i} className={`log-line ${e.level || ''}`}>
              <span className="ts">[{new Date(e.ts).toLocaleTimeString()}]</span>
              <span className="agent">{e.agent}:</span>
              {e.message}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
