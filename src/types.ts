export interface AgentContext {
  issueUrl: string
  owner: string
  repo: string
  issueNumber: number
  issueTitle: string
  issueBody: string
  bountyUsdc: number
}

export interface RepoContext {
  files: Array<{
    path: string
    content: string
  }>
}

export interface DocsContext {
  docs: Array<{
    source: string
    content: string
  }>
}

export interface FixOutput {
  files: Array<{
    path: string
    content: string
  }>
  explanation: string
  prTitle: string
  prBody: string
}

export interface ClodUsage {
  model: string
  totalTokens: number
  clodCost: number
  directCost: number
  savings: number
  savingsPct: number
}

export type PipelineEvent =
  | { type: 'status'; agent: string; status: 'queued' | 'running' | 'done' | 'error'; message?: string }
  | { type: 'log'; agent: string; message: string; level?: 'info' | 'warn' | 'error' }
  | { type: 'sponsor'; id: string; value: number; sub: string }
  | { type: 'clod_usage'; data: ClodUsage }
  | { type: 'allscale_checkout'; url: string }
  | { type: 'pr_created'; url: string }
  | { type: 'reputation_updated'; txHash: string; explorerUrl: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/

function requireEnvAddress(name: string): `0x${string}` {
  const val = process.env[name]?.trim()
  if (!val) throw new Error(`Missing required env var: ${name}`)
  if (!EVM_ADDRESS.test(val)) {
    const preview =
      val.length <= 14 ? JSON.stringify(val) : JSON.stringify(`${val.slice(0, 10)}…${val.slice(-4)}`)
    throw new Error(`${name} must be a 42-char hex EVM address (0x + 40 hex digits); got ${preview}`)
  }
  return val as `0x${string}`
}

export function getAgentWallets() {
  return {
    repoScout: requireEnvAddress('REPO_SCOUT_WALLET'),
    docsScout: requireEnvAddress('DOCS_SCOUT_WALLET'),
    fixAgent: requireEnvAddress('FIX_AGENT_WALLET'),
  }
}
