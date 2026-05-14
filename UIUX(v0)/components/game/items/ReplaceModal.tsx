/**
 * @module components/game/items/ReplaceModal
 * @purpose 가챠 결과가 기존 장착 아이템 슬롯과 충돌할 때, 교체/버리기 선택 모달.
 */

"use client"

import { GRADE_BG } from "@/lib/constants/ui"
import { GRADE_COLOR, GradeBadge, LevelBadge, OptionLine, parseOptions, type EquipmentItem, type GachaResult } from "./parts"

interface Props {
  pending: { newItem: GachaResult; oldItem: EquipmentItem }
  onReplace: () => void
  onDiscard: () => void
}

export default function ReplaceModal({ pending, onReplace, onDiscard }: Props) {
  const { newItem, oldItem } = pending
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onDiscard}>
      <div
        className="w-full max-w-sm bg-background rounded-t-3xl px-4 pt-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-bold text-foreground mb-3 text-center">장착 중인 아이템이 있습니다</p>

        <div
          className="rounded-xl px-3 py-3 mb-2"
          style={{
            background: GRADE_BG[newItem.grade],
            border: `2px solid ${GRADE_COLOR[newItem.grade] ?? "#9E9E9E"}`,
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold text-muted-foreground bg-white/70 px-1.5 py-0.5 rounded">NEW</span>
            <LevelBadge level={newItem.rollLevel} />
            <GradeBadge grade={newItem.grade} />
            <span className="text-xs font-bold text-foreground truncate">{newItem.name}</span>
          </div>
          <div className="space-y-0.5 pl-1">
            {newItem.options.map((opt, i) => <OptionLine key={i} opt={opt} />)}
          </div>
        </div>

        <div
          className="rounded-xl px-3 py-3 mb-4"
          style={{
            background: "rgba(0,0,0,0.03)",
            border: `2px solid ${GRADE_COLOR[oldItem.grade] ?? "#9E9E9E"}50`,
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold text-muted-foreground bg-white/70 px-1.5 py-0.5 rounded">현재</span>
            <LevelBadge level={oldItem.roll_level} />
            <GradeBadge grade={oldItem.grade} />
            <span className="text-xs font-bold text-muted-foreground truncate">{oldItem.name}</span>
          </div>
          <div className="space-y-0.5 pl-1">
            {parseOptions(oldItem.options).map((opt, i) => <OptionLine key={i} opt={opt} />)}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onDiscard} className="flex-1 py-3 rounded-2xl bg-muted text-muted-foreground text-sm font-bold">버리기</button>
          <button onClick={onReplace} className="flex-1 py-3 rounded-2xl text-white text-sm font-bold" style={{ background: "#F5A524" }}>교체 (기존 폐기)</button>
        </div>
      </div>
    </div>
  )
}
