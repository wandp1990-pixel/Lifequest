/**
 * @module components/game/battle/LobbyView
 * @purpose 전투 시작 전 화면. 5스탯 그리드 + 해금 등급 + 강도 + 저장된 몬스터 카드 or 새 전투 버튼.
 */

"use client"

import { Sword, Brain, Wind, Shield, Zap, Star } from "lucide-react"
import { GRADE_KEYS, GRADE_META, type CharData, type Monster } from "./types"

interface Props {
  char: CharData | null
  scales: { clearScale: number; levelScale: number }
  savedMonster: Monster | null
  loading: boolean
  error: string | null
  onFight: () => void
}

export default function LobbyView({ char, scales, savedMonster, loading, error, onFight }: Props) {
  const clearCount = char?.clear_count ?? 0
  const level      = char?.level ?? 1
  const coeff      = ((1 + clearCount * scales.clearScale) * (1 + Math.max(0, level - 1) * scales.levelScale)).toFixed(2)

  const eff = char?.effective

  const maxClearedIdx  = char?.max_cleared_grade ? GRADE_KEYS.indexOf(char.max_cleared_grade) : -1
  const unlockedGrades = GRADE_KEYS.slice(0, maxClearedIdx + 2)

  return (
    <div className="flex flex-col gap-0">
      <div className="px-4 py-3 bg-background border-b border-border">
        <p className="text-[10px] text-muted-foreground font-bold mb-2">전투 스탯</p>
        <div className="grid grid-cols-3 gap-1.5">
          {([
            { icon: <Sword  className="w-3 h-3" />, label: "물리공격", value: Math.round(eff?.patk ?? 0), color: "text-red-500",     bg: "bg-red-50",     border: "border-red-200" },
            { icon: <Brain  className="w-3 h-3" />, label: "마법공격", value: Math.round(eff?.matk ?? 0), color: "text-violet-500",  bg: "bg-violet-50",  border: "border-violet-200" },
            { icon: <Wind   className="w-3 h-3" />, label: "민첩",     value: Math.round(eff?.dex  ?? 0), color: "text-sky-500",     bg: "bg-sky-50",     border: "border-sky-200" },
            { icon: <Shield className="w-3 h-3" />, label: "물리방어", value: Math.round(eff?.pdef ?? 0), color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200" },
            { icon: <Zap    className="w-3 h-3" />, label: "마법방어", value: Math.round(eff?.mdef ?? 0), color: "text-teal-500",    bg: "bg-teal-50",    border: "border-teal-200" },
            { icon: <Star   className="w-3 h-3" />, label: "운",       value: Math.round(eff?.luk  ?? 0), color: "text-amber-500",   bg: "bg-amber-50",   border: "border-amber-200" },
          ]).map(({ icon, label, value, color, bg, border }) => (
            <div key={label} className={`text-center rounded-xl py-2 border ${bg} ${border}`}>
              <div className={`flex justify-center mb-0.5 ${color}`}>{icon}</div>
              <div className={`text-[9px] mb-0.5 font-bold ${color}`}>{label}</div>
              <div className="text-sm font-bold text-foreground">{value}</div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">해금 등급</span>
            {unlockedGrades.map((g) => (
              <span key={g} className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: GRADE_META[g].color, background: GRADE_META[g].color + "22" }}>
                {g}
              </span>
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">몬스터 강도 ×{coeff}</span>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}

      {savedMonster && !loading && (
        <div className="px-4 pt-3">
          <div className="bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-2xl p-4">
            <p className="text-[10px] text-orange-400 font-bold mb-2">마지막 상대</p>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold" style={{ color: savedMonster.color }}>{savedMonster.full_name}</p>
                <p className="text-[10px] text-muted-foreground">{savedMonster.grade_code}({savedMonster.grade_name}) · {savedMonster.race_emoji} {savedMonster.race_name}</p>
              </div>
              <span className="text-[10px] text-muted-foreground">강도 ×{savedMonster.total_coeff.toFixed(2)}</span>
            </div>
            <button onClick={onFight} className="w-full py-3 rounded-xl font-bold text-white bg-red-500 active:scale-95 text-sm">🔄 재도전</button>
          </div>
        </div>
      )}

      {!savedMonster && (
        <div className="px-4 pt-3 pb-4">
          <button
            onClick={onFight}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-95 disabled:opacity-60 bg-red-500 shadow-sm"
          >
            {loading ? "⚔️ 전투 중..." : "⚔️ 전투 시작"}
          </button>
        </div>
      )}
    </div>
  )
}
