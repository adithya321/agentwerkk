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

export async function createCheckoutSession(
  amountUsdc: number,
  description: string
): Promise<string> {
  if (!process.env.ALLSCALE_API_KEY || !process.env.ALLSCALE_API_SECRET) {
    console.warn('[AllScale] credentials not set — simulating checkout')
    return `${process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000'}/simulated-checkout`
  }

  const path = '/v1/checkout_intents/'
  const body = JSON.stringify({
    stable_coin: 1,
    amount_cents: Math.round(amountUsdc * 100),
    order_description: description,
    redirect_url: `${process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000'}/?payment=success`,
  })

  const sigHeaders = signRequest('POST', path, '', body, process.env.ALLSCALE_API_SECRET!)

  const fallback = `${process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000'}/simulated-checkout`

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
      headers: {
        'X-API-Key': process.env.ALLSCALE_API_KEY!,
        'Content-Type': 'application/json',
        ...sigHeaders,
      },
      body,
    })
  } catch (err) {
    console.warn('[AllScale] request failed/timed out, simulating checkout:', err)
    return fallback
  }

  if (!response.ok) {
    console.warn('[AllScale] API error, simulating checkout:', response.status)
    return fallback
  }

  const data = await response.json() as { code: number; payload?: { checkout_url?: string } }
  if (data.code !== 0 || !data.payload?.checkout_url) {
    console.warn('[AllScale] unexpected response, simulating checkout:', JSON.stringify(data))
    return fallback
  }
  return data.payload.checkout_url
}
