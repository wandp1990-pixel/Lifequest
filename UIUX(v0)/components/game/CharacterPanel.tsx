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
  totalExp: number
  nextExp: number
}

export default function CharacterPanel({
  name, hp, maxHp, mp, maxMp, level, drawTickets, statPoints, totalExp, nextExp,
}: CharacterPanelProps) {
  const hpPct  = maxHp  > 0 ? Math.min((hp  / maxHp)  * 100, 100) : 0
  const mpPct  = maxMp  > 0 ? Math.min((mp  / maxMp)  * 100, 100) : 0
  const expPct = nextExp > 0 ? Math.min((totalExp / nextExp) * 100, 100) : 0

  return (
    <div className="flex gap-3 px-4 pt-3 pb-2">
      {/* 왼쪽: 캐릭터 정보 텍스트 */}
      <div className="w-28 flex-shrink-0 flex flex-col justify-center gap-2 bg-gray-50 border border-gray-100 rounded-2xl px-3 py-3">
        <div>
          <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold mb-0.5">PLAYER</p>
          <p className="text-sm font-extrabold text-gray-800 truncate leading-tight">{name || "모험가"}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-400 font-bold">Lv.</span>
            <span className="text-base font-extrabold text-gray-800 leading-none">{level}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm leading-none">🎫</span>
            <span className="text-xs font-bold text-gray-600">{drawTickets}</span>
          </div>
          {statPoints > 0 && (
            <div className="flex items-center gap-0.5 bg-amber-50 border border-amber-300 rounded-lg px-1.5 py-0.5 w-fit">
              <span className="text-[10px] leading-none">⭐</span>
              <span className="text-[10px] font-bold text-amber-600">{statPoints} SP</span>
            </div>
          )}
        </div>
      </div>

      {/* 오른쪽: HP / MP / EXP 바 */}
      <div className="flex-1 flex flex-col justify-center gap-2">
        {/* HP */}
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-sm leading-none">❤️</span>
            <span className="text-xs font-bold text-[#e74c3c] uppercase tracking-wide">HP</span>
            <span className="ml-auto text-xs font-semibold text-[#e74c3c]">{hp} / {maxHp}</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#e74c3c] to-[#ff6b6b] transition-all"
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>

        {/* MP */}
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-sm leading-none">💎</span>
            <span className="text-xs font-bold text-[#3498db] uppercase tracking-wide">MP</span>
            <span className="ml-auto text-xs font-semibold text-[#3498db]">{mp} / {maxMp}</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#3498db] to-[#5dade2] transition-all"
              style={{ width: `${mpPct}%` }}
            />
          </div>
        </div>

        {/* EXP */}
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-sm leading-none">✨</span>
            <span className="text-xs font-bold text-[#f39c12] uppercase tracking-wide">EXP</span>
            <span className="ml-auto text-xs font-semibold text-[#f39c12]">{totalExp.toLocaleString()} / {nextExp.toLocaleString()}</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#f39c12] to-[#f1c40f] transition-all"
              style={{ width: `${expPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
