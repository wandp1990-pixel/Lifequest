"use client"

import { useState, Dispatch, SetStateAction } from "react"
import { Plus, X, Pencil, Clock, Bell } from "lucide-react"

export interface DailyItem {
  id: number
  name: string
  fixed_exp: number
  streak?: number
  notify_time?: string | null
  days_since_last?: number | null
}

type DeleteTarget = { type: "daily"; id: number; name: string }

interface HabitSectionProps {
  dailyItems: DailyItem[]
  setDailyItems: Dispatch<SetStateAction<DailyItem[]>>
  checkedDailyIds: Set<number>
  setCheckedDailyIds: Dispatch<SetStateAction<Set<number>>>
  onToast: (exp: number, comment: string, bonus?: number, penalty?: boolean, penaltyExp?: number) => void
  onConfirmDelete: (target: DeleteTarget) => void
  onExpGained?: () => void
}

export default function HabitSection({
  dailyItems,
  setDailyItems,
  checkedDailyIds,
  setCheckedDailyIds,
  onToast,
  onConfirmDelete,
  onExpGained,
}: HabitSectionProps) {
  const [completing, setCompleting] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newExp, setNewExp] = useState(10)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState("")
  const [editingExp, setEditingExp] = useState(10)
  const [notifyEditId, setNotifyEditId] = useState<number | null>(null)
  const [notifyEditVal, setNotifyEditVal] = useState("")

  const addHabit = async () => {
    if (!newName.trim()) return
    const res = await fetch("/api/checklist", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, suggested_exp: newExp }),
    })
    if (res.ok) {
      const data = await res.json()
      setDailyItems(data.items ?? [])
      setCheckedDailyIds(new Set(data.checkedIds ?? []))
    }
    setNewName("")
    setAdding(false)
  }

  const saveHabitName = async (id: number) => {
    if (!editingName.trim()) return
    const res = await fetch("/api/checklist", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: editingName, fixed_exp: editingExp }),
    })
    if (res.ok) {
      const data = await res.json()
      setDailyItems(data.items ?? [])
    }
    setEditingId(null)
  }

  const saveNotifyTime = async (id: number, time: string | null) => {
    const res = await fetch("/api/checklist", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, notify_time: time }),
    })
    if (res.ok) {
      const data = await res.json()
      setDailyItems(data.items ?? [])
      setCheckedDailyIds(new Set(data.checkedIds ?? []))
    }
    setNotifyEditId(null)
  }

  const completeHabit = async (item: DailyItem) => {
    if (checkedDailyIds.has(item.id) || completing !== null) return
    setCompleting(item.id)
    try {
      const res = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      })
      const data = await res.json()
      if (!res.ok) return
      setCheckedDailyIds((prev) => new Set([...prev, item.id]))
      setDailyItems((prev) => prev.map((d) => d.id === item.id ? { ...d, streak: data.streak } : d))
      onToast(data.exp, data.comment, data.bonusExp > 0 ? data.bonusExp : undefined, undefined, data.penaltyExp > 0 ? data.penaltyExp : undefined)
      onExpGained?.()
    } finally {
      setCompleting(null)
    }
  }

  return (
    <div className="mx-4 mt-2 rounded-2xl border border-amber-100 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between bg-amber-50 dark:bg-amber-900/30">
        <div className="flex items-center gap-2">
          <span className="text-sm">☀️</span>
          <span className="text-sm font-bold text-foreground">습관</span>
        </div>
        <button
          onClick={() => { setAdding(!adding); setNewName(""); setNewExp(10) }}
          className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center active:scale-90 transition-transform"
          aria-label="습관 추가"
        >
          {adding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        </button>
      </div>

      {adding && (
        <div className="px-4 py-2 flex gap-1.5 border-t border-amber-100 bg-amber-50/50">
          <input autoFocus type="text" value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addHabit()}
            placeholder="예: 아침 식사 후 물 한 잔"
            className="flex-1 min-w-0 text-sm text-gray-900 bg-background border border-amber-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-amber-300"
          />
          <input type="number" value={newExp}
            onChange={(e) => setNewExp(Number(e.target.value))}
            className="w-14 text-sm text-center text-gray-900 bg-background border border-amber-200 rounded-xl px-1 py-2 outline-none"
            min={1}
          />
          <button onClick={addHabit} className="px-3 py-2 bg-amber-400 text-white rounded-xl text-sm font-bold active:scale-95">추가</button>
        </div>
      )}

      {dailyItems.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-4">+ 버튼으로 습관을 추가하세요</p>
      )}

      {dailyItems.map((item) => {
        const done = checkedDailyIds.has(item.id)
        const isLoading = completing === item.id
        const streak = item.streak ?? 0
        const streakColor =
          streak >= 100 ? "text-yellow-600 bg-yellow-50 border-yellow-200" :
          streak >= 30  ? "text-red-600 bg-red-50 border-red-200" :
          streak >= 7   ? "text-orange-600 bg-orange-50 border-orange-200" :
          streak >= 1   ? "text-orange-500 bg-orange-50 border-orange-100" :
                          "text-muted-foreground bg-muted border-border"
        const streakLabel =
          streak >= 100 ? "🏆 완전 습관" :
          streak >= 90  ? `💫 ${streak}일 (루틴 완성)` :
          streak >= 60  ? `🔥 ${streak}일 (습관 완성!)` :
          streak >= 30  ? `🔥 ${streak}일 (자리잡는 중)` :
          streak >= 14  ? `🔥 ${streak}일 (유지 중)` :
          streak >= 7   ? `🔥 ${streak}일 (적응 중)` :
          streak >= 1   ? `🌱 ${streak}일 (시작)` : "아직 시작 전"
        const isEditingName = editingId === item.id

        return (
          <div key={item.id} className={`flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 transition-opacity ${done ? "opacity-50" : ""}`}>
            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <div className="flex items-center gap-1.5">
                  <input autoFocus type="text" value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveHabitName(item.id); if (e.key === "Escape") setEditingId(null) }}
                    className="flex-1 min-w-0 text-sm text-gray-900 bg-amber-50 border border-amber-300 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-amber-300"
                  />
                  <input type="number" value={editingExp}
                    onChange={(e) => setEditingExp(Number(e.target.value))}
                    className="w-14 text-xs text-center text-gray-900 bg-amber-50 border border-amber-300 rounded-lg px-1 py-0.5 outline-none flex-shrink-0"
                    min={1}
                  />
                  <button onClick={() => saveHabitName(item.id)} className="px-2.5 py-1 rounded-full text-xs font-bold text-amber-600 bg-amber-100 active:scale-95 flex-shrink-0">저장</button>
                  <button onClick={() => setEditingId(null)} className="text-muted-foreground flex-shrink-0"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className={`text-sm font-semibold leading-snug truncate min-w-0 ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.name}</p>
                    {!done && (
                      <button onClick={() => { setEditingId(item.id); setEditingName(item.name); setEditingExp(item.fixed_exp) }}
                        className="text-gray-300 hover:text-amber-400 transition-colors flex-shrink-0 p-0.5" aria-label="이름 수정">
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${streakColor}`}>{streakLabel}</span>
                    {!done && (
                      <button onClick={() => { setNotifyEditId(item.id); setNotifyEditVal(item.notify_time ?? "") }}
                        className={`flex-shrink-0 flex items-center gap-0.5 transition-colors active:scale-95 ${item.notify_time ? "text-amber-500" : "text-gray-300 hover:text-amber-400"}`}
                        aria-label="알림 설정">
                        <Clock className="w-3.5 h-3.5" />
                        {item.notify_time && <span className="text-[10px] font-bold">{item.notify_time}</span>}
                      </button>
                    )}
                  </div>
                  {!done && (item.days_since_last ?? 0) >= 2 && (() => {
                    const missed = (item.days_since_last ?? 2) - 1
                    const msg = missed === 1 ? "어제 못했어요, 오늘 다시 시작해봐요! 💪" :
                      missed <= 3 ? `${missed}일 쉬었어요, 오늘부터 다시! 🌱` :
                      `${missed}일 쉬었어요... 패널티가 쌓이고 있어요 ⚠️`
                    return <p className="text-[10px] font-medium text-orange-500 leading-snug">{msg}</p>
                  })()}
                </div>
              )}
              {!isEditingName && notifyEditId === item.id && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Bell className="w-3 h-3 text-amber-400 flex-shrink-0" />
                  <input autoFocus type="time" value={notifyEditVal}
                    onChange={(e) => setNotifyEditVal(e.target.value)}
                    className="text-xs bg-background border border-amber-200 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-amber-300"
                  />
                  <button onClick={() => saveNotifyTime(item.id, notifyEditVal || null)}
                    className="text-xs font-bold text-amber-600 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg active:scale-95">저장</button>
                  {item.notify_time && (
                    <button onClick={() => saveNotifyTime(item.id, null)} className="text-xs text-muted-foreground active:scale-95">제거</button>
                  )}
                  <button onClick={() => setNotifyEditId(null)} className="text-muted-foreground"><X className="w-3 h-3" /></button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={() => completeHabit(item)} disabled={done || completing !== null}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all active:scale-95 ${
                  done ? "bg-muted text-muted-foreground cursor-not-allowed" :
                  isLoading ? "bg-amber-200 text-amber-700 animate-pulse cursor-wait" :
                  "bg-amber-100 text-amber-600 hover:bg-amber-200"
                }`}>
                {done ? "✓ 완료" : isLoading ? "처리 중..." : `+${item.fixed_exp} EXP`}
              </button>
              <button onClick={() => onConfirmDelete({ type: "daily", id: item.id, name: item.name })}
                className="text-gray-300 hover:text-red-400 transition-colors p-0.5" aria-label="삭제">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
