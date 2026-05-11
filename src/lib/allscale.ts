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
  if (!process.env.ALLSCALE_API_KEY || !process.env.ALLSCALE_API_SECRET) {
    console.warn('[AllScale] credentials not set — skipping payment verification')
    return true
  }
  if (intentId.startsWith(SIM_PREFIX)) return false
  if (!/^[\w-]{1,64}$/.test(intentId)) return false

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
