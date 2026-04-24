"use client"

interface LevelBarProps {
  level: number
  expPercent: number
  drawTickets: number
}

export default function LevelBar({ level, expPercent, drawTickets }: LevelBarProps) {
  return (
    <div className="flex items-center justify-between px-4 pb-2 gap-2">
      <div className="bg-gray-100 border border-gray-200 rounded-xl px-3 py-1 flex-shrink-0">
        <span className="text-sm font-bold text-gray-700">Lv.{level}</span>
      </div>

      {/* EXP 바 */}
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#f39c12] to-[#f1c40f] transition-all"
            style={{ width: `${Math.min(expPercent, 100)}%` }}
          />
        </div>
        <span className="text-[10px] text-gray-400 text-right">{expPercent}%</span>
      </div>

      {/* 뽑기권 */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-base">🎫</span>
        <span className="text-sm font-bold text-gray-700">{drawTickets}</span>
      </div>
    </div>
  )
}
