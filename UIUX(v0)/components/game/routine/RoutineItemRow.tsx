/**
 * @module components/game/routine/RoutineItemRow
 * @purpose 루틴 단일 항목 행. 인라인 이름/EXP 편집 + 완료 버튼. 순서 변경은 ↑↓ 버튼(모바일/데스크탑 공통).
 */

"use client"

import { useState } from "react"
import { ChevronUp, ChevronDown, X, Pencil } from "lucide-react"
import type { RoutineItem, DeleteTarget } from "./types"

interface Props {
  item: RoutineItem
  done: boolean
  isLoading: boolean
  isCompletingAny: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onComplete: () => void
  mutate: (body: object) => Promise<void>
  onConfirmDelete: (target: DeleteTarget) => void
}

export default function RoutineItemRow({
  item, done, isLoading, isCompletingAny,
  canMoveUp, canMoveDown, onMoveUp, onMoveDown,
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
    <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-teal-50 last:border-b-0">
      <div className="flex flex-col flex-shrink-0">
        <button
          onClick={onMoveUp}
          disabled={!canMoveUp}
          className="p-0.5 text-gray-300 hover:text-teal-400 disabled:opacity-30 disabled:hover:text-gray-300 active:scale-90 transition-all"
          aria-label="위로 이동"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={!canMoveDown}
          className="p-0.5 text-gray-300 hover:text-teal-400 disabled:opacity-30 disabled:hover:text-gray-300 active:scale-90 transition-all"
          aria-label="아래로 이동"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
      <button
        onClick={onComplete}
        disabled={done || isCompletingAny}
        className="p-2 -m-2 flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
        aria-label={done ? "완료됨" : "루틴 항목 완료"}
      >
        <span
          className="w-5 h-5 rounded flex items-center justify-center border-2"
          style={{ borderColor: done ? "#5BA888" : "#D1D5DB", background: done ? "#5BA888" : "transparent" }}
        >
          {done && <span className="text-white text-[9px] font-black leading-none">✓</span>}
          {isLoading && !done && <span className="w-2 h-2 rounded-full bg-teal-300 animate-pulse" />}
        </span>
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
          <button
            onClick={onComplete}
            disabled={done || isCompletingAny}
            className="px-2.5 py-1 rounded-full text-xs font-bold transition-all active:scale-95"
            style={done ? { background: "#F3F4F6", color: "#9CA3AF" } : { background: "#E8F7F0", color: "#5BA888" }}
            aria-label={done ? "완료됨" : "경험치 받고 완료"}
          >
            {done ? "✓ 완료" : isLoading ? "처리 중..." : `+${item.fixed_exp} EXP`}
          </button>
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
