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

export default function ItemsTab({ drawTickets, onTicketsChanged }: ItemsTabProps) {
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [rolling, setRolling] = useState(false)
  const [lastGacha, setLastGacha] = useState<EquipmentItem | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchInventory = async () => {
    const res = await fetch("/api/inventory")
    if (res.ok) {
      const data = await res.json()
      setEquipment(data.equipment ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchInventory()
  }, [])

  const handleGacha = async () => {
    if (rolling || drawTickets < 1) return
    setRolling(true)
    setLastGacha(null)
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 1 }),
      })
      if (res.ok) {
        const data = await res.json()
        await fetchInventory()
        onTicketsChanged?.()
        if (data.results?.[0]) {
          setLastGacha(data.results[0])
        }
      }
    } finally {
      setRolling(false)
    }
  }

  const handleEquip = async (id: number, equipped: boolean) => {
    await fetch("/api/inventory", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: equipped ? "unequip" : "equip", itemId: id }),
    })
    await fetchInventory()
  }

  const handleDelete = async (id: number) => {
    await fetch("/api/inventory", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", itemId: id }),
    })
    await fetchInventory()
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><p className="text-gray-400 text-sm">불러오는 중...</p></div>
  }

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

          {lastGacha && (
            <div className={`mt-3 flex items-center gap-3 rounded-xl px-3 py-2 border ${GRADE_BORDER[lastGacha.grade]} ${GRADE_BG[lastGacha.grade]}`}>
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-lg">⚔️</div>
              <div>
                <p className="text-xs font-bold text-gray-800">{lastGacha.name} 획득!</p>
                <p className={`text-[10px] font-bold ${GRADE_TEXT[lastGacha.grade]}`}>
                  [{GRADE_LABEL[lastGacha.grade]}] 기본 스탯 {lastGacha.base_stat}
                </p>
              </div>
              <span className="ml-auto text-lg">✨</span>
            </div>
          )}
        </div>
      </div>

      {/* 장비 목록 */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
          보유 장비 ({equipment.length})
        </p>
        {equipment.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            뽑기권으로 장비를 획득하세요
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {equipment.map((item) => {
              const isEquipped = item.is_equipped === 1
              const options = (() => { try { return JSON.parse(item.options) } catch { return {} } })()
              return (
                <div
                  key={item.id}
                  className={`relative flex flex-col items-center rounded-2xl pt-3 pb-2 px-2 border-2 ${GRADE_BORDER[item.grade]} ${GRADE_BG[item.grade]} ${isEquipped ? "ring-2 ring-offset-1 ring-amber-400" : ""}`}
                >
                  {isEquipped && (
                    <div className="absolute top-1.5 left-1.5 bg-amber-400 rounded-full px-1.5 py-0.5">
                      <span className="text-[8px] font-black text-gray-900">ON</span>
                    </div>
                  )}
                  <div className="w-10 h-10 rounded-lg bg-white/50 flex items-center justify-center text-xl mb-1">⚔️</div>
                  <p className="text-[10px] font-bold text-gray-700 text-center leading-tight">{item.name}</p>
                  <p className={`text-[9px] font-semibold mt-0.5 ${GRADE_TEXT[item.grade]}`}>{GRADE_LABEL[item.grade]}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5">스탯 {item.base_stat}</p>

                  {/* 옵션 표시 */}
                  <div className="mt-1 w-full">
                    {Object.entries(options).slice(0, 2).map(([k, v]) => (
                      k !== "passive" && (
                        <p key={k} className="text-[8px] text-gray-400 text-center truncate">{k}: {v as string}</p>
                      )
                    ))}
                  </div>

                  <div className="flex gap-1 mt-2 w-full">
                    <button
                      onClick={() => handleEquip(item.id, isEquipped)}
                      className={`flex-1 text-[9px] font-bold py-1 rounded-lg transition ${isEquipped ? "bg-gray-200 text-gray-600" : "bg-amber-400 text-white"}`}
                    >
                      {isEquipped ? "해제" : "장착"}
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex-1 text-[9px] font-bold py-1 rounded-lg bg-red-100 text-red-500 transition"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
