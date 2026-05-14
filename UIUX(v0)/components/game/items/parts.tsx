/**
 * @module components/game/items/parts
 * @purpose ItemsTab 내부에서 공유하는 작은 표시 컴포넌트 + 옵션 파싱 + 슬롯 메타.
 */

import { GRADE_COLOR, GRADE_LABEL } from "@/lib/constants/ui"

export interface EquipmentItem {
  id: number
  slot: string
  name: string
  grade: string
  base_stat: number
  options: string
  roll_level?: number
  is_equipped: number
}

export interface GachaResult {
  id: number
  name: string
  grade: string
  slot: string
  rollLevel?: number
  mainValue: number
  options: string[]
}

export const SLOT_ORDER: { id: string; label: string; icon: string }[] = [
  { id: "weapon",   label: "무기",   icon: "🗡️" },
  { id: "helmet",   label: "투구",   icon: "⛑️" },
  { id: "armor",    label: "갑옷",   icon: "🥋" },
  { id: "pants",    label: "바지",   icon: "👖" },
  { id: "belt",     label: "벨트",   icon: "🪢" },
  { id: "glove",    label: "장갑",   icon: "🧤" },
  { id: "shoe",     label: "신발",   icon: "👟" },
  { id: "ring",     label: "반지",   icon: "💍" },
  { id: "necklace", label: "목걸이", icon: "📿" },
]

export function parseOptions(raw: string): string[] {
  try {
    const p = JSON.parse(raw)
    if (Array.isArray(p)) return p
    return Object.entries(p).map(([k, v]) => k === "passive" ? `[${v}]` : `${k} +${v}`)
  } catch { return [] }
}

export function GradeBadge({ grade }: { grade: string }) {
  const color = GRADE_COLOR[grade] ?? "#9E9E9E"
  return (
    <span
      style={{ color, borderColor: color, fontSize: "9px", padding: "0.5px 3px" }}
      className="border rounded font-bold leading-none whitespace-nowrap"
    >
      {grade}
    </span>
  )
}

export function LevelBadge({ level }: { level?: number }) {
  if (!level || level <= 1) return null
  return (
    <span style={{ fontSize: "9px", color: "#6B7280", background: "#F3F4F6", borderRadius: 4, padding: "0.5px 3px", fontWeight: 700, lineHeight: 1, whiteSpace: "nowrap" }}>
      Lv.{level}
    </span>
  )
}

export function OptionLine({ opt }: { opt: string }) {
  if (opt.startsWith("[")) {
    return <p className="text-[10px] font-medium leading-tight" style={{ color: "#9B7BE8" }}>✦ {opt.slice(1, -1)}</p>
  }
  return <p className="text-[10px] text-muted-foreground leading-tight">{opt}</p>
}

export { GRADE_COLOR, GRADE_LABEL }
