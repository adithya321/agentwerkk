'use client'
import { useCountUp } from '@/lib/hooks'

export interface SponsorState {
  value: number
  sub: string
}

interface CardConfig {
  id: string
  cls: string
  logoChar: string
  name: string
  unit: string
  idleLabel: string
  barTo: number
  formatNum: (v: number) => string
  foot: (active: boolean) => React.ReactNode
}

const CARDS: CardConfig[] = [
  {
    id: 'allscale', cls: 'sp-allscale', logoChar: '◆',
    name: 'AllScale', unit: 'USDC', idleLabel: 'stablecoin checkout · awaiting',
    barTo: 100, formatNum: (v) => v.toFixed(2),
    foot: () => <>route <b>USDC · ETH-L2</b><span>settle <b>1.2s</b></span></>,
  },
  {
    id: 'clustly', cls: 'sp-clustly', logoChar: '⌬',
    name: 'Clustly', unit: 'tasks', idleLabel: 'sub-task marketplace · awaiting',
    barTo: 100, formatNum: (v) => String(Math.round(v)),
    foot: () => <>accept <b>100%</b><span>slots <b>3/3</b></span></>,
  },
  {
    id: 'greptile', cls: 'sp-greptile', logoChar: '⌘',
    name: 'Greptile', unit: 'M tok indexed', idleLabel: 'AI code review · awaiting PR',
    barTo: 92, formatNum: (v) => v.toFixed(1),
    foot: () => <>blockers <b>0</b><span>nits <b>1</b></span></>,
  },
  {
    id: 'nia', cls: 'sp-nia', logoChar: '▲',
    name: 'Nia', unit: 'docs', idleLabel: 'codebase intelligence · awaiting',
    barTo: 88, formatNum: (v) => String(Math.round(v)),
    foot: () => <>symbols <b>482</b><span>ttl <b>5m</b></span></>,
  },
  {
    id: 'bga', cls: 'sp-bga', logoChar: '✦',
    name: 'BGA · Chain for Good', unit: '% open-source', idleLabel: 'public-goods registry · awaiting',
    barTo: 100, formatNum: (v) => String(Math.round(v)),
    foot: () => <>license <b>MIT</b><span>registry <b>opengoods.xyz</b></span></>,
  },
]

function SponsorCard({ config, data }: { config: CardConfig; data?: SponsorState }) {
  const active = !!data
  const animVal = useCountUp(active ? data!.value : 0, active, 900)

  return (
    <div className={`sp-card ${config.cls}${active ? ' active' : ''}`}>
      <div className="sp-inner">
        <div className="sp-head">
          <div className="sp-brand">
            <span className="sp-logo-slot">{config.logoChar}</span>
            {config.name}
          </div>
          <div className="sp-status">{active ? 'live' : 'idle'}</div>
        </div>
        <div className="sp-metric">
          <span className="sp-num">{active ? config.formatNum(animVal) : '—'}</span>
          <span className="sp-unit">{config.unit}</span>
        </div>
        <p className="sp-label">{active ? data!.sub : config.idleLabel}</p>
        <div className="sp-bar">
          <div className="sp-bar-fill" style={{ width: active ? config.barTo + '%' : '0%' }}></div>
        </div>
        <div className="sp-foot">{config.foot(active)}</div>
      </div>
    </div>
  )
}

interface Props {
  sponsors: Record<string, SponsorState>
}

export default function SponsorStrip({ sponsors }: Props) {
  const liveCount = Object.keys(sponsors).length
  return (
    <div>
      <div className="sponsors-head">
        <div className="ttl">Sponsor Stack · partner integrations</div>
        <div className="sub">{liveCount}/5 partners live</div>
      </div>
      <div className="sponsors">
        {CARDS.map((c) => (
          <SponsorCard key={c.id} config={c} data={sponsors[c.id]} />
        ))}
      </div>
    </div>
  )
}
