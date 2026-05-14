/**
 * @module components/game/routine/RoutineCard
 * @purpose 단일 루틴 카드. 헤더(이름 편집/펼침/마감/묶음) + 진행률 + 항목 목록 + footer.
 *          drag 상태는 본 카드 내부에서만 보유(루틴 간 이동 없음).
 *          mutate/complete 콜백은 부모(RoutineSection)에서 주입.
 */

"use client"

import { useState, Dispatch, SetStateAction } from "react"
import { X, ChevronDown, Clock, Pencil } from "lucide-react"
import type { Routine, RoutineItem, RoutineChapter, DeleteTarget } from "./types"
import RoutineItemRow from "./RoutineItemRow"
import RoutineFooter from "./RoutineFooter"

interface Props {
  routine: Routine
  rIdx: number
  chapters: RoutineChapter[]
  checkedItemIds: Set<number>
  bonusGranted: boolean
  completing: number | null
  expanded: boolean
  toggleExpanded: () => void
  setRoutines: Dispatch<SetStateAction<Routine[]>>
  mutate: (body: object) => Promise<void>
  onCompleteItem: (item: RoutineItem) => void
  onConfirmDelete: (target: DeleteTarget) => void
}

function isActiveNow(deadline: string | null, fallbackFirst: boolean): boolean {
  if (!deadline) return fallbackFirst
  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const [h, m] = deadline.split(":").map(Number)
  const deadlineMins = h * 60 + m
  const overnight = deadlineMins < 6 * 60
  if (overnight) {
    if (nowMins >= 18 * 60) return true
    return nowMins <= deadlineMins + 30
  }
  return nowMins <= deadlineMins + 30
}

export default function RoutineCard({
  routine: r, rIdx, chapters, checkedItemIds, bonusGranted,
  completing, expanded, toggleExpanded,
  setRoutines, mutate, onCompleteItem, onConfirmDelete,
}: Props) {
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(r.name)
  const [addingItem, setAddingItem] = useState(false)
  const [newItemName, setNewItemName] = useState("")
  const [newItemExp, setNewItemExp] = useState(10)
  const [dragging, setDragging] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  const total = r.items.length
  const checked = r.items.filter((it) => checkedItemIds.has(it.id)).length
  const isActive = isActiveNow(r.deadline_time, rIdx === 0)
  const progressPct = total > 0 ? (checked / total) * 100 : 0

  const saveName = async () => {
    if (!nameVal.trim()) return
    await mutate({ action: "updateRoutineName", routineId: r.id, name: nameVal })
    setEditingName(false)
  }

  const addItem = async () => {
    if (!newItemName.trim()) return
    await mutate({ action: "addItem", routineId: r.id, name: newItemName.trim(), fixedExp: newItemExp })
    setNewItemName(""); setNewItemExp(10); setAddingItem(false)
  }

  const handleDrop = async (e: React.DragEvent, targetItemId: number) => {
    e.preventDefault()
    const fromId = dragging
    setDragging(null); setDragOver(null)
    if (!fromId || fromId === targetItemId) return
    const items = [...r.items]
    const fromIdx = items.findIndex((it) => it.id === fromId)
    const toIdx = items.findIndex((it) => it.id === targetItemId)
    if (fromIdx < 0 || toIdx < 0) return
    const [moved] = items.splice(fromIdx, 1)
    items.splice(toIdx, 0, moved)
    setRoutines((prev) => prev.map((x) => x.id === r.id ? { ...x, items } : x))
    await fetch("/api/routines", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reorderItems", routineId: r.id, orderedItemIds: items.map((it) => it.id) }),
    })
  }

  return (
    <div
      className="mx-4 mt-2 bg-background rounded-2xl overflow-hidden"
      style={{ border: isActive ? "1.5px solid #8FD3B5" : "1px solid #CCEDE4", boxShadow: isActive ? "inset 3px 0 0 #5BA888" : undefined }}
    >
      {editingName ? (
        <div className="flex items-center gap-1.5 px-4 py-3">
          <input
            autoFocus type="text" value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false) }}
            className="flex-1 min-w-0 text-sm text-gray-900 bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-700 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-teal-300"
          />
          <button onClick={saveName} className="px-2.5 py-1 rounded-full text-xs font-bold text-teal-600 bg-teal-100 active:scale-95 flex-shrink-0">저장</button>
          <button onClick={() => setEditingName(false)} className="text-muted-foreground flex-shrink-0"><X className="w-3 h-3" /></button>
        </div>
      ) : (
        <button onClick={toggleExpanded} className="w-full px-4 pt-3 pb-2.5 text-left active:bg-teal-50/50 transition-colors rounded-t-2xl">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <span className="text-sm font-bold text-foreground truncate min-w-0">{r.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); setEditingName(true); setNameVal(r.name) }}
                className="text-gray-300 hover:text-teal-400 transition-colors flex-shrink-0 p-0.5"
                aria-label="루틴 이름 수정"
              >
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
              <span className="text-sm font-extrabold" style={{ color: "#5BA888" }}>{checked}/{total}</span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
            </div>
          </div>
          {r.deadline_time && (
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <Clock className="w-3 h-3 flex-shrink-0" />
              {r.deadline_time}까지
              {!bonusGranted && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "#FFF1E0", color: "#B5651D", border: "1px solid #FFE3C7" }}>×2배</span>
              )}
            </p>
          )}
        </button>
      )}

      {!editingName && total > 0 && (
        <div className="px-4 pb-2.5">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #8FD3B5, #5BA888)" }} />
          </div>
        </div>
      )}

      {expanded && (
        <div className="border-t border-teal-100">
          {r.items.length === 0 && !addingItem && (
            <p className="text-center text-muted-foreground text-xs py-3">하위 항목을 추가하세요</p>
          )}
          {r.items.map((item) => (
            <RoutineItemRow
              key={item.id}
              item={item}
              done={checkedItemIds.has(item.id)}
              isLoading={completing === item.id}
              isCompletingAny={completing !== null}
              isDragging={dragging === item.id}
              isDragOver={dragOver === item.id && dragging !== item.id}
              onDragStart={(e) => { setDragging(item.id); e.dataTransfer.effectAllowed = "move" }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOver(item.id) }}
              onDrop={(e) => handleDrop(e, item.id)}
              onDragEnd={() => { setDragging(null); setDragOver(null) }}
              onComplete={() => onCompleteItem(item)}
              mutate={mutate}
              onConfirmDelete={onConfirmDelete}
            />
          ))}

          {addingItem ? (
            <div className="px-4 py-2 flex gap-1.5 bg-teal-50/50 dark:bg-teal-950/30">
              <input
                autoFocus type="text" value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
                placeholder="항목 이름..."
                className="flex-1 min-w-0 text-sm bg-background border border-teal-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-teal-300"
              />
              <input
                type="number" value={newItemExp}
                onChange={(e) => setNewItemExp(Number(e.target.value))}
                className="w-14 text-sm text-center bg-background border border-teal-200 rounded-xl px-1 py-2 outline-none"
                min={1}
              />
              <button onClick={addItem} className="px-3 py-2 bg-teal-500 text-white rounded-xl text-sm font-bold active:scale-95">추가</button>
              <button onClick={() => { setAddingItem(false); setNewItemName(""); setNewItemExp(10) }} className="text-muted-foreground px-1"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <RoutineFooter
              routine={r}
              chapters={chapters}
              onStartAddItem={() => { setAddingItem(true); setNewItemName(""); setNewItemExp(10) }}
              mutate={mutate}
              onConfirmDelete={onConfirmDelete}
            />
          )}
        </div>
      )}
    </div>
  )
}
