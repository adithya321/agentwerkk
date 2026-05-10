# Demo Mode — Design Spec
_2026-05-10 · AgentWork hackathon_

## Goal

Add a "Demo Run" button that triggers a fully scripted, animated pipeline run with zero live network calls. Purpose: record a clean, reproducible hackathon submission video without depending on GitHub tokens, CLōD, AllScale, Clustly, or Base Sepolia.

## Approach

Client-side event replay. A `DEMO_SCRIPT` array holds `{ delayMs, event }` pairs that match the exact `PipelineEvent` union type already used by the real SSE stream. `page.tsx` walks the array with `setTimeout` chains, feeding the same state setters as the real pipeline. The real `/api/run` route and all agents are untouched.

## Files to Create / Modify

| File | Change |
|------|--------|
| `src/lib/demo-script.ts` | **New.** Exports `DEMO_EVENTS` array — 18-second scripted run |
| `src/app/page.tsx` | Add `runDemo()` alongside `handleSubmit`; pass `onDemo` to BountyForm |
| `src/app/components/BountyForm.tsx` | Add `onDemo` prop + "▶ Demo Run" button; pre-fill issue URL |

## Demo Script Sequence (~18 seconds total)

| t (ms) | Agent | Event |
|--------|-------|-------|
| 0 | orchestrator | status: running "Fetching issue #42…" |
| 800 | orchestrator | status: done "fix: null pointer in payment processor" |
| 900 | allscale | status: running "Creating checkout session…" |
| 1600 | allscale | status: done · sponsor card |
| 1700 | clustly | status: running "Posting sub-tasks…" |
| 2400 | clustly | status: done "3 sub-tasks posted" · sponsor card |
| 2500 | repo-scout | status: running (parallel) |
| 2500 | docs-scout | status: running (parallel) |
| 2700–4800 | repo-scout | log stream: keywords, search, 4 files found |
| 2700–4500 | docs-scout | log stream: Nia fetch, 3 docs indexed |
| 4900 | repo-scout | status: done "4 files" |
| 5000 | docs-scout | status: done "3 docs" · nia sponsor card |
| 5100 | fix-agent | status: running "Generating fix…" |
| 5300–8500 | fix-agent | log stream: prompt build, CLōD call, parse result |
| 9000 | — | clod_usage event (lights up CLōD panel with animated counters) |
| 9100 | fix-agent | status: done "1 file(s) changed" · greptile sponsor card |
| 9200 | github | status: running "Creating PR…" |
| 9400–10800 | github | log stream: branch create, commit, PR open |
| 11000 | — | pr_created → OutputPanel PR card lights up |
| 11100 | github | status: done |
| 11200 | reputation | status: running "Writing to Base Sepolia…" |
| 11400–13500 | reputation | log stream: tx broadcast, block confirm |
| 14000 | — | reputation_updated → OutputPanel on-chain card lights up |
| 14100 | reputation | status: done · bga sponsor card |
| 14200 | — | done |

## Hardcoded Demo Values

- **Issue URL** (pre-filled in form): `https://github.com/acme-corp/payment-api/issues/42`
- **Issue title**: `fix: null pointer in payment processor`
- **PR URL**: `https://github.com/acme-corp/payment-api/pull/142`
- **Tx hash**: `0x4a9f2e8c1b3d7f6a0e5c2b9d4f1a8e3c7b0d5f2a9e6c3b0d7f4a1e8c5b2d9f6a`
- **CLōD usage**: model `claude-sonnet-4-6`, 8 247 tokens, CLōD cost $0.00284, direct $0.01180, savings 75.9%

## BountyForm Changes

- Add `onDemo?: () => void` prop
- "▶ Demo Run" button renders alongside the real Submit button, styled distinctly (ghost/outline variant) so it reads as secondary
- Clicking it pre-fills `issueUrl` with the demo URL and calls `onDemo()`
- Button is hidden (or disabled) while `running === true`

## runDemo() in page.tsx

```ts
const runDemo = useCallback(() => {
  // reset state identical to handleSubmit preamble
  setStatuses(INITIAL_STATUSES())
  setLogEntries([])
  setClod(null)
  setPr(null)
  setTx(null)
  setSponsors({})
  setRunning(true)
  setDone(false)
  t0Ref.current = Date.now()

  // walk DEMO_EVENTS with per-entry setTimeout
  DEMO_EVENTS.forEach(({ delayMs, event }) => {
    setTimeout(() => consumeEvent(event), delayMs)
  })
}, [])
```

`consumeEvent` is the same switch logic extracted from the SSE loop in `handleSubmit` — extract it so both paths share it.

## What Is NOT Changed

- `/api/run` route
- `orchestrator.ts` and all agents
- All lib files (`clod.ts`, `github.ts`, `allscale.ts`, `clustly.ts`, `reputation.ts`)
- `types.ts`

## Out of Scope

- Any persistence of demo state
- Disabling the real Submit button in demo mode
- Any backend demo route
