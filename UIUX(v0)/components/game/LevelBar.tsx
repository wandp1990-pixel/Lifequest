"use client"

interface LevelBarProps {
  level: number
  totalExp: number
  nextExp: number
  drawTickets: number
  statPoints: number
}

export default function LevelBar({ level, totalExp, nextExp, drawTickets, statPoints }: LevelBarProps) {
  const expPercent = nextExp > 0 ? Math.min((totalExp / nextExp) * 100, 100) : 0
  return (
    <div className="flex items-stretch px-4 pb-2 gap-3">
      {/* 레벨 + 뽑기권 + 스탯포인트 */}
      <div className="flex flex-col items-start justify-center gap-1 flex-shrink-0">
        <div className="bg-muted border border-border rounded-xl px-3 py-1">
          <span className="text-sm font-bold text-foreground">Lv.{level}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <span className="text-sm">🎫</span>
          <span className="text-sm font-bold text-foreground">{drawTickets}</span>
        </div>
        {statPoints > 0 && (
          <div className="flex items-center gap-0.5 bg-amber-50 border border-amber-300 rounded-lg px-2 py-0.5">
            <span className="text-[11px]">⭐</span>
            <span className="text-[11px] font-bold text-amber-600">{statPoints} SP</span>
          </div>
        )}
      </div>

      {/* EXP 바 + 수치 */}
      <div className="flex-1 flex flex-col justify-center gap-0.5">
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#f39c12] to-[#f1c40f] transition-all"
            style={{ width: `${expPercent}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground">
          {totalExp.toLocaleString()} / {nextExp.toLocaleString()} EXP
        </span>
      </div>
    </div>
  )
}
