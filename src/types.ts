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
  | { type: 'clod_usage'; data: ClodUsage }
  | { type: 'pr_created'; url: string }
  | { type: 'reputation_updated'; txHash: string; explorerUrl: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

function requireEnvAddress(name: string): `0x${string}` {
  const val = process.env[name]
  if (!val) throw new Error(`Missing required env var: ${name}`)
  return val as `0x${string}`
}

export const AGENT_WALLETS = {
  repoScout: requireEnvAddress('REPO_SCOUT_WALLET'),
  docsScout: requireEnvAddress('DOCS_SCOUT_WALLET'),
  fixAgent: requireEnvAddress('FIX_AGENT_WALLET'),
}
