import type { PipelineEvent } from '@/types'

const AGENT_LABELS: Record<string, string> = {
  orchestrator: '🎯 Orchestrator',
  allscale: '💳 AllScale',
  clustly: '🔗 Clustly',
  'repo-scout': '🔍 Repo Scout',
  'docs-scout': '📚 Docs Scout',
  'fix-agent': '🔧 Fix Agent',
  github: '🐙 GitHub',
  reputation: '⭐ Reputation',
}

const STATUS_COLORS: Record<string, string> = {
  queued: 'text-gray-500',
  running: 'text-yellow-400 animate-pulse',
  done: 'text-green-400',
  error: 'text-red-400',
}

const LOG_LEVEL_COLORS: Record<string, string> = {
  info: 'text-gray-400',
  warn: 'text-yellow-500',
  error: 'text-red-400',
}

const AGENT_TAG_COLORS: Record<string, string> = {
  orchestrator: 'text-purple-400',
  allscale: 'text-blue-400',
  clustly: 'text-cyan-400',
  'repo-scout': 'text-sky-400',
  'docs-scout': 'text-indigo-400',
  'fix-agent': 'text-orange-400',
  github: 'text-emerald-400',
  reputation: 'text-yellow-400',
}

export default function PipelineLog({ events }: { events: PipelineEvent[] }) {
  const statusEvents = events.filter(
    (e): e is Extract<PipelineEvent, { type: 'status' }> => e.type === 'status'
  )
  const logEvents = events.filter(
    (e): e is Extract<PipelineEvent, { type: 'log' }> => e.type === 'log'
  )

  return (
    <div className="border border-gray-800 rounded p-4 space-y-4 min-h-48">
      <div>
        <h2 className="text-xs text-gray-500 mb-3 uppercase tracking-widest">Pipeline</h2>
        {statusEvents.length === 0 && <p className="text-gray-600 text-sm">Waiting for run...</p>}
        <div className="space-y-1">
          {statusEvents.map((e, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="text-gray-600 w-6">{i + 1}.</span>
              <span className="text-gray-300 w-36 shrink-0">{AGENT_LABELS[e.agent] ?? e.agent}</span>
              <span className={STATUS_COLORS[e.status]}>{e.status}</span>
              {e.message && <span className="text-gray-500 text-xs truncate">{e.message}</span>}
            </div>
          ))}
        </div>
      </div>

      {logEvents.length > 0 && (
        <div>
          <h2 className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Logs</h2>
          <div className="bg-gray-950 border border-gray-800 rounded p-3 max-h-64 overflow-y-auto space-y-0.5">
            {logEvents.map((e, i) => (
              <div key={i} className="flex items-start gap-2 text-xs leading-5">
                <span className={`shrink-0 w-24 ${AGENT_TAG_COLORS[e.agent] ?? 'text-gray-400'}`}>
                  [{e.agent}]
                </span>
                <span className={LOG_LEVEL_COLORS[e.level ?? 'info']}>{e.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
