/**
 * @module components/game/items/GachaBanner
 * @purpose 가챠 배너 + 뽑기 버튼 + 직전 결과 알림.
 */

"use client"

import { GRADE_COLOR, GRADE_LABEL, type GachaResult } from "./parts"

interface Props {
  drawTickets: number
  rolling: boolean
  lastResult: { item: GachaResult; autoEquipped: boolean } | null
  onRoll: () => void
}

export default function GachaBanner({ drawTickets, rolling, lastResult, onRoll }: Props) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{ background: "linear-gradient(135deg, #1F1638 0%, #2A1F47 60%, #7A6BD6 100%)", boxShadow: "0 6px 20px rgba(40,30,80,0.25)" }}
    >
      <div className="absolute" style={{ right: -30, top: -40, width: 140, height: 140, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,138,61,0.4), transparent 70%)" }} />
      <div className="relative px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-black tracking-widest uppercase mb-1" style={{ color: "#FFB57A", letterSpacing: "0.12em" }}>GACHA · LIMITED</p>
            <p className="text-white font-bold text-base leading-tight">아이템 뽑기</p>
            <div className="flex gap-1.5 mt-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1" style={{ background: "rgba(255,138,61,0.2)", color: "#FFB57A" }}>
                🎫 {drawTickets}장 보유
              </span>
            </div>
          </div>
          <button
            onClick={onRoll}
            disabled={rolling || drawTickets < 1}
            className={`flex flex-col items-center justify-center rounded-2xl transition-all active:scale-95 flex-shrink-0 w-16 h-16 border-2 ${
              rolling || drawTickets < 1
                ? "border-gray-500 bg-gray-700/50 opacity-60"
                : "border-white/30 shadow-lg"
            }`}
            style={rolling || drawTickets < 1 ? {} : { background: "linear-gradient(135deg, #FFB87A, #F5C879)", boxShadow: "0 0 24px rgba(255,138,61,0.5)" }}
          >
            {rolling ? (
              <span className="text-amber-400 font-black text-xl animate-pulse">...</span>
            ) : (
              <span className="font-black text-white leading-none select-none" style={{ fontSize: "2.2rem" }}>?</span>
            )}
          </button>
        </div>

        {lastResult && (
          <div
            className="mt-3 flex items-center gap-3 rounded-xl px-3 py-2"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: `1px solid ${GRADE_COLOR[lastResult.item.grade] ?? "#9E9E9E"}`,
            }}
          >
            <div>
              <p className="text-xs font-bold text-white">{lastResult.item.name} 획득!</p>
              <p className="text-[10px] font-bold mt-0.5" style={{ color: GRADE_COLOR[lastResult.item.grade] }}>
                [{GRADE_LABEL[lastResult.item.grade]}]
                {lastResult.autoEquipped && <span className="ml-1 text-green-400">자동 장착</span>}
              </p>
            </div>
            <span className="ml-auto text-lg">✨</span>
          </div>
        )}
      </div>
    </div>
  )
}
