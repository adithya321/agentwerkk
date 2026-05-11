# AllScale Payment Confirmation — Design Spec

**Date:** 2026-05-10  
**Status:** Approved

## Problem

The pipeline currently continues optimistically after creating an AllScale checkout session, without waiting for the user to actually complete payment. The fix splits the flow into two HTTP calls so the pipeline only runs after payment is server-side verified.

## Approach

Two-call split with server-side verification:

1. **`POST /api/checkout`** — creates the AllScale session, returns `{ checkoutUrl, intentId }`. Pipeline does not start.
2. User pays on the AllScale-hosted checkout page.
3. AllScale redirects back with all context in the URL: `/?payment=success&intent_id=xxx&issue_url=<encoded>&bounty=0.10&model=grok-4` (`issue_url` is `encodeURIComponent`'d when building the redirect URL)
4. **`POST /api/run`** — accepts `{ intentId, issueUrl, bountyUsdc, model }`, verifies payment with AllScale (`GET /v1/checkout_intents/{intentId}/status`, checks for status `20 = CONFIRMED`), then streams the SSE pipeline.

## AllScale API

- `POST /v1/checkout_intents/` — response payload includes `checkout_url` and `allscale_checkout_intent_id`
- `GET /v1/checkout_intents/{id}/status` — returns integer status; `20 = CONFIRMED` (paid); negative values are failure states (`-1 FAILED`, `-2 REJECTED`, `-3 UNDERPAID`, `-4 CANCELED`, `-5 TIMEOUT`)
- Same HMAC-SHA256 signing required on both calls

## File Changes

### `src/lib/allscale.ts`

- `createCheckoutSession(amountUsdc, description, redirectUrl)` returns `{ checkoutUrl: string; intentId: string }` instead of `string`
- Capture `allscale_checkout_intent_id` from POST response alongside `checkout_url`
- Add `verifyPayment(intentId: string): Promise<boolean>` — calls `GET /v1/checkout_intents/{intentId}/status`, returns `true` if status is `20`
- Simulation fallback: return a fake `intentId` (`sim_intent_xxx`) and `verifyPayment` returns `true` for sim IDs

### `src/app/api/checkout/route.ts` (new)

- `POST` handler
- Accepts `{ issueUrl, bountyUsdc, model }` — validates inputs
- Calls `createCheckoutSession`, embeds all context in the `redirect_url`
- Returns `{ checkoutUrl, intentId }` as JSON (not SSE)

### `src/app/api/run/route.ts`

- Accepts `intentId` in the request body (required)
- Before opening the SSE stream, calls `verifyPayment(intentId)`
- If not confirmed: returns `HTTP 402 { error: "Payment not confirmed" }` — no stream opened
- If confirmed: proceeds with the pipeline SSE as today

### `src/agents/orchestrator.ts`

- Remove the `createCheckoutSession` call and the `allscale_checkout` / `allscale` status events — checkout now happens before the stream in `/api/checkout`
- Remove `createCheckoutSession` import

### `src/app/page.tsx`

- **Submit handler:** calls `POST /api/checkout` first → gets `{ checkoutUrl, intentId }` → opens `checkoutUrl` in new tab → shows a "Waiting for payment…" holding state (not the pipeline yet)
- **On mount:** reads `?payment=success`, `intent_id`, `issue_url`, `bounty`, `model` query params from the URL → if present, strips params from URL (via `replaceState`), restores form state, auto-triggers `POST /api/run`
- **Error handling:** if `/api/run` returns 402, show "Payment not confirmed — please complete checkout" instead of starting the pipeline

### `src/lib/demo-script.ts`

- Update the AllScale section: show `allscale` as `done` at the start of the demo (before the pipeline), reflecting that checkout already happened
- Remove `allscale_checkout` event (no longer emitted mid-stream)

## Error States

| Scenario | Behaviour |
|----------|-----------|
| `/api/checkout` fails (AllScale down) | Returns error JSON; frontend shows error, no new tab opened |
| User abandons checkout (never pays) | Redirect never happens; frontend stays in "Waiting for payment…" state indefinitely |
| User manually fakes `?payment=success` | `/api/run` calls AllScale status API; status ≠ 20; returns 402 |
| AllScale status is negative (failed/canceled) | `/api/run` returns 402 with specific message |
| Simulation mode (`ALLSCALE_API_KEY` not set) | `verifyPayment` returns `true` for sim intent IDs; pipeline runs normally |

## Out of Scope

- Timeout/expiry UI for abandoned checkouts
- Webhook-based confirmation (polling on redirect is sufficient for demo)
- Saving checkout state across browser sessions
