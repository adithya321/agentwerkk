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
