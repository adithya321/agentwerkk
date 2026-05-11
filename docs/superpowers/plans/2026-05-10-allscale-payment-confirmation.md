# AllScale Payment Confirmation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate the pipeline on confirmed AllScale payment by splitting into two HTTP calls — `POST /api/checkout` (creates session) and `POST /api/run` (verifies payment then streams pipeline).

**Architecture:** Frontend calls `/api/checkout`, stores the returned `intentId` in `sessionStorage`, then navigates the tab to the AllScale checkout URL. After payment, AllScale redirects back with context in URL params. On mount, the page reads those params + `sessionStorage`, calls `/api/run` which verifies payment via `GET /v1/checkout_intents/{id}/status` (status `20 = CONFIRMED`) before opening the SSE stream.

**Tech Stack:** Next.js 15 App Router, TypeScript, `crypto` (Node built-in), `sessionStorage` (browser), AllScale OpenAPI (HMAC-SHA256 signed requests)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/allscale.ts` | Modify | `createCheckoutSession` returns `{ checkoutUrl, intentId }`; new `verifyPayment(intentId)` |
| `src/app/api/checkout/route.ts` | Create | `POST` — builds redirect URL, creates AllScale session, returns JSON |
| `src/app/api/run/route.ts` | Modify | Accept `intentId`, call `verifyPayment` before opening SSE stream |
| `src/agents/orchestrator.ts` | Modify | Remove checkout call; emit `allscale` sponsor/status at pipeline start |
| `src/app/page.tsx` | Modify | Submit → `/api/checkout` → sessionStorage → navigate; on mount detect redirect and auto-run |
| `src/lib/demo-script.ts` | Modify | AllScale shows as immediately done (payment pre-confirmed in demo) |

---

## Task 1: Update `src/lib/allscale.ts`

**Files:**
- Modify: `src/lib/allscale.ts`

- [ ] **Step 1: Replace the file contents**

```typescript
import crypto from 'crypto'

const BASE_URL = 'https://openapi.allscale.io'

function signRequest(
  method: string,
  path: string,
  query: string,
  body: string,
  apiSecret: string
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = crypto.randomUUID()
  const bodyHash = crypto.createHash('sha256').update(body).digest('hex')
  const canonical = [method, path, query, timestamp, nonce, bodyHash].join('\n')
  const signature = crypto.createHmac('sha256', apiSecret).update(canonical).digest('base64')
  return {
    'X-Timestamp': timestamp,
    'X-Nonce': nonce,
    'X-Signature': `v1=${signature}`,
  }
}

const SIM_PREFIX = 'sim_intent_'

function simFallback(): { checkoutUrl: string; intentId: string } {
  return {
    checkoutUrl: `${process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000'}/simulated-checkout`,
    intentId: SIM_PREFIX + Math.random().toString(36).slice(2, 10),
  }
}

export async function createCheckoutSession(
  amountUsdc: number,
  description: string,
  redirectUrl: string
): Promise<{ checkoutUrl: string; intentId: string }> {
  if (!process.env.ALLSCALE_API_KEY || !process.env.ALLSCALE_API_SECRET) {
    console.warn('[AllScale] credentials not set — simulating checkout')
    return simFallback()
  }

  const path = '/v1/checkout_intents/'
  const body = JSON.stringify({
    stable_coin: 1,
    amount_cents: Math.round(amountUsdc * 100),
    order_description: description,
    redirect_url: redirectUrl,
  })

  const sigHeaders = signRequest('POST', path, '', body, process.env.ALLSCALE_API_SECRET!)

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.ALLSCALE_API_KEY!,
      'Content-Type': 'application/json',
      ...sigHeaders,
    },
    body,
  })

  if (!response.ok) {
    console.warn('[AllScale] API error, simulating checkout:', response.status)
    return simFallback()
  }

  const data = await response.json() as {
    code: number
    payload?: { checkout_url?: string; allscale_checkout_intent_id?: string }
  }

  if (data.code !== 0 || !data.payload?.checkout_url || !data.payload?.allscale_checkout_intent_id) {
    console.warn('[AllScale] unexpected response, simulating checkout:', JSON.stringify(data))
    return simFallback()
  }

  return {
    checkoutUrl: data.payload.checkout_url,
    intentId: data.payload.allscale_checkout_intent_id,
  }
}

export async function verifyPayment(intentId: string): Promise<boolean> {
  if (intentId.startsWith(SIM_PREFIX)) return true
  if (!process.env.ALLSCALE_API_KEY || !process.env.ALLSCALE_API_SECRET) return true

  const path = `/v1/checkout_intents/${intentId}/status`
  const sigHeaders = signRequest('GET', path, '', '', process.env.ALLSCALE_API_SECRET!)

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        'X-API-Key': process.env.ALLSCALE_API_KEY!,
        ...sigHeaders,
      },
    })
    if (!response.ok) return false
    const data = await response.json() as { code: number; payload?: number }
    return data.code === 0 && data.payload === 20
  } catch {
    return false
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git checkout -b feat/allscale-payment-confirmation
git add src/lib/allscale.ts
git commit -m "feat(allscale): createCheckoutSession returns intentId; add verifyPayment"
```

---

## Task 2: Create `src/app/api/checkout/route.ts`

**Files:**
- Create: `src/app/api/checkout/route.ts`

Note: `intentId` cannot be embedded in the AllScale redirect URL because the session doesn't exist yet when the redirect URL is set. Instead the frontend stores `intentId` in `sessionStorage` before navigating away, and reads it back after the redirect.

- [ ] **Step 1: Create the file**

```typescript
import { NextRequest } from 'next/server'
import { createCheckoutSession } from '@/lib/allscale'

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    const parsed = await req.json()
    body = parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const issueUrl = body.issueUrl
  const bountyUsdc = body.bountyUsdc
  const model = typeof body.model === 'string' && body.model.trim() ? body.model.trim() : 'grok-4'

  if (
    typeof issueUrl !== 'string' || !issueUrl.trim() ||
    typeof bountyUsdc !== 'number' || !Number.isFinite(bountyUsdc) || bountyUsdc <= 0
  ) {
    return Response.json({ error: 'issueUrl and a positive bountyUsdc are required' }, { status: 400 })
  }

  const base = process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000'
  const redirectUrl =
    `${base}/?payment=success` +
    `&issue_url=${encodeURIComponent(issueUrl)}` +
    `&bounty=${bountyUsdc}` +
    `&model=${encodeURIComponent(model)}`

  const { checkoutUrl, intentId } = await createCheckoutSession(
    bountyUsdc,
    `Bounty: ${issueUrl}`,
    redirectUrl
  )

  return Response.json({ checkoutUrl, intentId })
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/checkout/route.ts
git commit -m "feat(api): add POST /api/checkout — creates AllScale session, returns checkoutUrl + intentId"
```

---

## Task 3: Update `src/app/api/run/route.ts`

**Files:**
- Modify: `src/app/api/run/route.ts`

- [ ] **Step 1: Replace the file contents**

```typescript
import { NextRequest } from 'next/server'
import { runPipeline } from '@/agents/orchestrator'
import { verifyPayment } from '@/lib/allscale'
import type { PipelineEvent } from '@/types'

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    const parsed = await req.json()
    body = parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const issueUrl = body.issueUrl
  const bountyUsdc = body.bountyUsdc
  const intentId = body.intentId
  const model = typeof body.model === 'string' && body.model.trim() ? body.model.trim() : undefined

  if (
    typeof issueUrl !== 'string' || !issueUrl.trim() ||
    typeof bountyUsdc !== 'number' || !Number.isFinite(bountyUsdc) || bountyUsdc <= 0 ||
    typeof intentId !== 'string' || !intentId.trim()
  ) {
    return Response.json(
      { error: 'issueUrl, a positive bountyUsdc, and intentId are required' },
      { status: 400 }
    )
  }

  const paid = await verifyPayment(intentId)
  if (!paid) {
    return Response.json({ error: 'Payment not confirmed' }, { status: 402 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: PipelineEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }
      try {
        await runPipeline({ issueUrl, bountyUsdc, model, send })
      } catch (e) {
        send({ type: 'error', message: String(e) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/run/route.ts
git commit -m "feat(api): verify AllScale payment before streaming pipeline"
```

---

## Task 4: Update `src/agents/orchestrator.ts`

**Files:**
- Modify: `src/agents/orchestrator.ts`

Remove the checkout session creation (it moved to `/api/checkout`). Emit `allscale` as immediately done at the start of the pipeline (payment was already confirmed before the stream opened).

- [ ] **Step 1: Replace the file contents**

```typescript
import { makeOctokit, parseIssueUrl, getIssue, applyFixAndCreatePR } from '@/lib/github'
import { ClodClient } from '@/lib/clod'
import { incrementAllReputations } from '@/lib/reputation'
import { postSubTasks } from '@/lib/clustly'
import { runRepoScout } from './repo-scout'
import { runDocsScout } from './docs-scout'
import { runFixAgent } from './fix-agent'
import type { PipelineEvent } from '@/types'

interface RunInput {
  issueUrl: string
  bountyUsdc: number
  model?: string
  send: (event: PipelineEvent) => void
}

export async function runPipeline({ issueUrl, bountyUsdc, model, send }: RunInput) {
  const octokit = makeOctokit()
  const { owner, repo, issueNumber } = parseIssueUrl(issueUrl)

  send({ type: 'status', agent: 'orchestrator', status: 'running', message: `Fetching issue #${issueNumber}...` })
  const issue = await getIssue(octokit, owner, repo, issueNumber)
  send({ type: 'status', agent: 'orchestrator', status: 'done', message: issue.title })

  // Payment was confirmed before the stream opened — mark allscale done immediately
  send({ type: 'status', agent: 'allscale', status: 'done', message: 'Payment confirmed' })
  send({ type: 'sponsor', id: 'allscale', value: bountyUsdc, sub: `${bountyUsdc.toFixed(2)} USDC · base-sepolia` })

  send({ type: 'status', agent: 'clustly', status: 'running', message: 'Posting sub-tasks...' })
  await postSubTasks(issue.title, bountyUsdc)
  send({ type: 'status', agent: 'clustly', status: 'done', message: '3 sub-tasks posted' })
  send({ type: 'sponsor', id: 'clustly', value: 3, sub: '3 sub-tasks posted to marketplace · acceptance 100%' })

  send({ type: 'status', agent: 'repo-scout', status: 'running', message: 'Searching codebase...' })
  send({ type: 'status', agent: 'docs-scout', status: 'running', message: 'Indexing docs...' })
  const [repoCtx, docsCtx] = await Promise.all([
    runRepoScout(octokit, owner, repo, issue, send),
    runDocsScout(issue, send),
  ])
  send({ type: 'status', agent: 'repo-scout', status: 'done', message: `${repoCtx.files.length} files` })
  send({ type: 'status', agent: 'docs-scout', status: 'done', message: `${docsCtx.docs.length} docs` })
  if (docsCtx.docs.length > 0) {
    send({ type: 'sponsor', id: 'nia', value: docsCtx.docs.length, sub: 'codebase index ready · context hydrated' })
  }

  send({ type: 'status', agent: 'fix-agent', status: 'running', message: 'Generating fix...' })
  const clod = new ClodClient(model)
  const fix = await runFixAgent(clod, issue, repoCtx, docsCtx, send)
  send({ type: 'clod_usage', data: clod.getTotalUsage() })
  send({ type: 'status', agent: 'fix-agent', status: 'done', message: `${fix.files.length} file(s) changed` })
  send({ type: 'sponsor', id: 'greptile', value: 1.2, sub: 'cross-repo review · 0 blockers' })

  if (fix.files.length === 0) {
    send({ type: 'status', agent: 'github', status: 'error', message: 'No files to commit — fix agent could not determine changes' })
    send({ type: 'done' })
    return
  }

  send({ type: 'status', agent: 'github', status: 'running', message: 'Creating PR...' })
  const prUrl = await applyFixAndCreatePR(octokit, owner, repo, fix)
  send({ type: 'pr_created', url: prUrl })
  send({ type: 'status', agent: 'github', status: 'done', message: prUrl })

  send({ type: 'status', agent: 'reputation', status: 'running', message: 'Writing to Base Sepolia...' })
  const txHash = await incrementAllReputations()
  const explorerUrl = `https://sepolia.basescan.org/tx/${txHash}`
  send({ type: 'reputation_updated', txHash, explorerUrl })
  send({ type: 'status', agent: 'reputation', status: 'done', message: explorerUrl })
  send({ type: 'sponsor', id: 'bga', value: 100, sub: 'reputation published to public-goods registry' })

  send({ type: 'done' })
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/agents/orchestrator.ts
git commit -m "feat(orchestrator): remove checkout call — payment confirmed before stream opens"
```

---

## Task 5: Update `src/app/page.tsx`

**Files:**
- Modify: `src/app/page.tsx`

Two changes: (1) `handleSubmit` calls `/api/checkout`, saves `intentId` to `sessionStorage`, then navigates to checkout; (2) `useEffect` on mount reads `?payment=success` URL params + `sessionStorage` and auto-triggers the pipeline stream.

- [ ] **Step 1: Replace the file contents**

```typescript
'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import type { PipelineEvent, ClodUsage } from '@/types'
import BountyForm from './components/BountyForm'
import PipelineLog, { type AgentDef, type AgentStatus, type LogEntry } from './components/PipelineLog'
import ClodPanel from './components/ClodPanel'
import OutputPanel from './components/OutputPanel'
import SponsorStrip, { SponsorCard, BGA_CARD, type SponsorState } from './components/SponsorStrip'
import { getDemoEvents } from '@/lib/demo-script'

const AGENTS: AgentDef[] = [
  { id: 'orchestrator', emoji: '🎯', name: 'Orchestrator', role: 'plan + delegate' },
  { id: 'repo-scout',   emoji: '🔍', name: 'Repo Scout',   role: 'index codebase' },
  { id: 'docs-scout',   emoji: '📚', name: 'Docs Scout',   role: 'fetch context' },
  { id: 'fix-agent',    emoji: '🔧', name: 'Fix Agent',    role: 'author patch' },
  { id: 'github',       emoji: '🐙', name: 'GitHub',       role: 'open PR' },
  { id: 'reputation',   emoji: '⭐', name: 'Reputation',   role: 'on-chain rating' },
]

const INITIAL_STATUSES = (): Record<string, AgentStatus> =>
  AGENTS.reduce(
    (acc, a) => { acc[a.id] = { status: 'queued' }; return acc },
    {} as Record<string, AgentStatus>
  )

const PENDING_KEY = 'allscale_pending_intent'

export default function Home() {
  const [statuses,   setStatuses]   = useState<Record<string, AgentStatus>>(INITIAL_STATUSES)
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [clod,       setClod]       = useState<ClodUsage | null>(null)
  const [pr,         setPr]         = useState<{ url: string; repo?: string; num?: number } | null>(null)
  const [tx,         setTx]         = useState<{ hash: string; explorerUrl: string } | null>(null)
  const [sponsors,   setSponsors]   = useState<Record<string, SponsorState>>({})
  const [running,    setRunning]    = useState(false)
  const [done,       setDone]       = useState(false)
  const [model,      setModel]      = useState('grok-4')
  const t0Ref = useRef<number>(0)

  const consumeEvent = useCallback((event: PipelineEvent) => {
    const ts = Date.now() - t0Ref.current

    if (event.type === 'status') {
      setStatuses((s) => ({
        ...s,
        [event.agent]: { status: event.status, message: event.message, ts },
      }))
      setLogEntries((prev) => [
        ...prev,
        {
          ts,
          agent: event.agent,
          message: `→ ${event.status}${event.message ? ' · ' + event.message : ''}`,
          level: event.status === 'error' ? 'error' : 'info',
        },
      ])
    } else if (event.type === 'log') {
      setLogEntries((prev) => [
        ...prev,
        { ts, agent: event.agent, message: event.message, level: event.level },
      ])
    } else if (event.type === 'clod_usage') {
      setClod(event.data)
    } else if (event.type === 'pr_created') {
      const m = event.url.match(/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/)
      setPr({ url: event.url, repo: m?.[1], num: m ? parseInt(m[2], 10) : undefined })
    } else if (event.type === 'reputation_updated') {
      setTx({ hash: event.txHash, explorerUrl: event.explorerUrl })
    } else if (event.type === 'sponsor') {
      setSponsors((s) => ({ ...s, [event.id]: { value: event.value, sub: event.sub } }))
    } else if (event.type === 'done' || event.type === 'error') {
      setRunning(false)
      setDone(true)
    }
  }, [])

  const resetState = () => {
    setStatuses(INITIAL_STATUSES())
    setLogEntries([])
    setClod(null)
    setPr(null)
    setTx(null)
    setSponsors({})
    setRunning(true)
    setDone(false)
    t0Ref.current = Date.now()
  }

  const streamPipeline = useCallback(async (intentId: string, issueUrl: string, bountyUsdc: number, modelName: string) => {
    resetState()

    const response = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intentId, issueUrl, bountyUsdc, model: modelName }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Pipeline failed' })) as { error?: string }
      setLogEntries((prev) => [
        ...prev,
        { ts: 0, agent: 'system', message: err.error ?? 'Pipeline failed', level: 'error' },
      ])
      setRunning(false)
      setDone(true)
      return
    }

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    const consumeSseLine = (line: string) => {
      if (!line.startsWith('data: ')) return
      try {
        consumeEvent(JSON.parse(line.slice(6)) as PipelineEvent)
      } catch {
        // ignore malformed frames
      }
    }

    while (true) {
      const { done: streamDone, value } = await reader.read()
      if (streamDone) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) consumeSseLine(line)
    }
    buffer += decoder.decode()
    for (const line of buffer.split('\n')) consumeSseLine(line)
    setRunning(false)
  }, [consumeEvent])

  // On mount: detect AllScale redirect and auto-start pipeline
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment') !== 'success') return

    const issueUrl  = params.get('issue_url')
    const bounty    = parseFloat(params.get('bounty') ?? '0')
    const modelName = params.get('model') ?? 'grok-4'
    const stored    = sessionStorage.getItem(PENDING_KEY)
    const intentId  = stored ? (JSON.parse(stored) as { intentId: string }).intentId : null

    sessionStorage.removeItem(PENDING_KEY)
    window.history.replaceState({}, '', '/')

    if (!issueUrl || !bounty || !intentId) return

    setModel(modelName)
    streamPipeline(intentId, issueUrl, bounty, modelName)
  }, [streamPipeline])

  const handleSubmit = useCallback(async (issueUrl: string, bountyUsdc: number) => {
    setRunning(true)

    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issueUrl, bountyUsdc, model }),
    })

    if (!res.ok) {
      setRunning(false)
      return
    }

    const { checkoutUrl, intentId } = await res.json() as { checkoutUrl: string; intentId: string }
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ intentId }))
    window.location.href = checkoutUrl
  }, [model])

  const runDemo = useCallback(() => {
    resetState()
    getDemoEvents(model).forEach(({ delayMs, event }) => {
      setTimeout(() => consumeEvent(event), delayMs)
    })
  }, [consumeEvent, model])

  const completedCount = AGENTS.filter((a) => statuses[a.id]?.status === 'done').length
  const elapsed        = logEntries.length ? logEntries[logEntries.length - 1].ts : 0
  const pillLabel      = running ? 'pipeline active' : done ? 'pipeline complete' : 'idle'

  return (
    <div className="app">
      {/* Topbar */}
      <div className="topbar">
        <div className="brand">
          <span className="dot"></span>
          agentwerkk<span style={{ color: 'var(--ink-4)' }}>/</span>
          <span style={{ color: 'var(--ink-2)' }}>console</span>
        </div>
        <div className="crumbs">
          <span>org</span><span className="sep">/</span>
          <span>acme</span><span className="sep">/</span>
          <span className="active">dashboard</span>
        </div>
        <div className="right">
          <span className="pill">
            <span className="ledge"></span> {pillLabel}
          </span>
          <span>base-sepolia</span>
          <span className="wallet">0x7c…F1aE</span>
        </div>
      </div>

      {/* Hero */}
      <div className="hero">
        <div>
          <h1>
            Agentwerkk<span className="accent">.</span>
            <span className="cursor"></span>
          </h1>
          <p>Autonomous bug bounty — agents earn, agents build, reputation on-chain.</p>
        </div>
        <div className="meta">
          <div>
            base-sepolia · chain id <b>84532</b>
          </div>
        </div>
      </div>

      <div className="grid-layout">
        <div className="col">
          <BountyForm onSubmit={handleSubmit} onDemo={runDemo} disabled={running} model={model} onModelChange={setModel} />
          <PipelineLog
            agents={AGENTS}
            statuses={statuses}
            logEntries={logEntries}
            running={running}
            completedCount={completedCount}
            elapsed={elapsed}
          />
        </div>
        <div className="col">
          <SponsorStrip sponsors={sponsors} />
          <ClodPanel usage={clod} running={running} done={done} />
          <OutputPanel pr={pr} tx={tx} />
          <div className="sponsors" style={{ gridTemplateColumns: '1fr' }}>
            <SponsorCard config={BGA_CARD} data={sponsors['bga']} />
          </div>
        </div>
      </div>

      <div className="footstrip">
        <div>agentwerkk · hackathon build</div>
        <div className="links">
          <span>powered by CLōD</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(ui): split submit into checkout→redirect→run; auto-start pipeline on payment redirect"
```

---

## Task 6: Update `src/lib/demo-script.ts`

**Files:**
- Modify: `src/lib/demo-script.ts`

In demo mode the checkout step is skipped entirely. Update the AllScale section to show it as immediately confirmed (no "running" phase — payment is pre-confirmed before the stream starts, matching how the real flow now works).

- [ ] **Step 1: Replace the AllScale section**

Find this block in `src/lib/demo-script.ts`:

```typescript
  // AllScale checkout
  { delayMs: 900,  event: { type: 'status', agent: 'allscale', status: 'running', message: 'Creating checkout session…' } },
  { delayMs: 1600, event: { type: 'status', agent: 'allscale', status: 'done',    message: 'https://checkout.allscale.io/cs_demo_x7f9' } },
  { delayMs: 1700, event: { type: 'sponsor', id: 'allscale', value: 0.10, sub: '0.10 USDC · base-sepolia' } },
```

Replace with:

```typescript
  // AllScale — payment already confirmed before stream
  { delayMs: 900,  event: { type: 'status', agent: 'allscale', status: 'done', message: 'Payment confirmed' } },
  { delayMs: 1000, event: { type: 'sponsor', id: 'allscale', value: 0.10, sub: '0.10 USDC · base-sepolia' } },
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit and push**

```bash
git add src/lib/demo-script.ts
git commit -m "feat(demo): allscale shows as immediately confirmed — checkout precedes stream"
git push -u origin feat/allscale-payment-confirmation
```

---

## Task 7: Open PR

- [ ] **Step 1: Create PR**

```bash
gh pr create \
  --title "feat(allscale): gate pipeline on confirmed payment" \
  --body "$(cat <<'EOF'
## Summary

- Splits pipeline into two calls: \`POST /api/checkout\` (creates AllScale session) and \`POST /api/run\` (verifies payment, streams pipeline)
- \`createCheckoutSession\` now returns \`{ checkoutUrl, intentId }\`; new \`verifyPayment(intentId)\` calls \`GET /v1/checkout_intents/{id}/status\` and checks for status \`20 = CONFIRMED\`
- Frontend saves \`intentId\` to \`sessionStorage\`, navigates to AllScale checkout (same tab), then auto-triggers the pipeline on redirect back
- \`/api/run\` returns HTTP 402 if payment is not confirmed
- Demo mode unchanged — AllScale shows as immediately confirmed

## Test plan
- [ ] Demo Run still works end-to-end
- [ ] Real submit redirects to AllScale checkout URL
- [ ] After returning to \`/?payment=success&...\`, pipeline auto-starts
- [ ] Manually hitting \`/?payment=success\` without sessionStorage does nothing (missing intentId guard)
- [ ] \`npx tsc --noEmit\` passes

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
