interface Props {
  prUrl?: string
  reputationTx?: { txHash: string; explorerUrl: string }
}
export default function OutputPanel({ prUrl, reputationTx }: Props) {
  return (
    <div className="border border-green-800 rounded p-4 space-y-3">
      <h2 className="text-green-400 font-bold text-sm uppercase tracking-widest">✅ Output</h2>
      {prUrl && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Pull Request</p>
          <a
            href={prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline text-sm break-all"
          >
            {prUrl}
          </a>
        </div>
      )}
      {reputationTx && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Reputation Updated (Base Sepolia)</p>
          <a
            href={reputationTx.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 underline text-sm font-mono break-all"
          >
            {reputationTx.txHash.slice(0, 20)}...
          </a>
        </div>
      )}
    </div>
  )
}
