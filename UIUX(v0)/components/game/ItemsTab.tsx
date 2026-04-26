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

const GRADE_BORDER: Record<string, string> = {
  C: "border-gray-300", B: "border-blue-400", A: "border-purple-500",
  S: "border-amber-400", SR: "border-orange-500", SSR: "border-red-500", UR: "border-pink-500",
}
const GRADE_BG: Record<string, string> = {
  C: "bg-gray-50", B: "bg-blue-50", A: "bg-purple-50",
  S: "bg-amber-50", SR: "bg-orange-50", SSR: "bg-red-50", UR: "bg-pink-50",
}
const GRADE_TEXT: Record<string, string> = {
  C: "text-gray-500", B: "text-blue-500", A: "text-purple-500",
  S: "text-amber-500", SR: "text-orange-500", SSR: "text-red-500", UR: "text-pink-500",
}
const GRADE_LABEL: Record<string, string> = {
  C: "일반", B: "고급", A: "희귀", S: "영웅", SR: "전설", SSR: "고대", UR: "신화",
}

const SLOT_ORDER: { id: string; label: string }[] = [
  { id: "weapon",   label: "무기" },
  { id: "helmet",   label: "투구" },
  { id: "armor",    label: "갑옷" },
  { id: "pants",    label: "바지" },
  { id: "belt",     label: "벨트" },
  { id: "glove",    label: "장갑" },
  { id: "shoe",     label: "신발" },
  { id: "ring",     label: "반지" },
  { id: "necklace", label: "목걸이" },
]

function parseOptions(raw: string): string[] {
  try {
    const p = JSON.parse(raw)
    if (Array.isArray(p)) return p
    return Object.entries(p).map(([k, v]) => k === "passive" ? `[${v}]` : `${k} +${v}`)
  } catch { return [] }
}

function OptionList({ opts }: { opts: string[] }) {
  return (
    <>
      {opts.map((opt, i) =>
        opt.startsWith("[") ? (
          <p key={i} className="text-[7px] text-purple-500 text-center truncate">✦ {opt.slice(1, -1)}</p>
        ) : (
          <p key={i} className="text-[7px] text-gray-500 text-center truncate">{opt}</p>
        )
      )}
    </>
  )
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

      // 현재 슬롯에 장착된 아이템 확인
      const currentEquipped = equipment.find(e => e.slot === item.slot && e.is_equipped === 1)

      if (!currentEquipped) {
        // 빈 슬롯 → 자동 장착
        await patchInventory({ action: "equip", itemId: item.id })
        await fetchInventory()
        setLastResult({ item, autoEquipped: true })
      } else {
        // 이미 장착 중 → 교체 여부 선택
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
    // 새 아이템 장착 (기존 아이템 자동 해제) → 기존 아이템 폐기
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

  const handleUnequip = async (id: number) => {
    await patchInventory({ action: "unequip", itemId: id })
    await fetchInventory()
  }

  const handleDelete = async (id: number) => {
    await patchInventory({ action: "delete", itemId: id })
    await fetchInventory()
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><p className="text-gray-400 text-sm">불러오는 중...</p></div>
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
              <p className="text-gray-400 text-xs mt-0.5">🎫 {drawTickets}장 보유</p>
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
            <div className={`mt-3 flex items-center gap-3 rounded-xl px-3 py-2 border ${GRADE_BORDER[lastResult.item.grade]} ${GRADE_BG[lastResult.item.grade]}`}>
              <div>
                <p className="text-xs font-bold text-gray-800">{lastResult.item.name} 획득!</p>
                <p className={`text-[10px] font-bold ${GRADE_TEXT[lastResult.item.grade]}`}>
                  [{GRADE_LABEL[lastResult.item.grade]}]
                  {lastResult.autoEquipped && <span className="ml-1 text-green-600">자동 장착</span>}
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
            className="w-full max-w-sm bg-white rounded-t-3xl px-4 pt-5 pb-8"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm font-bold text-gray-800 mb-3 text-center">장착 중인 아이템이 있습니다</p>

            {/* 새 아이템 */}
            <div className={`rounded-xl px-3 py-2.5 border-2 ${GRADE_BORDER[pendingReplace.newItem.grade]} ${GRADE_BG[pendingReplace.newItem.grade]} mb-2`}>
              <p className="text-[10px] text-gray-400 font-semibold mb-0.5">NEW</p>
              <p className="text-xs font-bold text-gray-800">{pendingReplace.newItem.name}</p>
              <p className={`text-[10px] font-bold ${GRADE_TEXT[pendingReplace.newItem.grade]}`}>{GRADE_LABEL[pendingReplace.newItem.grade]}</p>
              <div className="mt-1">
                {pendingReplace.newItem.options.map((opt, i) =>
                  opt.startsWith("[") ? (
                    <p key={i} className="text-[9px] text-purple-500">✦ {opt.slice(1, -1)}</p>
                  ) : (
                    <p key={i} className="text-[9px] text-gray-500">{opt}</p>
                  )
                )}
              </div>
            </div>

            {/* 기존 아이템 */}
            <div className={`rounded-xl px-3 py-2.5 border-2 ${GRADE_BORDER[pendingReplace.oldItem.grade]} bg-gray-50 mb-4`}>
              <p className="text-[10px] text-gray-400 font-semibold mb-0.5">현재 장착</p>
              <p className="text-xs font-bold text-gray-600">{pendingReplace.oldItem.name}</p>
              <p className={`text-[10px] font-bold ${GRADE_TEXT[pendingReplace.oldItem.grade]}`}>{GRADE_LABEL[pendingReplace.oldItem.grade]}</p>
              <div className="mt-1">
                {parseOptions(pendingReplace.oldItem.options).map((opt, i) => (
                  <p key={i} className="text-[9px] text-gray-400">{opt}</p>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDiscard}
                className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-600 text-sm font-bold"
              >
                버리기
              </button>
              <button
                onClick={handleReplace}
                className="flex-1 py-3 rounded-2xl bg-amber-400 text-white text-sm font-bold"
              >
                교체 (기존 폐기)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 장착 슬롯 그리드 (9칸 항상 표시) */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">장착 장비</p>
        <div className="grid grid-cols-3 gap-2">
          {SLOT_ORDER.map(({ id, label }) => {
            const item = equippedMap[id]
            if (item) {
              const opts = parseOptions(item.options)
              return (
                <div
                  key={id}
                  className={`relative flex flex-col items-center rounded-2xl pt-2 pb-2 px-1.5 border-2 ${GRADE_BORDER[item.grade]} ${GRADE_BG[item.grade]} ring-2 ring-offset-1 ring-amber-400`}
                >
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/70 ${GRADE_TEXT[item.grade]} mb-1`}>
                    {label}
                  </span>
                  <p className="text-[9px] font-bold text-gray-700 text-center leading-tight">{item.name}</p>
                  <p className={`text-[8px] font-semibold mt-0.5 ${GRADE_TEXT[item.grade]}`}>{GRADE_LABEL[item.grade]}</p>
                  <div className="mt-1 w-full"><OptionList opts={opts} /></div>
                  <button
                    onClick={() => handleUnequip(item.id)}
                    className="mt-2 w-full text-[8px] font-bold py-1 rounded-lg bg-gray-200 text-gray-600"
                  >
                    해제
                  </button>
                </div>
              )
            }
            // 빈 슬롯
            return (
              <div
                key={id}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-4 px-2 min-h-[100px]"
              >
                <p className="text-[10px] font-bold text-gray-300">{label}</p>
                <p className="text-[8px] text-gray-200 mt-0.5">비어있음</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* 미장착 아이템 (있을 경우만 표시) */}
      {unequipped.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
            보관함 ({unequipped.length})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {unequipped.map(item => {
              const opts = parseOptions(item.options)
              return (
                <div
                  key={item.id}
                  className={`relative flex flex-col items-center rounded-2xl pt-2 pb-2 px-1.5 border-2 ${GRADE_BORDER[item.grade]} ${GRADE_BG[item.grade]}`}
                >
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/70 ${GRADE_TEXT[item.grade]} mb-1`}>
                    {SLOT_ORDER.find(s => s.id === item.slot)?.label ?? item.slot}
                  </span>
                  <p className="text-[9px] font-bold text-gray-700 text-center leading-tight">{item.name}</p>
                  <p className={`text-[8px] font-semibold mt-0.5 ${GRADE_TEXT[item.grade]}`}>{GRADE_LABEL[item.grade]}</p>
                  <div className="mt-1 w-full"><OptionList opts={opts} /></div>
                  <div className="flex gap-1 mt-2 w-full">
                    <button
                      onClick={async () => {
                        const cur = equippedMap[item.slot]
                        if (cur) await patchInventory({ action: "delete", itemId: cur.id })
                        await patchInventory({ action: "equip", itemId: item.id })
                        await fetchInventory()
                      }}
                      className="flex-1 text-[8px] font-bold py-1 rounded-lg bg-amber-400 text-white"
                    >
                      장착
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex-1 text-[8px] font-bold py-1 rounded-lg bg-red-100 text-red-500"
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
