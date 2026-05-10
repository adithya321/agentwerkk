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
export default function PipelineLog({ events }: { events: PipelineEvent[] }) {
  const statusEvents = events.filter(
    (e): e is Extract<PipelineEvent, { type: 'status' }> => e.type === 'status'
  )
  return (
    <div className="border border-gray-800 rounded p-4 min-h-48">
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
  )
}
