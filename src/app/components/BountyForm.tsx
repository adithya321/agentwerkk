'use client'
import { useState } from 'react'
import { DEMO_ISSUE_URL } from '@/lib/demo-script'

interface Props {
  onSubmit: (issueUrl: string, bountyUsdc: number) => void
  onDemo?: () => void
  disabled: boolean
}

const SUGGEST = [0.05, 0.10, 0.25, 1.00]

export default function BountyForm({ onSubmit, onDemo, disabled }: Props) {
  const [issueUrl, setIssueUrl] = useState('https://github.com/tanstack/query/issues/482')
  const [bounty,   setBounty]   = useState(0.10)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(issueUrl, bounty)
  }

  const handleDemo = () => {
    setIssueUrl(DEMO_ISSUE_URL)
    onDemo?.()
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="ttl"><span className="ix">01</span> New Bounty</div>
        <div className="meta">USDC · base-sepolia</div>
      </div>
      <div className="panel-body">
        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label>
              GitHub Issue URL
              <span className="hint">paste from github.com/…</span>
            </label>
            <div className="field-wrap">
              <span className="prefix">🐙</span>
              <input
                className="input with-prefix"
                type="url"
                value={issueUrl}
                onChange={(e) => setIssueUrl(e.target.value)}
                placeholder="https://github.com/owner/repo/issues/123"
                required
              />
            </div>
          </div>
          <div className="field">
            <label>
              Bounty
              <span className="hint">paid on PR merge</span>
            </label>
            <div className="amount-row">
              <div className="field-wrap">
                <span className="prefix">$</span>
                <input
                  className="input with-prefix mono-tab"
                  value={bounty}
                  onChange={(e) => setBounty(parseFloat(e.target.value) || 0)}
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                />
              </div>
              <div className="suggest">
                {SUGGEST.map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={Math.abs(bounty - v) < 0.001 ? 'active' : ''}
                    onClick={() => setBounty(v)}
                  >
                    ${v.toFixed(2)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button className="submit" type="submit" disabled={disabled}>
            {disabled
              ? <>⏱ running pipeline…</>
              : <>▶ Post Bounty · Run Agents <span className="kbd">⌘ ↵</span></>
            }
          </button>
          {!disabled && onDemo && (
            <button className="demo-btn" type="button" onClick={handleDemo}>
              ▷ Demo Run
            </button>
          )}
          <div className="submit-meta">
            <div className="balance">est. payout to 3 agents</div>
            <div>base-sepolia</div>
          </div>
        </form>
      </div>
    </div>
  )
}
