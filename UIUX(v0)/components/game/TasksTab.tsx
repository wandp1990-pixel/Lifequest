"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, X } from "lucide-react"

interface DailyItem {
  id: number
  name: string
  fixed_exp: number
}

interface TodoItem {
  id: number
  name: string
  suggested_exp: number
  is_completed: number
  exp_gained?: number
  ai_comment?: string
}

interface TasksTabProps {
  onExpGained?: () => void
  onCountChange?: (count: number) => void
  onDailyCompletedChange?: (count: number) => void
}

export default function TasksTab({ onExpGained, onCountChange, onDailyCompletedChange }: TasksTabProps) {
  const [dailyItems, setDailyItems] = useState<DailyItem[]>([])
  const [checkedDailyIds, setCheckedDailyIds] = useState<Set<number>>(new Set())
  const [todoItems, setTodoItems] = useState<TodoItem[]>([])
  const [adding, setAdding] = useState<"daily" | "todo" | null>(null)
  const [newName, setNewName] = useState("")
  const [newExp, setNewExp] = useState(10)
  const [completing, setCompleting] = useState<{ type: "daily" | "todo"; id: number } | null>(null)
  const [toast, setToast] = useState<{ exp: number; comment: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<{
    type: "daily" | "todo"
    id: number
    name: string
  } | null>(null)

  const fetchAll = useCallback(async () => {
    try {
      const [checkRes, todoRes] = await Promise.all([
        fetch("/api/checklist"),
        fetch("/api/todos"),
      ])
      if (checkRes.ok) {
        const data = await checkRes.json()
        setDailyItems(data.items ?? [])
        setCheckedDailyIds(new Set(data.checkedIds ?? []))
      }
      if (todoRes.ok) setTodoItems(await todoRes.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  useEffect(() => {
    const incomplete = (dailyItems.length - checkedDailyIds.size) + todoItems.filter((t) => !t.is_completed).length
    onCountChange?.(incomplete)
    onDailyCompletedChange?.(checkedDailyIds.size)
  }, [dailyItems, checkedDailyIds, todoItems, onCountChange, onDailyCompletedChange])

  const showToast = (exp: number, comment: string) => {
    setToast({ exp, comment })
    setTimeout(() => setToast(null), 2500)
  }

  const completeDaily = async (item: DailyItem) => {
    if (checkedDailyIds.has(item.id) || completing) return
    setCompleting({ type: "daily", id: item.id })
    setError(null)
    try {
      const res = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "오류"); return }
      setCheckedDailyIds((prev) => new Set([...prev, item.id]))
      showToast(data.exp, data.comment)
      onExpGained?.()
    } finally {
      setCompleting(null)
    }
  }

  const completeTodo = async (item: TodoItem) => {
    if (item.is_completed || completing) return
    setCompleting({ type: "todo", id: item.id })
    setError(null)
    try {
      const res = await fetch("/api/todos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "오류"); return }
      setTodoItems((prev) =>
        prev.map((t) => t.id === item.id ? { ...t, is_completed: 1, exp_gained: data.exp } : t)
      )
      showToast(data.exp, data.comment)
      onExpGained?.()
    } finally {
      setCompleting(null)
    }
  }

  const addItem = async () => {
    if (!newName.trim() || !adding) return
    if (adding === "daily") {
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
    } else {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, suggested_exp: newExp }),
      })
      if (res.ok) setTodoItems(await res.json())
    }
    setNewName("")
    setNewExp(10)
    setAdding(null)
  }

  const confirmAndDelete = (type: "daily" | "todo", id: number, name: string) => {
    setConfirmDelete({ type, id, name })
  }

  const executeDelete = async () => {
    if (!confirmDelete) return
    const { type, id } = confirmDelete
    setConfirmDelete(null)
    if (type === "daily") {
      const res = await fetch("/api/checklist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        const data = await res.json()
        setDailyItems(data.items ?? [])
        setCheckedDailyIds((prev) => { const n = new Set(prev); n.delete(id); return n })
      }
    } else {
      const res = await fetch("/api/todos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (res.ok) setTodoItems(await res.json())
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-gray-400 text-sm">불러오는 중...</p>
      </div>
    )
  }

  const isCompletingId = completing?.id
  const isCompletingType = completing?.type

  return (
    <div className="flex flex-col gap-0 relative pb-6">
      {/* 토스트 */}
      {toast && (
        <div className="sticky top-0 z-20 mx-4 mt-2 bg-amber-400 text-white text-xs font-bold px-4 py-2 rounded-2xl shadow-lg flex justify-between items-center">
          <span className="text-sm">+{toast.exp} EXP!</span>
          <span className="opacity-90 text-right leading-snug">{toast.comment}</span>
        </div>
      )}

      {error && (
        <div className="mx-4 mt-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* ── 데일리 섹션 ─────────────────────────────────── */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">☀️</span>
          <span className="text-sm font-bold text-gray-800">오늘의 데일리</span>
          <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
            {checkedDailyIds.size} / {dailyItems.length}
          </span>
        </div>
        <button
          onClick={() => { setAdding(adding === "daily" ? null : "daily"); setNewName(""); setNewExp(10) }}
          className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center active:scale-90 transition-transform"
          aria-label="데일리 추가"
        >
          {adding === "daily" ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        </button>
      </div>

      {adding === "daily" && (
        <div className="mx-4 mb-2 flex gap-1.5">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder="데일리 항목 이름..."
            className="flex-1 text-sm bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-amber-300"
          />
          <input
            type="number"
            value={newExp}
            onChange={(e) => setNewExp(Number(e.target.value))}
            className="w-14 text-sm text-center bg-amber-50 border border-amber-200 rounded-xl px-1 py-2 outline-none"
            min={1}
          />
          <button
            onClick={addItem}
            className="px-3 py-2 bg-amber-400 text-white rounded-xl text-xs font-bold active:scale-95"
          >
            추가
          </button>
        </div>
      )}

      {dailyItems.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-4">+ 버튼으로 데일리를 추가하세요</p>
      )}

      {dailyItems.map((item) => {
        const done = checkedDailyIds.has(item.id)
        const isLoading = isCompletingType === "daily" && isCompletingId === item.id
        return (
          <div
            key={item.id}
            className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 transition-opacity ${done ? "opacity-50" : ""}`}
          >
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold leading-snug ${done ? "line-through text-gray-400" : "text-gray-800"}`}>
                {item.name}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => completeDaily(item)}
                disabled={done || !!completing}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all active:scale-95 ${
                  done
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : isLoading
                    ? "bg-amber-200 text-amber-700 animate-pulse cursor-wait"
                    : "bg-amber-100 text-amber-600 hover:bg-amber-200"
                }`}
              >
                {done ? "✓ 완료" : isLoading ? "판정 중..." : `+${item.fixed_exp} EXP`}
              </button>
              <button
                onClick={() => confirmAndDelete("daily", item.id, item.name)}
                className="text-gray-300 hover:text-red-400 transition-colors p-0.5"
                aria-label="삭제"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )
      })}

      {/* ── 할 일 섹션 ──────────────────────────────────── */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">📋</span>
          <span className="text-sm font-bold text-gray-800">할 일</span>
          {todoItems.filter((t) => !t.is_completed).length > 0 && (
            <span className="text-[11px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100">
              {todoItems.filter((t) => !t.is_completed).length}개
            </span>
          )}
        </div>
        <button
          onClick={() => { setAdding(adding === "todo" ? null : "todo"); setNewName(""); setNewExp(10) }}
          className="w-7 h-7 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center active:scale-90 transition-transform"
          aria-label="할 일 추가"
        >
          {adding === "todo" ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        </button>
      </div>

      {adding === "todo" && (
        <div className="mx-4 mb-2 flex gap-1.5">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder="할 일 이름..."
            className="flex-1 text-sm bg-violet-50 border border-violet-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300"
          />
          <input
            type="number"
            value={newExp}
            onChange={(e) => setNewExp(Number(e.target.value))}
            className="w-14 text-sm text-center bg-violet-50 border border-violet-200 rounded-xl px-1 py-2 outline-none"
            min={1}
          />
          <button
            onClick={addItem}
            className="px-3 py-2 bg-violet-500 text-white rounded-xl text-xs font-bold active:scale-95"
          >
            추가
          </button>
        </div>
      )}

      {todoItems.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-4">+ 버튼으로 할 일을 추가하세요</p>
      )}

      {todoItems.map((item) => {
        const done = !!item.is_completed
        const isLoading = isCompletingType === "todo" && isCompletingId === item.id
        return (
          <div
            key={item.id}
            className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 transition-opacity ${done ? "opacity-50" : ""}`}
          >
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold leading-snug ${done ? "line-through text-gray-400" : "text-gray-800"}`}>
                {item.name}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => completeTodo(item)}
                disabled={done || !!completing}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all active:scale-95 ${
                  done
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : isLoading
                    ? "bg-violet-200 text-violet-700 animate-pulse cursor-wait"
                    : "bg-violet-100 text-violet-600 hover:bg-violet-200"
                }`}
              >
                {done ? "✓ 완료" : isLoading ? "판정 중..." : `+${item.suggested_exp} EXP`}
              </button>
              <button
                onClick={() => confirmAndDelete("todo", item.id, item.name)}
                className="text-gray-300 hover:text-red-400 transition-colors p-0.5"
                aria-label="삭제"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )
      })}

      {/* ── 삭제 확인 바텀시트 ──────────────────────────── */}
      {confirmDelete && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-30"
            onClick={() => setConfirmDelete(null)}
          />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-white rounded-t-3xl z-40 px-6 py-6 shadow-2xl">
            <p className="text-sm font-bold text-gray-800 text-center mb-1">
              항목을 삭제하시겠습니까?
            </p>
            <p className="text-xs text-gray-500 text-center mb-5">
              &ldquo;{confirmDelete.name}&rdquo;
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-600 font-bold text-sm active:scale-95"
              >
                취소
              </button>
              <button
                onClick={executeDelete}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold text-sm active:scale-95"
              >
                삭제
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
