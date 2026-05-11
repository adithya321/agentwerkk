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

function makeAmountToken(intentId: string, amountCents: number): string {
  const secret = process.env.ALLSCALE_API_SECRET ?? 'dev-secret'
  const payload = JSON.stringify({ id: intentId, amt: amountCents })
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return Buffer.from(payload).toString('base64') + '.' + sig
}

function parseAmountToken(token: string, intentId: string, requestedCents: number): boolean {
  try {
    const dot = token.indexOf('.')
    if (dot === -1) return false
    const encodedPayload = token.slice(0, dot)
    const sig = token.slice(dot + 1)
    const payload = Buffer.from(encodedPayload, 'base64').toString('utf8')
    const secret = process.env.ALLSCALE_API_SECRET ?? 'dev-secret'
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    if (sig !== expectedSig) return false
    const parsed = JSON.parse(payload) as { id: string; amt: number }
    return parsed.id === intentId && requestedCents <= parsed.amt
  } catch {
    return false
  }
}

function simFallback(): { checkoutUrl: string; intentId: string; amountToken: string } {
  const intentId = SIM_PREFIX + Math.random().toString(36).slice(2, 10)
  return {
    checkoutUrl: `${process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000'}/simulated-checkout`,
    intentId,
    amountToken: makeAmountToken(intentId, 0),
  }
}

export async function createCheckoutSession(
  amountUsdc: number,
  description: string,
  redirectUrl: string
): Promise<{ checkoutUrl: string; intentId: string; amountToken: string }> {
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
    throw new Error(`[AllScale] checkout API error: ${response.status}`)
  }

  const data = await response.json() as {
    code: number
    payload?: { checkout_url?: string; allscale_checkout_intent_id?: string }
  }

  if (data.code !== 0 || !data.payload?.checkout_url || !data.payload?.allscale_checkout_intent_id) {
    throw new Error(`[AllScale] unexpected checkout response: ${JSON.stringify(data)}`)
  }

  const intentId = data.payload.allscale_checkout_intent_id
  const amountToken = makeAmountToken(intentId, Math.round(amountUsdc * 100))
  return {
    checkoutUrl: data.payload.checkout_url,
    intentId,
    amountToken,
  }
}

export async function verifyPayment(
  intentId: string,
  requestedAmountUsdc: number,
  amountToken: string
): Promise<boolean> {
  if (!process.env.ALLSCALE_API_KEY || !process.env.ALLSCALE_API_SECRET) {
    console.warn('[AllScale] credentials not set — skipping payment verification')
    return true
  }
  if (intentId.startsWith(SIM_PREFIX)) return false
  if (!/^[\w-]{1,64}$/.test(intentId)) return false

  const requestedCents = Math.round(requestedAmountUsdc * 100)
  if (!parseAmountToken(amountToken, intentId, requestedCents)) return false

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
