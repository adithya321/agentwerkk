export async function createCheckoutSession(
  amountUsdc: number,
  description: string
): Promise<string> {
  if (!process.env.ALLSCALE_API_KEY || !process.env.ALLSCALE_API_SECRET) {
    console.warn('[AllScale] API credentials not set, simulating checkout')
    return `${process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000'}/simulated-checkout`
  }

  const response = await fetch('https://api.allscale.io/v1/checkout/sessions', {
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
      success_url: `${process.env.NEXT_PUBLIC_URL}/?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/?payment=cancelled`,
    }),
  })

  if (!response.ok) {
    console.warn('[AllScale] API unavailable, simulating checkout')
    return `${process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000'}/simulated-checkout`
  }

  const data = await response.json() as { url?: string; checkout_url?: string }
  return data.url ?? data.checkout_url ?? '/simulated-checkout'
}
