/**
 * @module components/game/CharacterTab
 * @purpose 캐릭터 탭 컨테이너. 스탯/스킬 뷰 전환 토글 + 자식 두 개 렌더.
 */

"use client"

import { useState } from "react"
import StatView from "./character/StatView"
import SkillView from "./character/SkillView"
import type { CharBasics, EffectiveStats, ItemStatBonuses } from "./character/constants"

interface Props {
  char: CharBasics | null
  onCharUpdated: () => void
  itemStatBonuses?: ItemStatBonuses
  effectiveStats?: EffectiveStats
}

export default function CharacterTab({ char, onCharUpdated, itemStatBonuses, effectiveStats }: Props) {
  const [view, setView] = useState<"stat" | "skill">("stat")

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-4 pt-3 pb-2 flex gap-2 shrink-0">
        <button
          onClick={() => setView("stat")}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
            view === "stat" ? "bg-amber-500 text-white shadow-sm" : "bg-muted text-muted-foreground"
          }`}
        >
          스탯 배분
        </button>
        <button
          onClick={() => setView("skill")}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
            view === "skill" ? "bg-purple-500 text-white shadow-sm" : "bg-muted text-muted-foreground"
          }`}
        >
          스킬 투자
        </button>
      </div>

      {view === "stat" && (
        <StatView
          char={char}
          itemStatBonuses={itemStatBonuses}
          effectiveStats={effectiveStats}
          onCharUpdated={onCharUpdated}
        />
      )}

      {view === "skill" && <SkillView char={char} onCharUpdated={onCharUpdated} />}
    </div>
  )
}
