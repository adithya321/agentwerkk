import { timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'

const BEARER = /^Bearer\s+(.+)$/i

/** Validates Authorization: Bearer <token> against PIPELINE_API_SECRET. */
export function authorizePipelineRequest(req: NextRequest): { ok: true } | { ok: false; status: number; message: string } {
  const secret = process.env.PIPELINE_API_SECRET
  const minSecretBytes = 32
  if (!secret || Buffer.byteLength(secret, 'utf8') < minSecretBytes) {
    return { ok: false, status: 503, message: 'Pipeline authentication is not configured' }
  }
  const raw = req.headers.get('authorization')
  const tokenMatch = raw?.match(BEARER)
  if (!tokenMatch) {
    return { ok: false, status: 401, message: 'Missing or invalid Authorization header' }
  }
  const token = tokenMatch[1]
  const tokenBuf = Buffer.from(token, 'utf8')
  const secretBuf = Buffer.from(secret, 'utf8')
  if (tokenBuf.length !== secretBuf.length || !timingSafeEqual(tokenBuf, secretBuf)) {
    return { ok: false, status: 401, message: 'Unauthorized' }
  }
  return { ok: true }
}
