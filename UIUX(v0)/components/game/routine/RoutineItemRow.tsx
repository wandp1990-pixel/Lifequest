/**
 * @module components/game/routine/RoutineItemRow
 * @purpose 루틴 단일 항목 행. 인라인 이름/EXP 편집 + 완료 버튼. drag props는 부모(RoutineCard)에서 주입.
 */

"use client"

import { useState } from "react"
import { GripVertical, X, Pencil } from "lucide-react"
import type { RoutineItem, DeleteTarget } from "./types"

interface Props {
  item: RoutineItem
  done: boolean
  isLoading: boolean
  isCompletingAny: boolean
  isDragging: boolean
  isDragOver: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
  onComplete: () => void
  mutate: (body: object) => Promise<void>
  onConfirmDelete: (target: DeleteTarget) => void
}

export default function RoutineItemRow({
  item, done, isLoading, isCompletingAny,
  isDragging, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd,
  onComplete, mutate, onConfirmDelete,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [nameVal, setNameVal] = useState(item.name)
  const [expVal, setExpVal] = useState(item.fixed_exp)

  const save = async () => {
    if (!nameVal.trim()) return
    await mutate({ action: "updateItemName", itemId: item.id, name: nameVal, fixedExp: expVal })
    setEditing(false)
  }

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`flex items-center gap-2.5 px-3 py-2.5 border-b border-teal-50 last:border-b-0 transition-colors ${isDragOver ? "bg-teal-50" : ""} ${isDragging ? "opacity-30" : ""}`}
    >
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-3.5 h-3.5 text-gray-300" />
      </div>
      <button
        onClick={onComplete}
        disabled={done || isCompletingAny}
        className="w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-all active:scale-95"
        style={{ borderColor: done ? "#5BA888" : "#D1D5DB", background: done ? "#5BA888" : "transparent" }}
      >
        {done && <span className="text-white text-[9px] font-black leading-none">✓</span>}
        {isLoading && !done && <span className="w-2 h-2 rounded-full bg-teal-300 animate-pulse" />}
      </button>
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus type="text" value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false) }}
              className="flex-1 min-w-0 text-sm text-gray-900 bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-700 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-teal-300"
            />
            <input
              type="number" value={expVal}
              onChange={(e) => setExpVal(Number(e.target.value))}
              className="w-14 text-xs text-center text-gray-900 bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-700 rounded-lg px-1 py-0.5 outline-none flex-shrink-0"
              min={1}
            />
            <button onClick={save} className="px-2.5 py-1 rounded-full text-xs font-bold text-teal-600 bg-teal-100 active:scale-95 flex-shrink-0">저장</button>
            <button onClick={() => setEditing(false)} className="text-muted-foreground flex-shrink-0"><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <p className={`text-sm font-semibold leading-snug truncate ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.name}</p>
        )}
      </div>
      {!editing && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className="px-2.5 py-1 rounded-full text-xs font-bold"
            style={done ? { background: "#F3F4F6", color: "#9CA3AF" } : { background: "#E8F7F0", color: "#5BA888" }}
          >
            {done ? "✓ 완료" : `+${item.fixed_exp} EXP`}
          </span>
          {!done && (
            <button
              onClick={() => { setEditing(true); setNameVal(item.name); setExpVal(item.fixed_exp) }}
              className="text-gray-300 hover:text-teal-400 transition-colors p-0.5"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => onConfirmDelete({ type: "routineItem", id: item.id, name: item.name })}
            className="text-gray-300 hover:text-red-400 transition-colors p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
