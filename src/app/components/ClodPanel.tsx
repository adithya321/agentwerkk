import type { ClodUsage } from '@/types'
export default function ClodPanel({ usage }: { usage: ClodUsage }) {
  return (
    <div className="border border-blue-500 rounded p-4 mb-4">
      <h2 className="text-blue-400 font-bold text-sm mb-3 uppercase tracking-widest">⚡ CLōD Usage</h2>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Model</span>
          <span className="text-white font-mono">{usage.model}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Tokens used</span>
          <span className="text-white">{usage.totalTokens.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Cost via CLōD</span>
          <span className="text-green-400 font-bold">${usage.clodCost.toFixed(5)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Direct API cost</span>
          <span className="text-red-400 line-through">${usage.directCost.toFixed(5)}</span>
        </div>
        <div className="flex justify-between border-t border-gray-700 pt-2 mt-1">
          <span className="font-bold text-white">Saved</span>
          <span className="text-green-400 font-bold text-base">
            ${usage.savings.toFixed(5)} ({usage.savingsPct}%)
          </span>
        </div>
      </div>
    </div>
  )
}
