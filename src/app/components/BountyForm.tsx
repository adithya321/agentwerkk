'use client'
interface Props {
  onSubmit: (issueUrl: string, bountyUsdc: number) => void
  disabled: boolean
}
export default function BountyForm({ onSubmit, disabled }: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        onSubmit(fd.get('issueUrl') as string, parseFloat(fd.get('bounty') as string))
      }}
      className="space-y-3 mb-6"
    >
      <div>
        <label className="block text-xs text-gray-400 mb-1">GitHub Issue URL</label>
        <input
          name="issueUrl"
          type="url"
          placeholder="https://github.com/owner/repo/issues/123"
          required
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-green-500 outline-none"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Bounty (USDC)</label>
        <input
          name="bounty"
          type="number"
          step="0.01"
          min="0.01"
          defaultValue="0.10"
          required
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-green-500 outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={disabled}
        className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 text-black font-bold py-2 rounded text-sm transition-colors"
      >
        {disabled ? 'Running...' : '▶ Post Bounty + Run Agents'}
      </button>
    </form>
  )
}
