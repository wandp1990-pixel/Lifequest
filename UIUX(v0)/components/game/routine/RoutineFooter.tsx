/**
 * @module components/game/routine/RoutineFooter
 * @purpose 루틴 하단 툴바: 항목 추가 트리거, 마감 시간 인라인 편집, 묶음 셀렉트, 루틴 삭제.
 *          편집 state는 자체 보유. mutate/onConfirmDelete 콜백은 RoutineCard에서 주입.
 */

"use client"

import { useState } from "react"
import { Plus, X, Clock } from "lucide-react"
import type { Routine, RoutineChapter, DeleteTarget } from "./types"

interface Props {
  routine: Routine
  chapters: RoutineChapter[]
  onStartAddItem: () => void
  mutate: (body: object) => Promise<void>
  onConfirmDelete: (target: DeleteTarget) => void
}

export default function RoutineFooter({ routine: r, chapters, onStartAddItem, mutate, onConfirmDelete }: Props) {
  const [editingDeadline, setEditingDeadline] = useState(false)
  const [deadlineVal, setDeadlineVal] = useState("")
  const [editingChapter, setEditingChapter] = useState(false)

  const saveDeadline = async (val: string | null) => {
    await mutate({ action: "updateDeadline", routineId: r.id, deadlineTime: val })
    setEditingDeadline(false)
  }

  const saveChapter = async (chapterId: number | null) => {
    await mutate({ action: "updateChapter", routineId: r.id, chapterId })
    setEditingChapter(false)
  }

  if (editingDeadline) {
    return (
      <div className="bg-teal-50/30">
        <div className="px-4 py-2 flex flex-wrap items-center gap-2">
          <Clock className="w-3 h-3 text-sky-400 flex-shrink-0" />
          <input
            autoFocus type="time" value={deadlineVal}
            onChange={(e) => setDeadlineVal(e.target.value)}
            className="text-xs bg-background border border-sky-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-sky-300"
          />
          <button onClick={() => saveDeadline(deadlineVal || null)} className="text-xs font-bold text-sky-600 bg-sky-50 border border-sky-200 px-2 py-1 rounded-lg active:scale-95">저장</button>
          {r.deadline_time && (
            <button onClick={() => saveDeadline(null)} className="text-xs text-muted-foreground active:scale-95">제거</button>
          )}
          <button onClick={() => setEditingDeadline(false)} className="text-muted-foreground active:scale-95"><X className="w-3 h-3" /></button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-teal-50/30 space-y-0">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <button onClick={onStartAddItem} className="text-xs font-bold text-teal-600 flex items-center gap-1 active:scale-95">
            <Plus className="w-3 h-3" /> 항목 추가
          </button>
          <button
            onClick={() => { setEditingDeadline(true); setDeadlineVal(r.deadline_time ?? "") }}
            className={`flex-shrink-0 flex items-center gap-0.5 transition-colors active:scale-95 ${r.deadline_time ? "text-sky-500" : "text-gray-300 hover:text-sky-400"}`}
            aria-label="마감 시간 설정"
          >
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            {r.deadline_time && <span className="text-[10px] font-bold">{r.deadline_time}</span>}
          </button>
        </div>
        <button onClick={() => onConfirmDelete({ type: "routine", id: r.id, name: r.name })} className="text-xs text-red-400 hover:text-red-500 active:scale-95">루틴 삭제</button>
      </div>
      <div className="px-4 pb-2 flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground flex-shrink-0">묶음</span>
        {editingChapter ? (
          <>
            <select
              autoFocus
              value={r.chapter_id ?? ""}
              onChange={(e) => saveChapter(e.target.value ? Number(e.target.value) : null)}
              className="flex-1 text-[11px] bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-700 rounded-lg px-2 py-0.5 outline-none"
            >
              <option value="">없음</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button onClick={() => setEditingChapter(false)} className="text-muted-foreground flex-shrink-0"><X className="w-3 h-3" /></button>
          </>
        ) : (
          <button onClick={() => setEditingChapter(true)} className="text-[11px] text-teal-500 flex items-center gap-1 active:scale-95">
            {r.chapter_id ? chapters.find((c) => c.id === r.chapter_id)?.name ?? "묶음" : "없음 (탭해서 변경)"}
          </button>
        )}
      </div>
    </div>
  )
}
