/**
 * @module components/game/RoutineSection
 * @purpose 루틴 섹션 컨테이너. mutate(PUT)/completeItem(POST) 헬퍼 + RoutineCard 목록 합성.
 *          expandedRoutineIds/completing/addingRoutine 만 컨테이너 보유.
 */

"use client"

import { useState, Dispatch, SetStateAction } from "react"
import { Plus, X } from "lucide-react"
import type { Routine, RoutineItem, RoutineChapter, DeleteTarget } from "./routine/types"
import RoutineCard from "./routine/RoutineCard"
import { useToast } from "@/contexts/ToastContext"

export type { Routine, RoutineItem, RoutineChapter } from "./routine/types"

interface Props {
  routines: Routine[]
  setRoutines: Dispatch<SetStateAction<Routine[]>>
  checkedRoutineItemIds: Set<number>
  setCheckedRoutineItemIds: Dispatch<SetStateAction<Set<number>>>
  bonusRoutineIds: Set<number>
  setBonusRoutineIds: Dispatch<SetStateAction<Set<number>>>
  onConfirmDelete: (target: DeleteTarget) => void
  onExpGained?: () => void
  chapters?: RoutineChapter[]
}

export default function RoutineSection({
  routines, setRoutines, checkedRoutineItemIds, setCheckedRoutineItemIds,
  bonusRoutineIds, setBonusRoutineIds, onConfirmDelete, onExpGained,
  chapters = [],
}: Props) {
  const { showExp } = useToast()
  const [completing, setCompleting] = useState<number | null>(null)
  const [expandedRoutineIds, setExpandedRoutineIds] = useState<Set<number>>(new Set())
  const [addingRoutine, setAddingRoutine] = useState(false)
  const [newRoutineName, setNewRoutineName] = useState("")
  const [newRoutineChapterId, setNewRoutineChapterId] = useState<number | null>(null)

  const mutate = async (body: object) => {
    const res = await fetch("/api/routines", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) return
    const data = await res.json()
    if (data.routines) setRoutines(data.routines)
    if (data.checkedItemIds) setCheckedRoutineItemIds(new Set(data.checkedItemIds))
    if (data.bonusRoutineIds) setBonusRoutineIds(new Set(data.bonusRoutineIds))
    if (typeof data.createdRoutineId === "number") {
      setExpandedRoutineIds((prev) => new Set([...prev, data.createdRoutineId]))
    }
  }

  const addRoutine = async () => {
    if (!newRoutineName.trim()) return
    await mutate({ action: "addRoutine", name: newRoutineName.trim(), chapterId: newRoutineChapterId })
    setNewRoutineName(""); setNewRoutineChapterId(null); setAddingRoutine(false)
  }

  const completeItem = async (item: RoutineItem) => {
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
        showExp(data.exp, comment, data.bonusExp)
      } else {
        showExp(data.exp, "루틴 항목 완료")
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
            <input
              autoFocus type="text" value={newRoutineName}
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

      {routines.map((r, rIdx) => (
        <RoutineCard
          key={r.id}
          routine={r}
          rIdx={rIdx}
          chapters={chapters}
          checkedItemIds={checkedRoutineItemIds}
          bonusGranted={bonusRoutineIds.has(r.id)}
          completing={completing}
          expanded={expandedRoutineIds.has(r.id)}
          toggleExpanded={() => toggleRoutine(r.id)}
          setRoutines={setRoutines}
          mutate={mutate}
          onCompleteItem={completeItem}
          onConfirmDelete={onConfirmDelete}
        />
      ))}
    </>
  )
}
