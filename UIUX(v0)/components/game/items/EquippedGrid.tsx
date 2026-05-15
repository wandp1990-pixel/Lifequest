/**
 * @module components/game/items/EquippedGrid
 * @purpose 9칸 장착 슬롯 그리드. 비어있는 슬롯은 dashed border 플레이스홀더.
 */

"use client"

import { GRADE_BG } from "@/lib/constants/ui"
import { GRADE_COLOR, GradeBadge, LevelBadge, OptionLine, parseOptions, SLOT_ORDER, type EquipmentItem } from "./parts"

export default function EquippedGrid({ equippedMap, onSelect }: { equippedMap: Record<string, EquipmentItem>; onSelect?: (item: EquipmentItem) => void }) {
  return (
    <div>
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">장착 장비</p>
      <div className="grid grid-cols-3 gap-2">
        {SLOT_ORDER.map(({ id, label, icon }) => {
          const item = equippedMap[id]
          if (!item) {
            return (
              <div
                key={id}
                className="flex flex-col items-center justify-center rounded-2xl min-h-[90px] gap-1"
                style={{ border: "1.5px dashed var(--border)", background: "var(--muted)" }}
              >
                <span className="text-2xl opacity-20">{icon}</span>
                <p className="text-[10px] font-bold text-gray-300">{label}</p>
              </div>
            )
          }
          const opts = parseOptions(item.options)
          const color = GRADE_COLOR[item.grade] ?? "#9E9E9E"
          return (
            <div
              key={id}
              className="flex flex-col rounded-2xl overflow-hidden cursor-pointer active:scale-95 transition-transform"
              style={{ background: "white", border: `1.5px solid ${color}`, boxShadow: `0 2px 6px ${color}20` }}
              onClick={() => onSelect?.(item)}
            >
              <div style={{ background: GRADE_BG[item.grade], borderBottom: `1px solid ${color}30`, padding: "5px 7px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 3, minWidth: 0, flex: 1 }}>
                  <span className="text-sm leading-none" style={{ flexShrink: 0 }}>{icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#1C1B1F", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                  <LevelBadge level={item.roll_level} />
                  <GradeBadge grade={item.grade} />
                </div>
              </div>
              <div className="p-2.5 flex flex-col flex-1">
                <p className="text-[11px] font-bold text-foreground leading-tight mb-1.5 line-clamp-2">{item.name}</p>
                <div className="space-y-0.5">
                  {opts.slice(0, 3).map((opt, i) => <OptionLine key={i} opt={opt} />)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
