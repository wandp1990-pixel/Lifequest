"use client"

interface CharacterPanelProps {
  name: string
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  level: number
  drawTickets: number
  statPoints: number
  skillPoints: number
  totalExp: number
  nextExp: number
  tick?: number
}

export default function CharacterPanel({
  name, hp, maxHp, mp, maxMp, level, drawTickets, statPoints, skillPoints, totalExp, nextExp,
}: CharacterPanelProps) {
  const hpPct  = maxHp  > 0 ? Math.min((hp  / maxHp)  * 100, 100) : 0
  const mpPct  = maxMp  > 0 ? Math.min((mp  / maxMp)  * 100, 100) : 0
  const expPct = nextExp > 0 ? Math.min((totalExp / nextExp) * 100, 100) : 0

  const bars = [
    { label: 'HP', val: hp,       max: maxHp,  pct: hpPct,  color: '#F58FA8' },
    { label: 'MP', val: mp,       max: maxMp,  pct: mpPct,  color: '#7FB3F5' },
    { label: 'XP', val: totalExp, max: nextExp, pct: expPct, color: '#F5C879' },
  ]

  return (
    <div
      className="mx-4 mb-2 mt-1 rounded-2xl border border-border bg-background"
      style={{ padding: '10px 12px', boxShadow: '0 1px 2px rgba(28,27,31,0.04), 0 2px 8px rgba(28,27,31,0.04)' }}
    >
      {/* Row 1: Name + Lv badge */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-bold text-foreground leading-none">{name || "모험가"}</span>
        <span
          className="text-[11px] font-bold px-1.5 py-0.5 rounded leading-none"
          style={{ color: '#A89BF0', background: '#F0ECFB' }}
        >
          Lv.{level}
        </span>
      </div>

      {/* Row 2: HP / MP / XP thin pills */}
      <div className="flex gap-2 mb-2">
        {bars.map(({ label, val, pct, color }) => (
          <div key={label} className="flex-1 flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold leading-none" style={{ color }}>{label}</span>
              <span className="text-[10px] font-bold text-muted-foreground leading-none tabular-nums">{val}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Row 3: SP / SKP / 뽑기권 resource pills */}
      <div className="flex gap-1.5">
        <span
          className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold rounded-lg py-1 leading-none"
          style={{ background: '#FFF1E0', color: '#B5651D' }}
        >
          ✦ SP {statPoints}
        </span>
        <span
          className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold rounded-lg py-1 leading-none"
          style={{ background: '#F0ECFB', color: '#7A6BD6' }}
        >
          ⚡ SKP {skillPoints}
        </span>
        <span
          className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold rounded-lg py-1 leading-none"
          style={{ background: '#FFF4DC', color: '#B5651D' }}
        >
          🎫 {drawTickets}
        </span>
      </div>
    </div>
  )
}
