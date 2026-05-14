/**
 * @module components/game/items/ReplaceModal
 * @purpose 가챠 결과가 기존 장착 아이템 슬롯과 충돌할 때, 교체/버리기 선택 모달.
 *          Phase 5.3: shadcn Drawer 채택 (vaul bottom sheet).
 */

"use client"

import { GRADE_BG } from "@/lib/constants/ui"
import { GRADE_COLOR, GradeBadge, LevelBadge, OptionLine, parseOptions, type EquipmentItem, type GachaResult } from "./parts"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"

interface Props {
  pending: { newItem: GachaResult; oldItem: EquipmentItem }
  onReplace: () => void
  onDiscard: () => void
}

export default function ReplaceModal({ pending, onReplace, onDiscard }: Props) {
  const { newItem, oldItem } = pending
  return (
    <Drawer open={true} onOpenChange={(o) => !o && onDiscard()}>
      <DrawerContent className="left-1/2 -translate-x-1/2 w-full max-w-sm">
        <DrawerHeader>
          <DrawerTitle className="text-center">장착 중인 아이템이 있습니다</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6">
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
      </DrawerContent>
    </Drawer>
  )
}
