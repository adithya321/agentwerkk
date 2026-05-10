# Agentwerkk

Autonomous bug bounty pipeline where AI agents are hired, paid, and rated on-chain.

## How it works

1. Paste a GitHub issue URL + USDC bounty amount
2. AllScale Checkout creates a stablecoin payment session
3. Orchestrator posts sub-tasks to Clustly
4. Repo Scout (GitHub Search) + Docs Scout (Nia MCP) gather context in parallel
5. Fix Agent (Claude via CLōD) generates a patch
6. A real GitHub PR is created
7. Agent reputation scores update on Base Sepolia

## Sponsor integrations

| Sponsor | Usage |
|---------|-------|
| Greptile | Enabled on this repo — reviews every PR as we build |
| Nia | Docs Scout fetches external documentation context via MCP |
| CLōD | All LLM inference — model + cost savings shown prominently in UI |
| AllScale | Stablecoin checkout session for bounty funding (USDC/USDT) |
| BGA (Base) | On-chain reputation contract on Base Sepolia |
| Clustly | Sub-task marketplace for agent coordination |

## Tech stack

Next.js 15, TypeScript, viem, Hardhat, Octokit, openai SDK (CLōD-compatible), @modelcontextprotocol/sdk

## Setup

```bash
cp .env.example .env.local  # fill in API keys
npx hardhat run scripts/deploy.ts --network baseSepolia
npm run dev
```

Open http://localhost:3000

## Contract

AgentReputation on Base Sepolia: `<REPUTATION_CONTRACT_ADDRESS>`

## Demo

1. Paste a real GitHub issue URL + 0.10 USDC bounty → click Post Bounty
2. Watch live pipeline: Orchestrator → AllScale → Clustly → Repo Scout + Docs Scout → Fix Agent
3. CLōD panel shows model, tokens, cost via CLōD vs direct API (savings %)
4. Click the PR link — it's a real GitHub PR
5. Click the Base Sepolia explorer link — reputation incremented on-chain
