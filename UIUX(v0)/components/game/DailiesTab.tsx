"use client"

import { useState, useEffect } from "react"

interface ChecklistItem {
  id: number
  name: string
  fixed_exp: number
}

interface DailiesTabProps {
  onExpGained?: () => void
  onCountChange?: (count: number) => void
}

export default function DailiesTab({ onExpGained, onCountChange }: DailiesTabProps) {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState<number | null>(null)
  const [toast, setToast] = useState<{ id: number; exp: number; comment?: string } | null>(null)

  useEffect(() => {
    fetch("/api/checklist")
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items ?? [])
        setCheckedIds(new Set(data.checkedIds ?? []))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    onCountChange?.(checkedIds.size)
  }, [checkedIds, onCountChange])

  const toggleItem = async (item: ChecklistItem) => {
    if (checkedIds.has(item.id) || checking !== null) return
    setChecking(item.id)
    try {
      const res = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      })
      if (res.ok) {
        const data = await res.json()
        setCheckedIds((prev) => new Set([...prev, item.id]))
        setToast({ id: item.id, exp: data.exp })
        onExpGained?.()
        setTimeout(() => setToast(null), 2000)
      }
    } finally {
      setChecking(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-gray-400 text-sm">불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0 relative">
      {/* EXP 토스트 */}
      {toast && (
        <div className="absolute top-2 right-3 z-20 bg-amber-400 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow animate-bounce">
          +{toast.exp} EXP!
        </div>
      )}

      {items.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <p className="text-gray-400 text-sm">데일리 항목이 없습니다</p>
        </div>
      )}

      {items.map((item) => {
        const isChecked = checkedIds.has(item.id)
        const isChecking = checking === item.id
        return (
          <div key={item.id} className="flex items-stretch bg-white border-b border-gray-100">
            <button
              onClick={() => toggleItem(item)}
              disabled={isChecked || isChecking}
              className={`w-14 flex items-center justify-center flex-shrink-0 transition-all rounded-l-xl my-1 ml-1 ${
                isChecked ? "bg-gray-400" : "bg-[#f0a500]"
              }`}
              aria-label={`${item.name} 완료`}
            >
              <div
                className={`w-7 h-7 rounded-md border-2 transition-all flex items-center justify-center ${
                  isChecked ? "bg-white border-white" : "bg-[#f5c842] border-[#e6b400]"
                }`}
              >
                {isChecking ? (
                  <span className="text-[10px] text-amber-600 font-black">...</span>
                ) : isChecked ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7l4 4 6-6" stroke="#4a4a4a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </div>
            </button>

            <div className="flex-1 py-3 px-3">
              <p className={`text-sm font-semibold leading-snug mb-0.5 ${isChecked ? "line-through text-gray-400" : "text-gray-800"}`}>
                {item.name}
              </p>
              <p className="text-xs text-amber-500 font-bold">+{item.fixed_exp} EXP</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
