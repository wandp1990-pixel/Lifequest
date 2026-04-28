"use client"

import { useState, useEffect } from "react"

interface EquipmentItem {
  id: number
  slot: string
  name: string
  grade: string
  base_stat: number
  options: string
  is_equipped: number
}

interface GachaResult {
  id: number
  name: string
  grade: string
  slot: string
  mainValue: number
  options: string[]
}

interface ItemsTabProps {
  drawTickets: number
  onTicketsChanged?: () => void
}

const GRADE_COLOR: Record<string, string> = {
  C: "#9E9E9E", B: "#4CAF50", A: "#4A90E2",
  S: "#FF9500", SR: "#9B59B6", SSR: "#FFD700", UR: "#FF1493",
}
const GRADE_LABEL: Record<string, string> = {
  C: "일반", B: "고급", A: "희귀", S: "영웅", SR: "전설", SSR: "고대", UR: "신화",
}
const GRADE_BG: Record<string, string> = {
  C:   "rgba(158,158,158,0.08)",
  B:   "rgba(76,175,80,0.08)",
  A:   "rgba(74,144,226,0.08)",
  S:   "rgba(255,149,0,0.08)",
  SR:  "rgba(155,89,182,0.08)",
  SSR: "rgba(255,215,0,0.08)",
  UR:  "rgba(255,20,147,0.08)",
}

const SLOT_ORDER: { id: string; label: string; icon: string }[] = [
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

function parseOptions(raw: string): string[] {
  try {
    const p = JSON.parse(raw)
    if (Array.isArray(p)) return p
    return Object.entries(p).map(([k, v]) => k === "passive" ? `[${v}]` : `${k} +${v}`)
  } catch { return [] }
}

function GradeBadge({ grade }: { grade: string }) {
  const color = GRADE_COLOR[grade] ?? "#9E9E9E"
  return (
    <span
      style={{ color, borderColor: color, fontSize: "9px" }}
      className="border rounded px-1 py-0.5 font-bold leading-none whitespace-nowrap"
    >
      {grade}
    </span>
  )
}

function OptionLine({ opt }: { opt: string }) {
  if (opt.startsWith("[")) {
    return <p className="text-[10px] font-medium leading-tight" style={{ color: "#9B59B6" }}>✦ {opt.slice(1, -1)}</p>
  }
  return <p className="text-[10px] text-muted-foreground leading-tight">{opt}</p>
}

export default function ItemsTab({ drawTickets, onTicketsChanged }: ItemsTabProps) {
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [rolling, setRolling] = useState(false)
  const [lastResult, setLastResult] = useState<{ item: GachaResult; autoEquipped: boolean } | null>(null)
  const [pendingReplace, setPendingReplace] = useState<{ newItem: GachaResult; oldItem: EquipmentItem } | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchInventory = async () => {
    const res = await fetch("/api/inventory")
    if (res.ok) {
      const data = await res.json()
      setEquipment(data.equipment ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { fetchInventory() }, [])

  const patchInventory = async (body: object) => {
    await fetch("/api/inventory", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  }

  const handleGacha = async () => {
    if (rolling || drawTickets < 1) return
    setRolling(true)
    setLastResult(null)
    setPendingReplace(null)
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 1 }),
      })
      if (!res.ok) return
      const data = await res.json()
      const item: GachaResult = data.results?.[0]
      if (!item) return

      onTicketsChanged?.()

      const currentEquipped = equipment.find(e => e.slot === item.slot && e.is_equipped === 1)

      if (!currentEquipped) {
        await patchInventory({ action: "equip", itemId: item.id })
        await fetchInventory()
        setLastResult({ item, autoEquipped: true })
      } else {
        await fetchInventory()
        setPendingReplace({ newItem: item, oldItem: currentEquipped })
      }
    } finally {
      setRolling(false)
    }
  }

  const handleReplace = async () => {
    if (!pendingReplace) return
    const { newItem, oldItem } = pendingReplace
    await patchInventory({ action: "equip", itemId: newItem.id })
    await patchInventory({ action: "delete", itemId: oldItem.id })
    await fetchInventory()
    setLastResult({ item: newItem, autoEquipped: false })
    setPendingReplace(null)
  }

  const handleDiscard = async () => {
    if (!pendingReplace) return
    await patchInventory({ action: "delete", itemId: pendingReplace.newItem.id })
    await fetchInventory()
    setPendingReplace(null)
  }

  const handleDelete = async (id: number) => {
    await patchInventory({ action: "delete", itemId: id })
    await fetchInventory()
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><p className="text-muted-foreground text-sm">불러오는 중...</p></div>
  }

  const equippedMap = Object.fromEntries(
    equipment.filter(e => e.is_equipped === 1).map(e => [e.slot, e])
  )
  const unequipped = equipment.filter(e => e.is_equipped === 0)

  return (
    <div className="px-3 pt-3 pb-4 flex flex-col gap-4">
      {/* 가챠 배너 */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "12px 12px" }} />
        <div className="relative px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-amber-400 text-xs font-bold tracking-widest uppercase mb-0.5">GACHA</p>
              <p className="text-white font-bold text-base leading-tight">아이템 뽑기</p>
              <p className="text-muted-foreground text-xs mt-0.5">🎫 {drawTickets}장 보유</p>
            </div>
            <button
              onClick={handleGacha}
              disabled={rolling || drawTickets < 1}
              className={`flex flex-col items-center justify-center rounded-2xl transition-all active:scale-95 flex-shrink-0 w-16 h-16 border-4 ${
                rolling || drawTickets < 1
                  ? "border-gray-500 bg-gray-700 opacity-60"
                  : "border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-400/20"
              }`}
            >
              {rolling ? (
                <span className="text-amber-400 font-black text-xl animate-pulse">...</span>
              ) : (
                <span className="font-black text-amber-400 leading-none select-none" style={{ fontSize: "2.2rem", textShadow: "0 0 12px #f59e0b" }}>?</span>
              )}
            </button>
          </div>

          {/* 뽑기 결과 알림 */}
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

      {/* 교체 선택 모달 */}
      {pendingReplace && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={handleDiscard}>
          <div
            className="w-full max-w-sm bg-background rounded-t-3xl px-4 pt-5 pb-8"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm font-bold text-foreground mb-3 text-center">장착 중인 아이템이 있습니다</p>

            {/* 새 아이템 */}
            <div
              className="rounded-xl px-3 py-3 mb-2"
              style={{
                background: GRADE_BG[pendingReplace.newItem.grade],
                border: `2px solid ${GRADE_COLOR[pendingReplace.newItem.grade] ?? "#9E9E9E"}`,
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold text-muted-foreground bg-white/70 px-1.5 py-0.5 rounded">NEW</span>
                <GradeBadge grade={pendingReplace.newItem.grade} />
                <span className="text-xs font-bold text-foreground truncate">{pendingReplace.newItem.name}</span>
              </div>
              <div className="space-y-0.5 pl-1">
                {pendingReplace.newItem.options.map((opt, i) => <OptionLine key={i} opt={opt} />)}
              </div>
            </div>

            {/* 기존 아이템 */}
            <div
              className="rounded-xl px-3 py-3 mb-4"
              style={{
                background: "rgba(0,0,0,0.03)",
                border: `2px solid ${GRADE_COLOR[pendingReplace.oldItem.grade] ?? "#9E9E9E"}50`,
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold text-muted-foreground bg-white/70 px-1.5 py-0.5 rounded">현재</span>
                <GradeBadge grade={pendingReplace.oldItem.grade} />
                <span className="text-xs font-bold text-muted-foreground truncate">{pendingReplace.oldItem.name}</span>
              </div>
              <div className="space-y-0.5 pl-1">
                {parseOptions(pendingReplace.oldItem.options).map((opt, i) => <OptionLine key={i} opt={opt} />)}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDiscard}
                className="flex-1 py-3 rounded-2xl bg-muted text-muted-foreground text-sm font-bold"
              >
                버리기
              </button>
              <button
                onClick={handleReplace}
                className="flex-1 py-3 rounded-2xl text-white text-sm font-bold"
                style={{ background: "#FF9500" }}
              >
                교체 (기존 폐기)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 장착 슬롯 그리드 (9칸 항상 표시) */}
      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">장착 장비</p>
        <div className="grid grid-cols-3 gap-2">
          {SLOT_ORDER.map(({ id, label, icon }) => {
            const item = equippedMap[id]
            if (item) {
              const opts = parseOptions(item.options)
              const color = GRADE_COLOR[item.grade] ?? "#9E9E9E"
              return (
                <div
                  key={id}
                  className="flex flex-col rounded-2xl p-2.5"
                  style={{
                    background: GRADE_BG[item.grade],
                    border: `2px solid ${color}`,
                    boxShadow: `0 0 8px ${color}30`,
                  }}
                >
                  {/* 헤더: 슬롯 아이콘 + 슬롯명 + 등급 배지 */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <span className="text-sm leading-none">{icon}</span>
                      <span className="text-[10px] font-bold text-muted-foreground">{label}</span>
                    </div>
                    <GradeBadge grade={item.grade} />
                  </div>
                  {/* 아이템명 */}
                  <p className="text-[11px] font-bold text-foreground leading-tight mb-1.5 line-clamp-2">{item.name}</p>
                  {/* 옵션 (최대 3개) */}
                  <div className="space-y-0.5">
                    {opts.slice(0, 3).map((opt, i) => <OptionLine key={i} opt={opt} />)}
                  </div>
                </div>
              )
            }
            // 빈 슬롯
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
          })}
        </div>
      </div>

      {/* 미장착 아이템 */}
      {unequipped.length > 0 && (
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">
            보관함 ({unequipped.length})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {unequipped.map(item => {
              const opts = parseOptions(item.options)
              const slotInfo = SLOT_ORDER.find(s => s.id === item.slot)
              const color = GRADE_COLOR[item.grade] ?? "#9E9E9E"
              return (
                <div
                  key={item.id}
                  className="flex flex-col rounded-2xl p-2.5"
                  style={{
                    background: GRADE_BG[item.grade],
                    border: `2px solid ${color}50`,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <span className="text-sm leading-none">{slotInfo?.icon}</span>
                      <span className="text-[10px] font-bold text-muted-foreground">{slotInfo?.label ?? item.slot}</span>
                    </div>
                    <GradeBadge grade={item.grade} />
                  </div>
                  <p className="text-[11px] font-bold text-foreground leading-tight mb-1.5 line-clamp-2">{item.name}</p>
                  <div className="flex-1 space-y-0.5 mb-2">
                    {opts.slice(0, 3).map((opt, i) => <OptionLine key={i} opt={opt} />)}
                  </div>
                  <div className="flex gap-1 mt-auto">
                    <button
                      onClick={async () => {
                        const cur = equippedMap[item.slot]
                        if (cur) await patchInventory({ action: "delete", itemId: cur.id })
                        await patchInventory({ action: "equip", itemId: item.id })
                        await fetchInventory()
                      }}
                      className="flex-1 text-[10px] font-bold py-1.5 rounded-lg text-white"
                      style={{ background: "#FF9500" }}
                    >
                      장착
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex-1 text-[10px] font-bold py-1.5 rounded-lg bg-red-50 text-red-500"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
