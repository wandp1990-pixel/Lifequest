"use client"

import { X } from "lucide-react"
import { GRADE_BG, GRADE_COLOR } from "@/lib/constants/ui"
import { GradeBadge, LevelBadge, OptionLine, parseOptions, SLOT_ORDER, type EquipmentItem } from "./parts"

interface Props {
  item: EquipmentItem
  onClose: () => void
  onEquip?: (item: EquipmentItem) => void
  onDelete?: (id: number) => void
}

export default function ItemDetailSheet({ item, onClose, onEquip, onDelete }: Props) {
  const slotInfo = SLOT_ORDER.find((s) => s.id === item.slot)
  const opts = parseOptions(item.options)
  const color = GRADE_COLOR[item.grade] ?? "#9E9E9E"
  const isUnequipped = item.is_equipped === 0

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none px-4">
        <div
          className="pointer-events-auto w-full max-w-sm rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[85dvh]"
          style={{ background: "white" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div
            className="flex items-center gap-3 px-5 py-4 border-b"
            style={{ background: GRADE_BG[item.grade], borderColor: `${color}30` }}
          >
            <span className="text-3xl leading-none flex-shrink-0">{slotInfo?.icon ?? "⚔️"}</span>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-[15px] text-gray-900 leading-snug">{item.name}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <GradeBadge grade={item.grade} />
                {item.roll_level && item.roll_level > 1 && <LevelBadge level={item.roll_level} />}
                <span className="text-[10px] text-gray-500 font-medium">{slotInfo?.label ?? item.slot}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-black/10 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 본문 */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {/* 기본 스탯 */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
              <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">기본 스탯</span>
              <span className="text-sm font-extrabold" style={{ color }}>{item.base_stat}</span>
            </div>

            {/* 전체 옵션 */}
            {opts.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-2">옵션</p>
                {opts.map((opt, i) => (
                  <div key={i} className="py-1">
                    <OptionLine opt={opt} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">옵션 없음</p>
            )}
          </div>

          {/* 액션 버튼 (미장착 아이템만) */}
          {isUnequipped && (
            <div className="flex gap-2 px-5 pb-5 pt-2 border-t border-gray-100">
              <button
                onClick={() => { onEquip?.(item); onClose() }}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-white active:scale-95 transition-transform"
                style={{ background: "#F5A524" }}
              >
                장착
              </button>
              <button
                onClick={() => { onDelete?.(item.id); onClose() }}
                className="flex-1 py-3 rounded-2xl text-sm font-bold bg-red-50 text-red-500 active:scale-95 transition-transform"
              >
                삭제
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
