'use client'
import { useState, useEffect } from 'react'
import type { ClodUsage } from '@/types'

function useCountUp(target: number, active: boolean, duration = 1200) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!active) { setV(0); return }
    let raf: number
    let start: number | null = null
    const tick = (ts: number) => {
      if (!start) start = ts
      const t = Math.min(1, (ts - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setV(target * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, active, duration])
  return v
}

interface Props {
  usage: ClodUsage | null
  running: boolean
  done: boolean
}

export default function ClodPanel({ usage, running, done }: Props) {
  const has = !!usage
  const animPct     = useCountUp(has ? usage!.savingsPct  : 0, has, 1400)
  const animClod    = useCountUp(has ? usage!.clodCost    : 0, has, 1400)
  const animDirect  = useCountUp(has ? usage!.directCost  : 0, has, 1400)
  const animSavings = useCountUp(has ? usage!.savings     : 0, has, 1400)
  const animTokens  = useCountUp(has ? usage!.totalTokens : 0, has, 1400)

  const directCost = has ? usage!.directCost : 0.01180
  const clodCost   = has ? usage!.clodCost   : 0.00284
  const directW = 100
  const clodW   = has ? Math.max(6, (clodCost / directCost) * 100) : 0

  const liveLabel = running ? 'streaming' : has ? 'finalized' : done ? 'complete' : 'idle'

  return (
    <div className="clod">
      <div className="clod-inner">
        <div className="clod-head">
          <div className="clod-eyebrow">
            <span className="glyph">⚡</span> CLōD Usage · routed inference
          </div>
          <div className="clod-live">{liveLabel}</div>
        </div>

        <p className="clod-title">
          {has ? usage!.model : 'awaiting first model call…'}
        </p>

        <div className="savings-row">
          <div>
            <span className="savings-pct">{has ? Math.round(animPct) : '—'}</span>
            <span className="savings-sym">{has ? '%' : ''}</span>
          </div>
          <div className="savings-tag"><span className="arrow">▼</span> savings vs direct</div>
        </div>

        <p className="savings-sub">
          CLōD smart-routed this run — you paid{' '}
          <b>${animClod.toFixed(5)}</b> instead of{' '}
          <b>${animDirect.toFixed(5)}</b>, banking{' '}
          <b style={{ color: 'var(--cyan)' }}>${animSavings.toFixed(5)}</b> in inference savings.
        </p>

        <div className="bars">
          <div className="bar-row">
            <div className="bar-label direct"><span className="d"></span>Direct API</div>
            <div className="bar-track">
              <div className="bar-fill direct" style={{ width: has ? directW + '%' : '0%' }}></div>
            </div>
            <div className="bar-amount direct mono-tab">${animDirect.toFixed(5)}</div>
          </div>
          <div className="bar-row">
            <div className="bar-label clod-lbl"><span className="d"></span>CLōD</div>
            <div className="bar-track">
              <div className="bar-fill clod-fill" style={{ width: has ? clodW + '%' : '0%' }}></div>
            </div>
            <div className="bar-amount clod-amt mono-tab">${animClod.toFixed(5)}</div>
          </div>
        </div>

        <div className="clod-meta">
          <div className="cell">
            <div className="k">Tokens <span className="micro">in+out</span></div>
            <div className="v mono-tab">{has ? Math.round(animTokens).toLocaleString() : '—'}</div>
          </div>
          <div className="cell">
            <div className="k">Saved <span className="micro">vs direct</span></div>
            <div className="v cyan mono-tab">{has ? `$${animSavings.toFixed(5)}` : '—'}</div>
          </div>
          <div className="cell">
            <div className="k">Route <span className="micro">region</span></div>
            <div className="v">us-west-2 <small>· batched</small></div>
          </div>
        </div>
      </div>
    </div>
  )
}
