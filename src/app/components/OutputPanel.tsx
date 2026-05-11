interface PrData {
  url: string
  repo?: string
  num?: number
}

interface TxData {
  hash: string
  explorerUrl: string
}

interface Props {
  pr: PrData | null
  tx: TxData | null
  checkoutUrl: string | null
}

export default function OutputPanel({ pr, tx, checkoutUrl }: Props) {
  return (
    <div className="outs">
      {/* AllScale checkout card */}
      <div className={`out-card${checkoutUrl ? ' complete' : ''}`} style={checkoutUrl ? { borderColor: 'var(--green)', background: 'rgba(0,200,120,0.04)' } : {}}>
        <div className="head">
          <div className="label">AllScale Checkout</div>
          <div className="check">{checkoutUrl ? '✓' : '·'}</div>
        </div>
        {checkoutUrl ? (
          <>
            <div className="h3">session created</div>
            <div className="sub">USDC · base-sepolia</div>
            <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="link">
              <span>◆</span>
              <span>{checkoutUrl.replace(/^https?:\/\//, '')}</span>
              <span className="arr">↗</span>
            </a>
            <div className="out-foot"><span>complete payment to fund bounty</span></div>
          </>
        ) : (
          <div className="placeholder">— no session yet —<br />opens when bounty is posted</div>
        )}
      </div>

      {/* PR card */}
      <div className={`out-card${pr ? ' complete green-card' : ''}`}>
        <div className="head">
          <div className="label">Pull Request</div>
          <div className="check">{pr ? '✓' : '·'}</div>
        </div>
        {pr ? (
          <>
            <div className="h3">PR {pr.num ? `#${pr.num}` : ''} opened</div>
            <div className="sub">{pr.repo ?? 'github.com'}</div>
            <a href={pr.url} target="_blank" rel="noopener noreferrer" className="link">
              <span>🐙</span>
              <span>{pr.url.replace('https://', '')}</span>
              <span className="arr">↗</span>
            </a>
            <div className="out-foot"><span>awaiting review</span></div>
          </>
        ) : (
          <div className="placeholder">— no PR yet —<br />opens when fix-agent → github completes</div>
        )}
      </div>

      {/* On-chain card */}
      <div className={`out-card${tx ? ' complete violet-card' : ''}`}>
        <div className="head">
          <div className="label">On-chain Reputation</div>
          <div className="check">{tx ? '✓' : '·'}</div>
        </div>
        {tx ? (
          <>
            <div className="h3">tx confirmed</div>
            <div className="sub">base-sepolia</div>
            <a href={tx.explorerUrl} target="_blank" rel="noopener noreferrer" className="link">
              <span style={{ color: 'var(--violet)' }}>⟁</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {tx.hash.slice(0, 18)}…{tx.hash.slice(-6)}
              </span>
              <span className="arr">↗</span>
            </a>
            <div className="out-foot"><span>basescan.org/sepolia</span></div>
          </>
        ) : (
          <div className="placeholder">— no tx yet —<br />fires after PR opens &amp; ratings publish</div>
        )}
      </div>
    </div>
  )
}
