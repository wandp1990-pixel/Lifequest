/**
 * @module components/game/items/UnequippedGrid
 * @purpose 보관함(미장착) 그리드. 각 아이템에 장착/삭제 버튼.
 */

"use client"

import { GRADE_BG } from "@/lib/constants/ui"
import { GRADE_COLOR, GradeBadge, LevelBadge, OptionLine, parseOptions, SLOT_ORDER, type EquipmentItem } from "./parts"

interface Props {
  items: EquipmentItem[]
  equippedMap: Record<string, EquipmentItem>
  onEquip: (item: EquipmentItem) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

export default function UnequippedGrid({ items, equippedMap, onEquip, onDelete }: Props) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">
        보관함 ({items.length})
      </p>
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => {
          const opts = parseOptions(item.options)
          const slotInfo = SLOT_ORDER.find((s) => s.id === item.slot)
          const color = GRADE_COLOR[item.grade] ?? "#9E9E9E"
          return (
            <div
              key={item.id}
              className="flex flex-col rounded-2xl overflow-hidden"
              style={{ background: "white", border: `1.5px solid ${color}70` }}
            >
              <div style={{ background: GRADE_BG[item.grade], borderBottom: `1px solid ${color}30`, padding: "5px 7px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 3, minWidth: 0, flex: 1 }}>
                  <span className="text-sm leading-none" style={{ flexShrink: 0 }}>{slotInfo?.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#1C1B1F", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{slotInfo?.label ?? item.slot}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                  <LevelBadge level={item.roll_level} />
                  <GradeBadge grade={item.grade} />
                </div>
              </div>
              <div className="p-2.5 flex flex-col flex-1">
                <p className="text-[11px] font-bold text-foreground leading-tight mb-1.5 line-clamp-2">{item.name}</p>
                <div className="flex-1 space-y-0.5 mb-2">
                  {opts.slice(0, 3).map((opt, i) => <OptionLine key={i} opt={opt} />)}
                </div>
                <div className="flex gap-1 mt-auto">
                  <button
                    onClick={() => onEquip(item)}
                    className="flex-1 text-[10px] font-bold py-1.5 rounded-lg text-white"
                    style={{ background: "#F5A524" }}
                  >
                    장착
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="flex-1 text-[10px] font-bold py-1.5 rounded-lg bg-red-50 text-red-500"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
