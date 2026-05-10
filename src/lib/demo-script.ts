import type { PipelineEvent } from '@/types'

export interface DemoEntry {
  delayMs: number
  event: PipelineEvent
}

export const DEMO_ISSUE_URL = 'https://github.com/acme-corp/payment-api/issues/42'

const DEMO_PR_URL = 'https://github.com/acme-corp/payment-api/pull/142'
const DEMO_TX_HASH = '0x4a9f2e8c1b3d7f6a0e5c2b9d4f1a8e3c7b0d5f2a9e6c3b0d7f4a1e8c5b2d9f6a'

export const DEMO_EVENTS: DemoEntry[] = [
  // Orchestrator
  { delayMs: 0,    event: { type: 'status', agent: 'orchestrator', status: 'running', message: 'Fetching issue #42…' } },
  { delayMs: 800,  event: { type: 'status', agent: 'orchestrator', status: 'done',    message: 'fix: null pointer in payment processor' } },

  // AllScale checkout
  { delayMs: 900,  event: { type: 'status', agent: 'allscale', status: 'running', message: 'Creating checkout session…' } },
  { delayMs: 1600, event: { type: 'status', agent: 'allscale', status: 'done',    message: 'https://checkout.allscale.io/cs_demo_x7f9' } },
  { delayMs: 1700, event: { type: 'sponsor', id: 'allscale', value: 0.10, sub: '0.10 USDC · base-sepolia' } },

  // Clustly sub-tasks
  { delayMs: 1800, event: { type: 'status', agent: 'clustly', status: 'running', message: 'Posting sub-tasks…' } },
  { delayMs: 2400, event: { type: 'status', agent: 'clustly', status: 'done',    message: '3 sub-tasks posted' } },
  { delayMs: 2500, event: { type: 'sponsor', id: 'clustly', value: 3, sub: '3 sub-tasks posted to marketplace · acceptance 100%' } },

  // Parallel: repo-scout + docs-scout
  { delayMs: 2600, event: { type: 'status', agent: 'repo-scout', status: 'running', message: 'Searching codebase…' } },
  { delayMs: 2600, event: { type: 'status', agent: 'docs-scout', status: 'running', message: 'Indexing docs…' } },

  // repo-scout log stream
  { delayMs: 2800, event: { type: 'log', agent: 'repo-scout', message: 'Extracted keywords: [payment, processor, null, pointer, exception]' } },
  { delayMs: 3200, event: { type: 'log', agent: 'repo-scout', message: 'Trying GitHub code search: "payment processor null pointer exception"' } },
  { delayMs: 3800, event: { type: 'log', agent: 'repo-scout', message: 'Code search returned 4 file(s)' } },
  { delayMs: 4000, event: { type: 'log', agent: 'repo-scout', message: '  → src/payments/processor.ts (2 841 chars)' } },
  { delayMs: 4100, event: { type: 'log', agent: 'repo-scout', message: '  → src/payments/gateway.ts (1 204 chars)' } },
  { delayMs: 4200, event: { type: 'log', agent: 'repo-scout', message: '  → src/lib/stripe.ts (3 109 chars)' } },
  { delayMs: 4300, event: { type: 'log', agent: 'repo-scout', message: '  → tests/payments/processor.test.ts (988 chars)' } },

  // docs-scout log stream (interleaved)
  { delayMs: 2900, event: { type: 'log', agent: 'docs-scout', message: 'Fetching Nia context for "payment processor null pointer"…' } },
  { delayMs: 3600, event: { type: 'log', agent: 'docs-scout', message: 'Nia returned 3 doc(s)' } },
  { delayMs: 3700, event: { type: 'log', agent: 'docs-scout', message: '  → Stripe Webhooks — handling null events' } },
  { delayMs: 3900, event: { type: 'log', agent: 'docs-scout', message: '  → PaymentProcessor interface — v2 migration guide' } },
  { delayMs: 4100, event: { type: 'log', agent: 'docs-scout', message: '  → Error handling best practices — processor lifecycle' } },

  // scouts done
  { delayMs: 4800, event: { type: 'status', agent: 'repo-scout', status: 'done', message: '4 files' } },
  { delayMs: 4900, event: { type: 'status', agent: 'docs-scout', status: 'done', message: '3 docs' } },
  { delayMs: 5000, event: { type: 'sponsor', id: 'nia', value: 3, sub: 'codebase index ready · context hydrated' } },

  // fix-agent
  { delayMs: 5100, event: { type: 'status', agent: 'fix-agent', status: 'running', message: 'Generating fix…' } },
  { delayMs: 5300, event: { type: 'log', agent: 'fix-agent', message: 'Building prompt — 4 repo file(s), 3 doc(s)' } },
  { delayMs: 5700, event: { type: 'log', agent: 'fix-agent', message: 'Prompt length: 6 842 chars — sending to CLōD' } },
  { delayMs: 6200, event: { type: 'log', agent: 'fix-agent', message: 'Waiting for CLōD inference (claude-sonnet-4-6)…' } },
  { delayMs: 7400, event: { type: 'log', agent: 'fix-agent', message: 'CLōD responded with 1 203 chars' } },
  { delayMs: 7800, event: { type: 'log', agent: 'fix-agent', message: 'Parsed fix: 1 file(s) — "fix: handle null payment processor reference"' } },

  // CLōD panel lights up
  { delayMs: 9000, event: { type: 'clod_usage', data: { model: 'claude-sonnet-4-6', totalTokens: 8247, clodCost: 0.00284, directCost: 0.01180, savings: 0.00896, savingsPct: 75.9 } } },

  // fix-agent done + greptile sponsor
  { delayMs: 9100, event: { type: 'status', agent: 'fix-agent', status: 'done', message: '1 file(s) changed' } },
  { delayMs: 9200, event: { type: 'sponsor', id: 'greptile', value: 1.2, sub: 'cross-repo review · 0 blockers' } },

  // github
  { delayMs: 9300,  event: { type: 'status', agent: 'github', status: 'running', message: 'Creating PR…' } },
  { delayMs: 9500,  event: { type: 'log', agent: 'github', message: 'Creating branch agentwerkk/fix-1715369842-x7q2p…' } },
  { delayMs: 9900,  event: { type: 'log', agent: 'github', message: 'Committing 1 file(s)…' } },
  { delayMs: 10500, event: { type: 'log', agent: 'github', message: 'Opening PR against main…' } },

  // PR created
  { delayMs: 11000, event: { type: 'pr_created', url: DEMO_PR_URL } },
  { delayMs: 11100, event: { type: 'status', agent: 'github', status: 'done', message: DEMO_PR_URL } },

  // reputation
  { delayMs: 11200, event: { type: 'status', agent: 'reputation', status: 'running', message: 'Writing to Base Sepolia…' } },
  { delayMs: 11500, event: { type: 'log', agent: 'reputation', message: 'Broadcasting tx to Base Sepolia (chain 84532)…' } },
  { delayMs: 12200, event: { type: 'log', agent: 'reputation', message: 'Tx submitted: 0x4a9f2e8c…9f6a' } },
  { delayMs: 13200, event: { type: 'log', agent: 'reputation', message: 'Confirmed in block 14 892 441 · 3 agents rated' } },

  // on-chain card lights up
  { delayMs: 14000, event: { type: 'reputation_updated', txHash: DEMO_TX_HASH, explorerUrl: `https://sepolia.basescan.org/tx/${DEMO_TX_HASH}` } },
  { delayMs: 14100, event: { type: 'status', agent: 'reputation', status: 'done', message: `https://sepolia.basescan.org/tx/${DEMO_TX_HASH}` } },
  { delayMs: 14200, event: { type: 'sponsor', id: 'bga', value: 3, sub: 'reputation published to public-goods registry' } },

  // done
  { delayMs: 14300, event: { type: 'done' } },
]
