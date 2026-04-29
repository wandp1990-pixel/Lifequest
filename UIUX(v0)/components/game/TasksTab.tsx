"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, X, ChevronDown, GripVertical, Clock, Pencil } from "lucide-react"

interface DailyItem {
  id: number
  name: string
  fixed_exp: number
  streak?: number
  best_streak?: number
}

interface TodoItem {
  id: number
  name: string
  suggested_exp: number
  is_completed: number
  exp_gained?: number
  ai_comment?: string
}

interface RoutineItem {
  id: number
  routine_id: number
  name: string
  fixed_exp: number
}

interface Routine {
  id: number
  name: string
  deadline_time: string | null
  items: RoutineItem[]
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
  const [routines, setRoutines] = useState<Routine[]>([])
  const [checkedRoutineItemIds, setCheckedRoutineItemIds] = useState<Set<number>>(new Set())
  const [bonusRoutineIds, setBonusRoutineIds] = useState<Set<number>>(new Set())
  const [expandedRoutineIds, setExpandedRoutineIds] = useState<Set<number>>(new Set())
  const [addingItemFor, setAddingItemFor] = useState<number | null>(null)
  const [newItemName, setNewItemName] = useState("")
  const [newItemExp, setNewItemExp] = useState(10)
  const [editingDeadlineFor, setEditingDeadlineFor] = useState<number | null>(null)
  const [deadlineInputVal, setDeadlineInputVal] = useState("")
  const [adding, setAdding] = useState<"daily" | "todo" | "routine" | null>(null)
  const [newName, setNewName] = useState("")
  const [newExp, setNewExp] = useState(10)
  const [completing, setCompleting] = useState<{ type: "daily" | "todo" | "routine"; id: number } | null>(null)
  const [editingExpId, setEditingExpId] = useState<number | null>(null)
  const [editingExpVal, setEditingExpVal] = useState(0)
  const [editingTodoNameId, setEditingTodoNameId] = useState<number | null>(null)
  const [editingTodoNameVal, setEditingTodoNameVal] = useState("")
  const [editingDailyNameId, setEditingDailyNameId] = useState<number | null>(null)
  const [editingDailyNameVal, setEditingDailyNameVal] = useState("")
  const [editingRoutineNameId, setEditingRoutineNameId] = useState<number | null>(null)
  const [editingRoutineNameVal, setEditingRoutineNameVal] = useState("")
  const [editingRoutineItemNameId, setEditingRoutineItemNameId] = useState<number | null>(null)
  const [editingRoutineItemNameVal, setEditingRoutineItemNameVal] = useState("")
  const [completedTodoCount, setCompletedTodoCount] = useState(0)
  const [toast, setToast] = useState<{ exp: number; comment: string; bonus?: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [draggingItemId, setDraggingItemId] = useState<number | null>(null)
  const [dragOverItemId, setDragOverItemId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{
    type: "daily" | "todo" | "routine" | "routineItem"
    id: number
    name: string
  } | null>(null)

  const saveDeadline = async (routineId: number, deadlineTime: string | null) => {
    const res = await fetch("/api/routines", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "updateDeadline", routineId, deadlineTime }),
    })
    if (res.ok) {
      const data = await res.json()
      setRoutines(data.routines ?? [])
    }
    setEditingDeadlineFor(null)
  }

  const fetchAll = useCallback(async () => {
    try {
      const [checkRes, todoRes, routineRes] = await Promise.all([
        fetch("/api/checklist"),
        fetch("/api/todos"),
        fetch("/api/routines"),
      ])
      if (checkRes.ok) {
        const data = await checkRes.json()
        setDailyItems(data.items ?? [])
        setCheckedDailyIds(new Set(data.checkedIds ?? []))
      }
      if (todoRes.ok) {
        const items = await todoRes.json()
        setTodoItems(items)
        setCompletedTodoCount(items.filter((t: TodoItem) => t.is_completed).length)
      }
      if (routineRes.ok) {
        const data = await routineRes.json()
        setRoutines(data.routines ?? [])
        setCheckedRoutineItemIds(new Set(data.checkedItemIds ?? []))
        setBonusRoutineIds(new Set(data.bonusRoutineIds ?? []))
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // KST 자정 넘어가면 완료된 할 일 제거를 위해 재조회
  useEffect(() => {
    const kstNow = () => new Date(Date.now() + 9 * 60 * 60 * 1000)
    const msUntilMidnight = () => {
      const n = kstNow()
      return (24 * 60 * 60 * 1000) - (n.getUTCHours() * 3600 + n.getUTCMinutes() * 60 + n.getUTCSeconds()) * 1000 - n.getUTCMilliseconds()
    }
    const timer = setTimeout(() => { fetchAll() }, msUntilMidnight())
    return () => clearTimeout(timer)
  }, [fetchAll])

  useEffect(() => {
    const routineTotal = routines.reduce((sum, r) => sum + r.items.length, 0)
    const routineDone = routines.reduce(
      (sum, r) => sum + r.items.filter((it) => checkedRoutineItemIds.has(it.id)).length,
      0,
    )
    // 현재 존재하는 항목 중 완료된 것만 셈 (삭제된 항목의 stale ID 제외)
    const checkedExisting = dailyItems.filter((item) => checkedDailyIds.has(item.id)).length
    const incomplete =
      (dailyItems.length - checkedExisting) +
      todoItems.filter((t) => !t.is_completed).length +
      (routineTotal - routineDone)
    onCountChange?.(incomplete)
    // totalDone: 완료 후 삭제해도 달성 수 유지 (daily=checkedDailyIds.size, todo=completedTodoCount)
    const totalDone = checkedDailyIds.size + routineDone + completedTodoCount
    onDailyCompletedChange?.(totalDone)
  }, [dailyItems, checkedDailyIds, todoItems, routines, checkedRoutineItemIds, completedTodoCount, onCountChange, onDailyCompletedChange])

  const showToast = (exp: number, comment: string, bonus?: number) => {
    setToast({ exp, comment, bonus })
    setTimeout(() => setToast(null), 3000)
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
      setDailyItems((prev) =>
        prev.map((d) => d.id === item.id ? { ...d, streak: data.streak } : d)
      )
      showToast(data.exp, data.comment, data.bonusExp > 0 ? data.bonusExp : undefined)
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
      setCompletedTodoCount((prev) => prev + 1)
      showToast(data.exp, data.comment)
      onExpGained?.()
    } finally {
      setCompleting(null)
    }
  }

  const completeRoutineItem = async (item: RoutineItem) => {
    if (checkedRoutineItemIds.has(item.id) || completing) return
    setCompleting({ type: "routine", id: item.id })
    setError(null)
    try {
      const res = await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "오류"); return }
      setCheckedRoutineItemIds((prev) => new Set([...prev, item.id]))
      if (data.allDone && data.bonusExp > 0) {
        setBonusRoutineIds((prev) => new Set([...prev, item.routine_id]))
        const comment = data.deadlineBonus
          ? `⏰ 마감 전 달성! 🎉 ${data.routineName} 완수!`
          : `🎉 ${data.routineName} 완수!`
        showToast(data.exp, comment, data.bonusExp)
      } else {
        showToast(data.exp, "루틴 항목 완료")
      }
      onExpGained?.()
    } finally {
      setCompleting(null)
    }
  }

  const toggleRoutine = (id: number) => {
    setExpandedRoutineIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const handleItemDragStart = (e: React.DragEvent, itemId: number) => {
    setDraggingItemId(itemId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleItemDragOver = (e: React.DragEvent, itemId: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverItemId(itemId)
  }

  const handleItemDrop = async (e: React.DragEvent, targetItemId: number, routineId: number) => {
    e.preventDefault()
    const fromId = draggingItemId
    setDraggingItemId(null)
    setDragOverItemId(null)
    if (!fromId || fromId === targetItemId) return

    const routine = routines.find((r) => r.id === routineId)
    if (!routine) return

    const items = [...routine.items]
    const fromIdx = items.findIndex((it) => it.id === fromId)
    const toIdx = items.findIndex((it) => it.id === targetItemId)
    if (fromIdx < 0 || toIdx < 0) return

    const [moved] = items.splice(fromIdx, 1)
    items.splice(toIdx, 0, moved)
    const orderedItemIds = items.map((it) => it.id)

    setRoutines((prev) => prev.map((r) => r.id === routineId ? { ...r, items } : r))

    await fetch("/api/routines", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reorderItems", routineId, orderedItemIds }),
    })
  }

  const handleItemDragEnd = () => {
    setDraggingItemId(null)
    setDragOverItemId(null)
  }

  const addRoutine = async () => {
    if (!newName.trim()) return
    const res = await fetch("/api/routines", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "addRoutine", name: newName.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      setRoutines(data.routines ?? [])
      setCheckedRoutineItemIds(new Set(data.checkedItemIds ?? []))
      setBonusRoutineIds(new Set(data.bonusRoutineIds ?? []))
      if (typeof data.createdRoutineId === "number") {
        setExpandedRoutineIds((prev) => new Set([...prev, data.createdRoutineId]))
      }
    }
    setNewName("")
    setAdding(null)
  }

  const addRoutineItemSubmit = async (routineId: number) => {
    if (!newItemName.trim()) return
    const res = await fetch("/api/routines", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "addItem",
        routineId,
        name: newItemName.trim(),
        fixedExp: newItemExp,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setRoutines(data.routines ?? [])
      setCheckedRoutineItemIds(new Set(data.checkedItemIds ?? []))
      setBonusRoutineIds(new Set(data.bonusRoutineIds ?? []))
    }
    setNewItemName("")
    setNewItemExp(10)
    setAddingItemFor(null)
  }

  const addItem = async () => {
    if (adding === "routine") return addRoutine()
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

  const saveEditingExp = async (id: number) => {
    const res = await fetch("/api/todos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, suggested_exp: editingExpVal }),
    })
    if (res.ok) setTodoItems(await res.json())
    setEditingExpId(null)
  }

  const saveTodoName = async (id: number) => {
    if (!editingTodoNameVal.trim()) return
    const res = await fetch("/api/todos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: editingTodoNameVal }),
    })
    if (res.ok) setTodoItems(await res.json())
    setEditingTodoNameId(null)
  }

  const saveDailyName = async (id: number) => {
    if (!editingDailyNameVal.trim()) return
    const res = await fetch("/api/checklist", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: editingDailyNameVal }),
    })
    if (res.ok) {
      const data = await res.json()
      setDailyItems(data.items ?? [])
    }
    setEditingDailyNameId(null)
  }

  const saveRoutineName = async (routineId: number) => {
    if (!editingRoutineNameVal.trim()) return
    const res = await fetch("/api/routines", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "updateRoutineName", routineId, name: editingRoutineNameVal }),
    })
    if (res.ok) {
      const data = await res.json()
      setRoutines(data.routines ?? [])
    }
    setEditingRoutineNameId(null)
  }

  const saveRoutineItemName = async (itemId: number) => {
    if (!editingRoutineItemNameVal.trim()) return
    const res = await fetch("/api/routines", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "updateItemName", itemId, name: editingRoutineItemNameVal }),
    })
    if (res.ok) {
      const data = await res.json()
      setRoutines(data.routines ?? [])
    }
    setEditingRoutineItemNameId(null)
  }

  const confirmAndDelete = (
    type: "daily" | "todo" | "routine" | "routineItem",
    id: number,
    name: string,
  ) => {
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
        // checkedDailyIds는 건드리지 않음 — 완료 후 삭제해도 달성 수 유지
      }
    } else if (type === "todo") {
      const res = await fetch("/api/todos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (res.ok) setTodoItems(await res.json())
    } else {
      const action = type === "routine" ? "deleteRoutine" : "deleteItem"
      const res = await fetch("/api/routines", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id }),
      })
      if (res.ok) {
        const data = await res.json()
        setRoutines(data.routines ?? [])
        setCheckedRoutineItemIds(new Set(data.checkedItemIds ?? []))
        setBonusRoutineIds(new Set(data.bonusRoutineIds ?? []))
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground text-sm">불러오는 중...</p>
      </div>
    )
  }

  const isCompletingId = completing?.id
  const isCompletingType = completing?.type

  return (
    <div className="flex flex-col gap-0 relative pb-6">
      {/* 토스트 */}
      {toast && (
        <div className="sticky top-0 z-20 mx-4 mt-2 bg-amber-400 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-lg flex flex-col gap-0.5">
          <span className="text-sm">
            +{toast.exp} EXP{toast.bonus ? ` · 보너스 +${toast.bonus}` : "!"}
          </span>
          <span className="opacity-90 font-normal leading-snug">{toast.comment}</span>
        </div>
      )}

      {error && (
        <div className="mx-4 mt-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* ── 루틴 섹션 ───────────────────────────────────── */}
      <div className="px-4 py-3 flex items-center justify-between bg-teal-50 dark:bg-teal-900/30 border-y border-teal-100 dark:border-teal-800/50">
        <div className="flex items-center gap-2">
          <span className="text-sm">🔁</span>
          <span className="text-sm font-bold text-foreground">루틴</span>
          {routines.length > 0 && (
            <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/40 px-2 py-0.5 rounded-full border border-teal-100 dark:border-teal-700/50">
              {routines.length}개
            </span>
          )}
        </div>
        <button
          onClick={() => { setAdding(adding === "routine" ? null : "routine"); setNewName(""); setNewExp(10) }}
          className="w-7 h-7 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center active:scale-90 transition-transform"
          aria-label="루틴 추가"
        >
          {adding === "routine" ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        </button>
      </div>

      {adding === "routine" && (
        <div className="mx-4 mt-2 mb-2 flex gap-1.5">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addRoutine()}
            placeholder="루틴 이름 (예: 아침 루틴)"
            className="flex-1 text-sm bg-teal-50 border border-teal-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-teal-300"
          />
          <button
            onClick={addRoutine}
            className="px-3 py-2 bg-teal-500 text-white rounded-xl text-sm font-bold active:scale-95"
          >
            추가
          </button>
        </div>
      )}

      {routines.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-4">+ 버튼으로 루틴을 추가하세요</p>
      )}

      {routines.map((r) => {
        const total = r.items.length
        const checked = r.items.filter((it) => checkedRoutineItemIds.has(it.id)).length
        const totalExp = r.items.reduce((s, it) => s + it.fixed_exp, 0)
        const bonusGranted = bonusRoutineIds.has(r.id)
        const expanded = expandedRoutineIds.has(r.id)
        const isAddingItem = addingItemFor === r.id
        return (
          <div key={r.id} className="mx-4 mt-2 bg-background border border-teal-100 rounded-2xl overflow-hidden">
            {editingRoutineNameId === r.id ? (
              <div className="flex items-center gap-1.5 px-4 py-3">
                <input
                  autoFocus
                  type="text"
                  value={editingRoutineNameVal}
                  onChange={(e) => setEditingRoutineNameVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveRoutineName(r.id); if (e.key === "Escape") setEditingRoutineNameId(null) }}
                  className="flex-1 min-w-0 text-sm bg-teal-50 border border-teal-300 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-teal-300"
                />
                <button
                  onClick={() => saveRoutineName(r.id)}
                  className="text-[10px] font-bold text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded-full active:scale-95 flex-shrink-0"
                >
                  저장
                </button>
                <button onClick={() => setEditingRoutineNameId(null)} className="text-muted-foreground flex-shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => toggleRoutine(r.id)}
                className="w-full flex items-center justify-between px-4 py-3 active:bg-teal-50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-bold text-foreground truncate">{r.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingRoutineNameId(r.id); setEditingRoutineNameVal(r.name) }}
                    className="text-gray-300 hover:text-teal-400 transition-colors flex-shrink-0 p-0.5"
                    aria-label="루틴 이름 수정"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <span className="text-[11px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100 flex-shrink-0">
                    {checked}/{total}
                  </span>
                  {r.deadline_time && !bonusGranted && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded-full border border-sky-100 flex-shrink-0">
                      <Clock className="w-2.5 h-2.5" />{r.deadline_time}까지 2배
                    </span>
                  )}
                  {bonusGranted && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 flex-shrink-0">
                      🎉 +{totalExp} EXP
                    </span>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${expanded ? "rotate-180" : ""}`} />
              </button>
            )}

            {expanded && (
              <div className="border-t border-teal-100">
                {r.items.length === 0 && !isAddingItem && (
                  <p className="text-center text-muted-foreground text-xs py-3">하위 항목을 추가하세요</p>
                )}
                {r.items.map((item) => {
                  const done = checkedRoutineItemIds.has(item.id)
                  const isLoading = completing?.type === "routine" && completing?.id === item.id
                  const isDragOver = dragOverItemId === item.id && draggingItemId !== item.id
                  const isEditingItemName = editingRoutineItemNameId === item.id
                  return (
                    <div
                      key={item.id}
                      onDragOver={(e) => handleItemDragOver(e, item.id)}
                      onDrop={(e) => handleItemDrop(e, item.id, r.id)}
                      className={`flex items-center gap-2 px-3 py-2.5 border-b border-teal-50 last:border-b-0 transition-colors ${done ? "opacity-50" : ""} ${isDragOver ? "bg-teal-50" : ""} ${draggingItemId === item.id ? "opacity-30" : ""}`}
                    >
                      <div
                        draggable
                        onDragStart={(e) => handleItemDragStart(e, item.id)}
                        onDragEnd={handleItemDragEnd}
                        className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
                        aria-label="순서 변경"
                      >
                        <GripVertical className="w-4 h-4 text-gray-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {isEditingItemName ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              autoFocus
                              type="text"
                              value={editingRoutineItemNameVal}
                              onChange={(e) => setEditingRoutineItemNameVal(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") saveRoutineItemName(item.id); if (e.key === "Escape") setEditingRoutineItemNameId(null) }}
                              className="flex-1 min-w-0 text-sm bg-teal-50 border border-teal-300 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-teal-300"
                            />
                            <button
                              onClick={() => saveRoutineItemName(item.id)}
                              className="text-[10px] font-bold text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded-full active:scale-95 flex-shrink-0"
                            >
                              저장
                            </button>
                            <button onClick={() => setEditingRoutineItemNameId(null)} className="text-muted-foreground flex-shrink-0">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className={`text-sm leading-snug truncate ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {item.name}
                            </p>
                            {!done && (
                              <button
                                onClick={() => { setEditingRoutineItemNameId(item.id); setEditingRoutineItemNameVal(item.name) }}
                                className="text-gray-300 hover:text-teal-400 transition-colors flex-shrink-0 p-0.5"
                                aria-label="항목 이름 수정"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => completeRoutineItem(item)}
                          disabled={done || !!completing}
                          className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all active:scale-95 ${
                            done
                              ? "bg-muted text-muted-foreground cursor-not-allowed"
                              : isLoading
                              ? "bg-teal-200 text-teal-700 animate-pulse cursor-wait"
                              : "bg-teal-100 text-teal-600 hover:bg-teal-200"
                          }`}
                        >
                          {done ? "✓ 완료" : isLoading ? "처리 중..." : `+${item.fixed_exp} EXP`}
                        </button>
                        <button
                          onClick={() => confirmAndDelete("routineItem", item.id, item.name)}
                          className="text-gray-300 hover:text-red-400 transition-colors p-0.5"
                          aria-label="항목 삭제"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}

                {isAddingItem ? (
                  <div className="px-4 py-2 flex gap-1.5 bg-teal-50/50">
                    <input
                      autoFocus
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addRoutineItemSubmit(r.id)}
                      placeholder="항목 이름..."
                      className="flex-1 min-w-0 text-sm bg-background border border-teal-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-teal-300"
                    />
                    <input
                      type="number"
                      value={newItemExp}
                      onChange={(e) => setNewItemExp(Number(e.target.value))}
                      className="w-14 text-sm text-center bg-background border border-teal-200 rounded-xl px-1 py-2 outline-none"
                      min={1}
                    />
                    <button
                      onClick={() => addRoutineItemSubmit(r.id)}
                      className="px-3 py-2 bg-teal-500 text-white rounded-xl text-sm font-bold active:scale-95"
                    >
                      추가
                    </button>
                    <button
                      onClick={() => { setAddingItemFor(null); setNewItemName(""); setNewItemExp(10) }}
                      className="text-muted-foreground px-1"
                      aria-label="취소"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="bg-teal-50/30">
                    {editingDeadlineFor === r.id ? (
                      <div className="px-4 py-2 flex flex-wrap items-center gap-2">
                        <Clock className="w-3 h-3 text-sky-400 flex-shrink-0" />
                        <input
                          autoFocus
                          type="time"
                          value={deadlineInputVal}
                          onChange={(e) => setDeadlineInputVal(e.target.value)}
                          className="text-xs bg-background border border-sky-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-sky-300"
                        />
                        <button
                          onClick={() => saveDeadline(r.id, deadlineInputVal || null)}
                          className="text-xs font-bold text-sky-600 bg-sky-50 border border-sky-200 px-2 py-1 rounded-lg active:scale-95"
                        >
                          저장
                        </button>
                        {r.deadline_time && (
                          <button
                            onClick={() => saveDeadline(r.id, null)}
                            className="text-xs text-muted-foreground active:scale-95"
                          >
                            제거
                          </button>
                        )}
                        <button
                          onClick={() => setEditingDeadlineFor(null)}
                          className="text-muted-foreground active:scale-95"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-4 py-2">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => { setAddingItemFor(r.id); setNewItemName(""); setNewItemExp(10) }}
                            className="text-xs font-bold text-teal-600 flex items-center gap-1 active:scale-95"
                          >
                            <Plus className="w-3 h-3" /> 항목 추가
                          </button>
                          <button
                            onClick={() => { setEditingDeadlineFor(r.id); setDeadlineInputVal(r.deadline_time ?? "") }}
                            className="flex items-center gap-1 text-xs text-sky-500 active:scale-95"
                          >
                            <Clock className="w-3 h-3 text-sky-400 flex-shrink-0" />
                            {r.deadline_time ? `${r.deadline_time}까지 2배` : "마감 시간"}
                          </button>
                        </div>
                        <button
                          onClick={() => confirmAndDelete("routine", r.id, r.name)}
                          className="text-xs text-red-400 hover:text-red-500 active:scale-95"
                        >
                          루틴 삭제
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* ── 습관 섹션 ─────────────────────────────────── */}
      <div className="px-4 py-3 flex items-center justify-between bg-amber-50 dark:bg-amber-900/30 border-y border-amber-100 dark:border-amber-800/50 mt-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">☀️</span>
          <span className="text-sm font-bold text-foreground">습관</span>
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/40 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-700/50">
            {dailyItems.filter(item => checkedDailyIds.has(item.id)).length} / {dailyItems.length}
          </span>
        </div>
        <button
          onClick={() => { setAdding(adding === "daily" ? null : "daily"); setNewName(""); setNewExp(10) }}
          className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center active:scale-90 transition-transform"
          aria-label="습관 추가"
        >
          {adding === "daily" ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        </button>
      </div>

      {adding === "daily" && (
        <div className="mx-4 mt-2 mb-2 flex gap-1.5">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder="습관 이름..."
            className="flex-1 min-w-0 text-sm bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-amber-300"
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
            className="px-3 py-2 bg-amber-400 text-white rounded-xl text-sm font-bold active:scale-95"
          >
            추가
          </button>
        </div>
      )}

      {dailyItems.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-4">+ 버튼으로 습관을 추가하세요</p>
      )}

      {dailyItems.map((item) => {
        const done = checkedDailyIds.has(item.id)
        const isLoading = isCompletingType === "daily" && isCompletingId === item.id
        const streak = item.streak ?? 0
        const streakColor =
          streak >= 100 ? "text-yellow-600 bg-yellow-50 border-yellow-200" :
          streak >= 30  ? "text-red-600 bg-red-50 border-red-200" :
          streak >= 7   ? "text-orange-600 bg-orange-50 border-orange-200" :
          streak >= 1   ? "text-orange-500 bg-orange-50 border-orange-100" :
                          "text-muted-foreground bg-muted border-border"
        const isEditingName = editingDailyNameId === item.id
        return (
          <div
            key={item.id}
            className={`flex items-center gap-3 px-4 py-3 border-b border-border transition-opacity ${done ? "opacity-50" : ""}`}
          >
            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    type="text"
                    value={editingDailyNameVal}
                    onChange={(e) => setEditingDailyNameVal(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveDailyName(item.id); if (e.key === "Escape") setEditingDailyNameId(null) }}
                    className="flex-1 min-w-0 text-sm bg-amber-50 border border-amber-300 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-amber-300"
                  />
                  <button
                    onClick={() => saveDailyName(item.id)}
                    className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full active:scale-95 flex-shrink-0"
                  >
                    저장
                  </button>
                  <button onClick={() => setEditingDailyNameId(null)} className="text-muted-foreground flex-shrink-0">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className={`text-sm font-semibold leading-snug truncate ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {item.name}
                  </p>
                  {!done && (
                    <button
                      onClick={() => { setEditingDailyNameId(item.id); setEditingDailyNameVal(item.name) }}
                      className="text-gray-300 hover:text-amber-400 transition-colors flex-shrink-0 p-0.5"
                      aria-label="이름 수정"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
              {!isEditingName && (
                <span className={`inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${streakColor}`}>
                  {streak >= 1 ? `🔥 ${streak}/100일` : "0/100일"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => completeDaily(item)}
                disabled={done || !!completing}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all active:scale-95 ${
                  done
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : isLoading
                    ? "bg-amber-200 text-amber-700 animate-pulse cursor-wait"
                    : "bg-amber-100 text-amber-600 hover:bg-amber-200"
                }`}
              >
                {done ? "✓ 완료" : isLoading ? "처리 중..." : `+${item.fixed_exp} EXP`}
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
      <div className="px-4 py-3 flex items-center justify-between bg-violet-50 dark:bg-violet-900/30 border-y border-violet-100 dark:border-violet-800/50 mt-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">📋</span>
          <span className="text-sm font-bold text-foreground">할 일</span>
          {todoItems.filter((t) => !t.is_completed).length > 0 && (
            <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/40 px-2 py-0.5 rounded-full border border-violet-100 dark:border-violet-700/50">
              {todoItems.filter((t) => !t.is_completed).length}개
            </span>
          )}
        </div>
        <button
          onClick={() => { setAdding(adding === "todo" ? null : "todo"); setNewName(""); setNewExp(0) }}
          className="w-7 h-7 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center active:scale-90 transition-transform"
          aria-label="할 일 추가"
        >
          {adding === "todo" ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        </button>
      </div>

      {adding === "todo" && (
        <div className="mx-4 mt-2 mb-2 flex gap-1.5">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder="할 일 이름..."
            className="flex-1 min-w-0 text-sm bg-violet-50 border border-violet-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300"
          />
          <input
            type="number"
            value={newExp}
            onChange={(e) => setNewExp(Number(e.target.value))}
            className="w-14 text-sm text-center bg-violet-50 border border-violet-200 rounded-xl px-1 py-2 outline-none"
            min={0}
          />
          <button
            onClick={addItem}
            className="px-3 py-2 bg-violet-500 text-white rounded-xl text-sm font-bold active:scale-95"
          >
            추가
          </button>
        </div>
      )}

      {todoItems.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-4">+ 버튼으로 할 일을 추가하세요</p>
      )}

      {todoItems.map((item) => {
        const done = !!item.is_completed
        const isLoading = isCompletingType === "todo" && isCompletingId === item.id
        const isEditingExp = editingExpId === item.id
        const isEditingName = editingTodoNameId === item.id
        return (
          <div
            key={item.id}
            className={`flex items-center gap-3 px-4 py-3 border-b border-border transition-opacity ${done ? "opacity-50" : ""}`}
          >
            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    type="text"
                    value={editingTodoNameVal}
                    onChange={(e) => setEditingTodoNameVal(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveTodoName(item.id); if (e.key === "Escape") setEditingTodoNameId(null) }}
                    className="flex-1 min-w-0 text-sm bg-violet-50 border border-violet-300 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-violet-300"
                  />
                  <button
                    onClick={() => saveTodoName(item.id)}
                    className="text-[10px] font-bold text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded-full active:scale-95 flex-shrink-0"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => setEditingTodoNameId(null)}
                    className="text-muted-foreground flex-shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className={`text-sm font-semibold leading-snug truncate ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {item.name}
                  </p>
                  {!done && (
                    <button
                      onClick={() => { setEditingTodoNameId(item.id); setEditingTodoNameVal(item.name) }}
                      className="text-gray-300 hover:text-violet-400 transition-colors flex-shrink-0 p-0.5"
                      aria-label="이름 수정"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
              {!done && !isEditingName && (
                isEditingExp ? (
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      autoFocus
                      type="number"
                      min={0}
                      value={editingExpVal}
                      onChange={(e) => setEditingExpVal(Number(e.target.value))}
                      onKeyDown={(e) => { if (e.key === "Enter") saveEditingExp(item.id); if (e.key === "Escape") setEditingExpId(null) }}
                      className="w-16 text-xs text-center bg-violet-50 border border-violet-300 rounded-lg px-1.5 py-0.5 outline-none"
                    />
                    <span className="text-[10px] text-muted-foreground">EXP</span>
                    <button
                      onClick={() => saveEditingExp(item.id)}
                      className="text-[10px] font-bold text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded-full active:scale-95"
                    >
                      확인
                    </button>
                    <button
                      onClick={() => setEditingExpId(null)}
                      className="text-[10px] text-muted-foreground active:scale-95"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingExpId(item.id); setEditingExpVal(item.suggested_exp ?? 0) }}
                    className="mt-0.5 text-[10px] font-bold text-violet-500 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-full active:scale-95"
                  >
                    {(item.suggested_exp ?? 0) === 0 ? "🤖 AI 판정" : `+${item.suggested_exp} EXP`}
                  </button>
                )
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => completeTodo(item)}
                disabled={done || !!completing}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all active:scale-95 ${
                  done
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : isLoading
                    ? "bg-violet-200 text-violet-700 animate-pulse cursor-wait"
                    : "bg-violet-100 text-violet-600 hover:bg-violet-200"
                }`}
              >
                {done ? "✓" : isLoading ? "..." : "완료"}
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
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-background rounded-t-3xl z-40 px-6 py-6 shadow-2xl">
            <p className="text-sm font-bold text-foreground text-center mb-1">
              항목을 삭제하시겠습니까?
            </p>
            <p className="text-xs text-muted-foreground text-center mb-5">
              &ldquo;{confirmDelete.name}&rdquo;
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 rounded-2xl bg-muted text-muted-foreground font-bold text-sm active:scale-95"
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
