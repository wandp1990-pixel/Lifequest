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
    <div className="flex items-center px-4 pb-2 gap-2">
      {/* 레벨 + 뽑기권 */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="bg-gray-100 border border-gray-200 rounded-xl px-3 py-1">
          <span className="text-sm font-bold text-gray-700">Lv.{level}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <span className="text-base">🎫</span>
          <span className="text-sm font-bold text-gray-700">{drawTickets}</span>
        </div>
      </div>

      {/* EXP 바 + 수치 + 스탯포인트 */}
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#f39c12] to-[#f1c40f] transition-all"
            style={{ width: `${expPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400">
            {totalExp.toLocaleString()} / {nextExp.toLocaleString()} EXP
          </span>
          {statPoints > 0 && (
            <span className="text-[10px] font-bold text-blue-500">
              스탯 {statPoints}P
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
