"use client"

import { useState, Dispatch, SetStateAction } from "react"
import { Plus, X, ChevronDown, GripVertical, Clock, Pencil } from "lucide-react"

export interface RoutineItem {
  id: number
  routine_id: number
  name: string
  fixed_exp: number
}

export interface Routine {
  id: number
  name: string
  deadline_time: string | null
  chapter_id: number | null
  items: RoutineItem[]
}

export interface RoutineChapter {
  id: number
  name: string
}

type DeleteTarget =
  | { type: "routine"; id: number; name: string }
  | { type: "routineItem"; id: number; name: string }

interface RoutineSectionProps {
  routines: Routine[]
  setRoutines: Dispatch<SetStateAction<Routine[]>>
  checkedRoutineItemIds: Set<number>
  setCheckedRoutineItemIds: Dispatch<SetStateAction<Set<number>>>
  bonusRoutineIds: Set<number>
  setBonusRoutineIds: Dispatch<SetStateAction<Set<number>>>
  onToast: (exp: number, comment: string, bonus?: number) => void
  onConfirmDelete: (target: DeleteTarget) => void
  onExpGained?: () => void
  chapters?: RoutineChapter[]
}

export default function RoutineSection({
  routines,
  setRoutines,
  checkedRoutineItemIds,
  setCheckedRoutineItemIds,
  bonusRoutineIds,
  setBonusRoutineIds,
  onToast,
  onConfirmDelete,
  onExpGained,
  chapters = [],
}: RoutineSectionProps) {
  const [completing, setCompleting] = useState<number | null>(null)
  const [expandedRoutineIds, setExpandedRoutineIds] = useState<Set<number>>(new Set())
  const [addingRoutine, setAddingRoutine] = useState(false)
  const [newRoutineName, setNewRoutineName] = useState("")
  const [addingItemFor, setAddingItemFor] = useState<number | null>(null)
  const [newItemName, setNewItemName] = useState("")
  const [newItemExp, setNewItemExp] = useState(10)
  const [editingDeadlineFor, setEditingDeadlineFor] = useState<number | null>(null)
  const [deadlineInputVal, setDeadlineInputVal] = useState("")
  const [editingRoutineNameId, setEditingRoutineNameId] = useState<number | null>(null)
  const [editingRoutineNameVal, setEditingRoutineNameVal] = useState("")
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [editingItemName, setEditingItemName] = useState("")
  const [editingItemExp, setEditingItemExp] = useState(10)
  const [draggingItemId, setDraggingItemId] = useState<number | null>(null)
  const [dragOverItemId, setDragOverItemId] = useState<number | null>(null)
  const [newRoutineChapterId, setNewRoutineChapterId] = useState<number | null>(null)
  const [editingChapterFor, setEditingChapterFor] = useState<number | null>(null)

  const refreshRoutines = async () => {
    const res = await fetch("/api/routines")
    if (res.ok) {
      const data = await res.json()
      setRoutines(data.routines ?? [])
      setCheckedRoutineItemIds(new Set(data.checkedItemIds ?? []))
      setBonusRoutineIds(new Set(data.bonusRoutineIds ?? []))
    }
  }

  const addRoutine = async () => {
    if (!newRoutineName.trim()) return
    const res = await fetch("/api/routines", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "addRoutine", name: newRoutineName.trim(), chapterId: newRoutineChapterId }),
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
    setNewRoutineName("")
    setNewRoutineChapterId(null)
    setAddingRoutine(false)
  }

  const saveRoutineChapter = async (routineId: number, chapterId: number | null) => {
    const res = await fetch("/api/routines", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "updateChapter", routineId, chapterId }),
    })
    if (res.ok) {
      const data = await res.json()
      setRoutines(data.routines ?? [])
    }
    setEditingChapterFor(null)
  }

  const addRoutineItem = async (routineId: number) => {
    if (!newItemName.trim()) return
    const res = await fetch("/api/routines", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "addItem", routineId, name: newItemName.trim(), fixedExp: newItemExp }),
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

  const saveItemName = async (itemId: number) => {
    if (!editingItemName.trim()) return
    const res = await fetch("/api/routines", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "updateItemName", itemId, name: editingItemName, fixedExp: editingItemExp }),
    })
    if (res.ok) {
      const data = await res.json()
      setRoutines(data.routines ?? [])
    }
    setEditingItemId(null)
  }

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

  const completeRoutineItem = async (item: RoutineItem) => {
    if (checkedRoutineItemIds.has(item.id) || completing !== null) return
    setCompleting(item.id)
    try {
      const res = await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      })
      const data = await res.json()
      if (!res.ok) return
      setCheckedRoutineItemIds((prev) => new Set([...prev, item.id]))
      if (data.allDone && data.bonusExp > 0) {
        setBonusRoutineIds((prev) => new Set([...prev, item.routine_id]))
        const comment = data.deadlineBonus
          ? `⏰ 마감 전 달성! 🎉 ${data.routineName} 완수!`
          : `🎉 ${data.routineName} 완수!`
        onToast(data.exp, comment, data.bonusExp)
      } else {
        onToast(data.exp, "루틴 항목 완료")
      }
      onExpGained?.()
    } finally {
      setCompleting(null)
    }
  }

  const toggleRoutine = (id: number) => {
    setExpandedRoutineIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const handleDragStart = (e: React.DragEvent, itemId: number) => {
    setDraggingItemId(itemId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, itemId: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverItemId(itemId)
  }

  const handleDrop = async (e: React.DragEvent, targetItemId: number, routineId: number) => {
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
    setRoutines((prev) => prev.map((r) => r.id === routineId ? { ...r, items } : r))

    await fetch("/api/routines", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reorderItems", routineId, orderedItemIds: items.map((it) => it.id) }),
    })
  }

  return (
    <>
      <div className="mx-4 mt-3 rounded-2xl border border-teal-100 overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between bg-teal-50 dark:bg-teal-900/30">
          <div className="flex items-center gap-2">
            <span className="text-sm">🔁</span>
            <span className="text-sm font-bold text-foreground">루틴</span>
          </div>
          <button
            onClick={() => { setAddingRoutine(!addingRoutine); setNewRoutineName("") }}
            className="w-7 h-7 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center active:scale-90 transition-transform"
            aria-label="루틴 추가"
          >
            {addingRoutine ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {addingRoutine && (
        <div className="mx-4 mt-2 mb-2 space-y-1.5">
          <div className="flex gap-1.5">
            <input autoFocus type="text" value={newRoutineName}
              onChange={(e) => setNewRoutineName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addRoutine()}
              placeholder="루틴 이름 (예: 아침 루틴)"
              className="flex-1 text-sm text-gray-900 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-700 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-teal-300"
            />
            <button onClick={addRoutine} className="px-3 py-2 bg-teal-500 text-white rounded-xl text-sm font-bold active:scale-95">추가</button>
          </div>
          <select
            value={newRoutineChapterId ?? ""}
            onChange={(e) => setNewRoutineChapterId(e.target.value ? Number(e.target.value) : null)}
            className="w-full text-xs bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-700 rounded-xl px-3 py-2 outline-none text-gray-600"
          >
            <option value="">묶음 없음</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {routines.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-4">+ 버튼으로 루틴을 추가하세요</p>
      )}

      {routines.map((r, rIdx) => {
        const total = r.items.length
        const checked = r.items.filter((it) => checkedRoutineItemIds.has(it.id)).length
        const bonusGranted = bonusRoutineIds.has(r.id)
        const expanded = expandedRoutineIds.has(r.id)
        const isAddingItem = addingItemFor === r.id
        // 현재가 (마감 + 30분) 이전이면 active 강조.
        // 자정 넘김 마감(<06:00)은 18:00 이후 ~ 다음날 (마감+30분) 까지 active.
        const nowDate = new Date()
        const nowMins = nowDate.getHours() * 60 + nowDate.getMinutes()
        const isActive = r.deadline_time
          ? (() => {
              const [h, m] = r.deadline_time.split(':').map(Number)
              const deadlineMins = h * 60 + m
              const isOvernight = deadlineMins < 6 * 60
              if (isOvernight) {
                if (nowMins >= 18 * 60) return true
                return nowMins <= deadlineMins + 30
              }
              return nowMins <= deadlineMins + 30
            })()
          : rIdx === 0
        const progressPct = total > 0 ? (checked / total) * 100 : 0

        return (
          <div key={r.id} className="mx-4 mt-2 bg-background rounded-2xl overflow-hidden"
            style={{ border: isActive ? '1.5px solid #8FD3B5' : '1px solid #CCEDE4', boxShadow: isActive ? 'inset 3px 0 0 #5BA888' : undefined }}>

            {/* 헤더 */}
            {editingRoutineNameId === r.id ? (
              <div className="flex items-center gap-1.5 px-4 py-3">
                <input autoFocus type="text" value={editingRoutineNameVal}
                  onChange={(e) => setEditingRoutineNameVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveRoutineName(r.id); if (e.key === "Escape") setEditingRoutineNameId(null) }}
                  className="flex-1 min-w-0 text-sm text-gray-900 bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-700 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-teal-300"
                />
                <button onClick={() => saveRoutineName(r.id)} className="px-2.5 py-1 rounded-full text-xs font-bold text-teal-600 bg-teal-100 active:scale-95 flex-shrink-0">저장</button>
                <button onClick={() => setEditingRoutineNameId(null)} className="text-muted-foreground flex-shrink-0"><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <button onClick={() => toggleRoutine(r.id)} className="w-full px-4 pt-3 pb-2.5 text-left active:bg-teal-50/50 transition-colors rounded-t-2xl">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <span className="text-sm font-bold text-foreground truncate min-w-0">{r.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingRoutineNameId(r.id); setEditingRoutineNameVal(r.name) }}
                      className="text-gray-300 hover:text-teal-400 transition-colors flex-shrink-0 p-0.5" aria-label="루틴 이름 수정">
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {r.chapter_id && chapters.find((c) => c.id === r.chapter_id) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 font-medium">
                        {chapters.find((c) => c.id === r.chapter_id)!.name}
                      </span>
                    )}
                    {bonusGranted && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-800">🎉 완수!</span>
                    )}
                    <span className="text-sm font-extrabold" style={{ color: '#5BA888' }}>{checked}/{total}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </div>
                </div>
                {r.deadline_time && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    {r.deadline_time}까지
                    {!bonusGranted && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: '#FFF1E0', color: '#B5651D', border: '1px solid #FFE3C7' }}>×2배</span>
                    )}
                  </p>
                )}
              </button>
            )}

            {/* 진행 바 */}
            {editingRoutineNameId !== r.id && total > 0 && (
              <div className="px-4 pb-2.5">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #8FD3B5, #5BA888)' }} />
                </div>
              </div>
            )}

            {/* 펼쳐진 항목 */}
            {expanded && (
              <div className="border-t border-teal-100">
                {r.items.length === 0 && !isAddingItem && (
                  <p className="text-center text-muted-foreground text-xs py-3">하위 항목을 추가하세요</p>
                )}
                {r.items.map((item) => {
                  const done = checkedRoutineItemIds.has(item.id)
                  const isLoading = completing === item.id
                  const isDragOver = dragOverItemId === item.id && draggingItemId !== item.id
                  const isEditingItem = editingItemId === item.id

                  return (
                    <div key={item.id}
                      onDragOver={(e) => handleDragOver(e, item.id)}
                      onDrop={(e) => handleDrop(e, item.id, r.id)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 border-b border-teal-50 last:border-b-0 transition-colors ${isDragOver ? "bg-teal-50" : ""} ${draggingItemId === item.id ? "opacity-30" : ""}`}>
                      <div draggable onDragStart={(e) => handleDragStart(e, item.id)} onDragEnd={() => { setDraggingItemId(null); setDragOverItemId(null) }}
                        className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none">
                        <GripVertical className="w-3.5 h-3.5 text-gray-300" />
                      </div>
                      <button onClick={() => completeRoutineItem(item)} disabled={done || completing !== null}
                        className="w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-all active:scale-95"
                        style={{ borderColor: done ? '#5BA888' : '#D1D5DB', background: done ? '#5BA888' : 'transparent' }}>
                        {done && <span className="text-white text-[9px] font-black leading-none">✓</span>}
                        {isLoading && !done && <span className="w-2 h-2 rounded-full bg-teal-300 animate-pulse" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        {isEditingItem ? (
                          <div className="flex items-center gap-1.5">
                            <input autoFocus type="text" value={editingItemName}
                              onChange={(e) => setEditingItemName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") saveItemName(item.id); if (e.key === "Escape") setEditingItemId(null) }}
                              className="flex-1 min-w-0 text-sm text-gray-900 bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-700 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-teal-300"
                            />
                            <input type="number" value={editingItemExp}
                              onChange={(e) => setEditingItemExp(Number(e.target.value))}
                              className="w-14 text-xs text-center text-gray-900 bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-700 rounded-lg px-1 py-0.5 outline-none flex-shrink-0"
                              min={1}
                            />
                            <button onClick={() => saveItemName(item.id)} className="px-2.5 py-1 rounded-full text-xs font-bold text-teal-600 bg-teal-100 active:scale-95 flex-shrink-0">저장</button>
                            <button onClick={() => setEditingItemId(null)} className="text-muted-foreground flex-shrink-0"><X className="w-3 h-3" /></button>
                          </div>
                        ) : (
                          <p className={`text-sm font-semibold leading-snug truncate ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.name}</p>
                        )}
                      </div>
                      {!isEditingItem && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                            style={done ? { background: '#F3F4F6', color: '#9CA3AF' } : { background: '#E8F7F0', color: '#5BA888' }}>
                            {done ? "✓ 완료" : `+${item.fixed_exp} EXP`}
                          </span>
                          {!done && (
                            <button onClick={() => { setEditingItemId(item.id); setEditingItemName(item.name); setEditingItemExp(item.fixed_exp) }}
                              className="text-gray-300 hover:text-teal-400 transition-colors p-0.5">
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                          <button onClick={() => onConfirmDelete({ type: "routineItem", id: item.id, name: item.name })}
                            className="text-gray-300 hover:text-red-400 transition-colors p-0.5">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}

                {isAddingItem ? (
                  <div className="px-4 py-2 flex gap-1.5 bg-teal-50/50 dark:bg-teal-950/30">
                    <input autoFocus type="text" value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addRoutineItem(r.id)}
                      placeholder="항목 이름..."
                      className="flex-1 min-w-0 text-sm bg-background border border-teal-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-teal-300"
                    />
                    <input type="number" value={newItemExp}
                      onChange={(e) => setNewItemExp(Number(e.target.value))}
                      className="w-14 text-sm text-center bg-background border border-teal-200 rounded-xl px-1 py-2 outline-none"
                      min={1}
                    />
                    <button onClick={() => addRoutineItem(r.id)} className="px-3 py-2 bg-teal-500 text-white rounded-xl text-sm font-bold active:scale-95">추가</button>
                    <button onClick={() => { setAddingItemFor(null); setNewItemName(""); setNewItemExp(10) }} className="text-muted-foreground px-1"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <div className="bg-teal-50/30">
                    {editingDeadlineFor === r.id ? (
                      <div className="px-4 py-2 flex flex-wrap items-center gap-2">
                        <Clock className="w-3 h-3 text-sky-400 flex-shrink-0" />
                        <input autoFocus type="time" value={deadlineInputVal}
                          onChange={(e) => setDeadlineInputVal(e.target.value)}
                          className="text-xs bg-background border border-sky-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-sky-300"
                        />
                        <button onClick={() => saveDeadline(r.id, deadlineInputVal || null)}
                          className="text-xs font-bold text-sky-600 bg-sky-50 border border-sky-200 px-2 py-1 rounded-lg active:scale-95">저장</button>
                        {r.deadline_time && (
                          <button onClick={() => saveDeadline(r.id, null)} className="text-xs text-muted-foreground active:scale-95">제거</button>
                        )}
                        <button onClick={() => setEditingDeadlineFor(null)} className="text-muted-foreground active:scale-95"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <div className="space-y-0">
                        <div className="flex items-center justify-between px-4 py-2">
                          <div className="flex items-center gap-3">
                            <button onClick={() => { setAddingItemFor(r.id); setNewItemName(""); setNewItemExp(10) }}
                              className="text-xs font-bold text-teal-600 flex items-center gap-1 active:scale-95">
                              <Plus className="w-3 h-3" /> 항목 추가
                            </button>
                            <button
                              onClick={() => { setEditingDeadlineFor(r.id); setDeadlineInputVal(r.deadline_time ?? "") }}
                              className={`flex-shrink-0 flex items-center gap-0.5 transition-colors active:scale-95 ${r.deadline_time ? "text-sky-500" : "text-gray-300 hover:text-sky-400"}`}
                              aria-label="마감 시간 설정">
                              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                              {r.deadline_time && <span className="text-[10px] font-bold">{r.deadline_time}</span>}
                            </button>
                          </div>
                          <button onClick={() => onConfirmDelete({ type: "routine", id: r.id, name: r.name })}
                            className="text-xs text-red-400 hover:text-red-500 active:scale-95">루틴 삭제</button>
                        </div>
                        <div className="px-4 pb-2 flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">묶음</span>
                          {editingChapterFor === r.id ? (
                            <>
                              <select
                                autoFocus
                                value={r.chapter_id ?? ""}
                                onChange={(e) => saveRoutineChapter(r.id, e.target.value ? Number(e.target.value) : null)}
                                className="flex-1 text-[11px] bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-700 rounded-lg px-2 py-0.5 outline-none"
                              >
                                <option value="">없음</option>
                                {chapters.map((c) => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                              <button onClick={() => setEditingChapterFor(null)} className="text-muted-foreground flex-shrink-0"><X className="w-3 h-3" /></button>
                            </>
                          ) : (
                            <button
                              onClick={() => setEditingChapterFor(r.id)}
                              className="text-[11px] text-teal-500 flex items-center gap-1 active:scale-95"
                            >
                              {r.chapter_id
                                ? chapters.find((c) => c.id === r.chapter_id)?.name ?? "묶음"
                                : "없음 (탭해서 변경)"}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
