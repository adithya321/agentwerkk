export async function createCheckoutSession(
  amountUsdc: number,
  description: string
): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000'

  if (!process.env.ALLSCALE_API_KEY || !process.env.ALLSCALE_API_SECRET) {
    console.warn('[AllScale] API credentials not set, simulating checkout')
    return `${baseUrl}/simulated-checkout`
  }

  let response: Response
  try {
    response = await fetch('https://api.allscale.io/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.ALLSCALE_API_KEY!,
        'X-API-Secret': process.env.ALLSCALE_API_SECRET!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountUsdc,
        currency: 'USDC',
        description,
        success_url: `${baseUrl}/?payment=success`,
        cancel_url: `${baseUrl}/?payment=cancelled`,
      }),
    })
  } catch {
    console.warn('[AllScale] Network error, simulating checkout')
    return `${baseUrl}/simulated-checkout`
  }

  if (!response.ok) {
    console.warn('[AllScale] API unavailable, simulating checkout')
    return `${baseUrl}/simulated-checkout`
  }

  let data: { url?: string; checkout_url?: string }
  try {
    data = (await response.json()) as { url?: string; checkout_url?: string }
  } catch {
    console.warn('[AllScale] Invalid JSON response, simulating checkout')
    return `${baseUrl}/simulated-checkout`
  }

  return data.url ?? data.checkout_url ?? `${baseUrl}/simulated-checkout`
}
