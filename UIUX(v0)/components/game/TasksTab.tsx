"use client"

import { useState, useEffect, useCallback } from "react"
import ProjectsTab from "./ProjectsTab"
import HabitSection from "./HabitSection"
import TodoSection, { TodoItem } from "./TodoSection"
import RoutineSection from "./RoutineSection"
import { useChecklist } from "@/hooks/useChecklist"
import { useRoutines } from "@/hooks/useRoutines"
import { useTodos } from "@/hooks/useTodos"
import { useProjects } from "@/hooks/useProjects"
import { useMidnightRefresh } from "@/hooks/useMidnightRefresh"
import { apiDelete, ApiError } from "@/hooks/useApi"

type DeleteTarget =
  | { type: "daily"; id: number; name: string }
  | { type: "todo"; id: number; name: string }
  | { type: "routine"; id: number; name: string }
  | { type: "routineItem"; id: number; name: string }

interface TasksTabProps {
  onExpGained?: () => void
  onCountChange?: (count: number) => void
  onDailyCompletedChange?: (count: number) => void
  refreshTick?: number
  questTotal?: number
  questRewardMin?: number
  questRewardMax?: number
}

export default function TasksTab({
  onExpGained,
  onCountChange,
  onDailyCompletedChange,
  refreshTick,
  questTotal,
  questRewardMin = 50,
  questRewardMax = 100,
}: TasksTabProps) {
  // ── 도메인 데이터 훅 (각 훅이 자체 fetch + state 보유) ───────────────────
  const checklist = useChecklist()
  const routinesH = useRoutines()
  const todosH = useTodos()
  const projectsH = useProjects()
  const {
    dailyItems, setDailyItems,
    checkedDailyIds, setCheckedDailyIds,
    habitGroups, setHabitGroups,
    bonusGroupIds, setBonusGroupIds,
  } = checklist
  const {
    routines, setRoutines,
    checkedRoutineItemIds, setCheckedRoutineItemIds,
    bonusRoutineIds, setBonusRoutineIds,
    chapters,
  } = routinesH
  const { todoItems, setTodoItems, completedTodoCount, setCompletedTodoCount } = todosH
  const projectCount = projectsH.loading
    ? null
    : projectsH.projects.filter((p) => p.status !== "done").length

  // ── 공유 UI 상태 ──────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ exp: number; comment: string; bonus?: number; penalty?: boolean; penaltyExp?: number } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<DeleteTarget | null>(null)
  const [taskFilter, setTaskFilter] = useState<"all" | "routine" | "habit" | "todo" | "project">("all")
  const [loading, setLoading] = useState(true)

  // ── 초기 데이터 로드 ──────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    await Promise.all([
      checklist.refetch(),
      todosH.refetch(),
      routinesH.refetch(),
      projectsH.refetch(),
    ])
    setLoading(false)
  }, [checklist, todosH, routinesH, projectsH])

  useEffect(() => { fetchAll() }, [fetchAll, refreshTick])

  // KST 자정마다 재조회 — 사용자가 앱을 24h+ 켜놓아도 매일 자정 갱신.
  useMidnightRefresh(fetchAll)

  // ── 카운터 집계 (QuestBanner · BottomNav 배지) ───────────────────────────
  useEffect(() => {
    const routineTotal = routines.reduce((sum, r) => sum + r.items.length, 0)
    const routineDone = routines.reduce(
      (sum, r) => sum + r.items.filter((it) => checkedRoutineItemIds.has(it.id)).length, 0,
    )
    const checkedExisting = dailyItems.filter((item) => checkedDailyIds.has(item.id)).length
    const incomplete =
      (dailyItems.length - checkedExisting) +
      todoItems.filter((t) => !t.is_completed).length +
      (routineTotal - routineDone)
    onCountChange?.(incomplete)
    const totalDone = checkedDailyIds.size + routineDone + completedTodoCount
    onDailyCompletedChange?.(totalDone)
  }, [dailyItems, checkedDailyIds, todoItems, routines, checkedRoutineItemIds, completedTodoCount, onCountChange, onDailyCompletedChange])

  // ── 공유 토스트 ───────────────────────────────────────────────────────────
  const showToast = (exp: number, comment: string, bonus?: number, penalty?: boolean, penaltyExp?: number) => {
    setToast({ exp, comment, bonus, penalty, penaltyExp })
    setTimeout(() => setToast(null), 3000)
  }

  // ── 삭제 확인 · 실행 ─────────────────────────────────────────────────────
  const executeDelete = async () => {
    if (!confirmDelete) return
    const { type, id } = confirmDelete
    setConfirmDelete(null)

    try {
      if (type === "daily") {
        const data = await apiDelete<{ items?: typeof dailyItems; groups?: typeof habitGroups; bonusGroupIds?: number[] }>(
          "/api/checklist", { id })
        setDailyItems(data.items ?? [])
        setHabitGroups(data.groups ?? [])
        setBonusGroupIds(new Set(data.bonusGroupIds ?? []))
      } else if (type === "todo") {
        const items = await apiDelete<TodoItem[]>("/api/todos", { id })
        setTodoItems(items)
        setCompletedTodoCount(items.filter((t) => t.is_completed).length)
      } else {
        const action = type === "routine" ? "deleteRoutine" : "deleteItem"
        const data = await apiDelete<{ routines?: typeof routines; checkedItemIds?: number[]; bonusRoutineIds?: number[] }>(
          "/api/routines", { action, id })
        setRoutines(data.routines ?? [])
        setCheckedRoutineItemIds(new Set(data.checkedItemIds ?? []))
        setBonusRoutineIds(new Set(data.bonusRoutineIds ?? []))
      }
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground text-sm">불러오는 중...</p>
      </div>
    )
  }

  // ── 요약 카드 계산 ────────────────────────────────────────────────────────
  const routineDoneCount = routines.reduce((s, r) => s + r.items.filter(it => checkedRoutineItemIds.has(it.id)).length, 0)
  const summaryDone = checkedDailyIds.size + routineDoneCount + completedTodoCount
  const summaryTotal = questTotal ?? (dailyItems.length + routines.reduce((s, r) => s + r.items.length, 0) + todoItems.length)
  const summaryPct = summaryTotal > 0 ? Math.min(summaryDone / summaryTotal, 1) : 0
  const summaryR = 22
  const summaryCirc = 2 * Math.PI * summaryR
  const rewardLabel = questRewardMin === questRewardMax ? `+${questRewardMin} XP` : `${questRewardMin}~${questRewardMax} XP`

  return (
    <div className="flex flex-col gap-0 relative pb-6">

      {/* 토스트 */}
      {toast && (
        <div className={`sticky top-0 z-20 mx-4 mt-2 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-lg flex flex-col gap-0.5 ${toast.penalty ? "bg-red-400" : "bg-amber-400"}`}>
          <span className="text-sm">
            {toast.penalty
              ? `${toast.exp} EXP (기한 초과 절반)`
              : toast.penaltyExp
              ? `+${toast.exp} EXP · 패널티 -${toast.penaltyExp}`
              : toast.bonus
              ? `+${toast.exp} EXP · 보너스 +${toast.bonus}`
              : `+${toast.exp} EXP!`}
          </span>
          <span className="opacity-90 font-normal leading-snug">{toast.comment}</span>
        </div>
      )}

      {/* DAILY QUEST 요약 카드 */}
      <div className="mx-4 mt-3 rounded-2xl flex items-center gap-3 px-3 py-3" style={{ background: 'linear-gradient(135deg, #FFFAEF, #FFF1E0)', border: '1px solid #FFE3C7' }}>
        <svg width="58" height="58" viewBox="0 0 58 58" style={{ flexShrink: 0 }}>
          <circle cx="29" cy="29" r={summaryR} fill="none" stroke="#FFE3C7" strokeWidth="5"/>
          <circle cx="29" cy="29" r={summaryR} fill="none" stroke="#FFB87A" strokeWidth="5"
            strokeDasharray={summaryCirc} strokeDashoffset={summaryCirc * (1 - summaryPct)}
            strokeLinecap="round" transform="rotate(-90 29 29)"/>
          <text x="29" y="33" textAnchor="middle" fontSize="11" fontWeight="800" fill="#B5651D" fontFamily="Inter">{Math.round(summaryPct * 100)}%</text>
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold tracking-wide" style={{ color: '#B5651D', letterSpacing: '0.04em' }}>DAILY QUEST</p>
          <p className="text-base font-extrabold text-foreground mt-0.5">{summaryDone} / {summaryTotal} 완료</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">모두 완료 시 <strong style={{ color: '#FFB87A' }}>{rewardLabel}</strong> 보너스</p>
        </div>
      </div>

      {/* 필터 칩 */}
      <div className="px-4 pt-3 pb-1 flex gap-2">
        {([
          ["all",     "전체",    null],
          ["routine", "루틴",    routines.length],
          ["habit",   "습관",    dailyItems.length],
          ["todo",    "할일",    todoItems.filter(t => !t.is_completed).length],
          ["project", "프로젝트", projectCount],
        ] as [string, string, number | null][]).map(([k, label, count]) => (
          <button key={k}
            onClick={() => setTaskFilter(k as typeof taskFilter)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
              taskFilter === k
                ? "bg-violet-500 text-white border-violet-500 shadow-sm"
                : "bg-background text-muted-foreground border-border"
            }`}>
            {label}{count !== null ? ` ${count}` : ""}
          </button>
        ))}
      </div>

      {/* 루틴 섹션 */}
      {(taskFilter === "all" || taskFilter === "routine") && (
        <RoutineSection
          routines={routines}
          setRoutines={setRoutines}
          checkedRoutineItemIds={checkedRoutineItemIds}
          setCheckedRoutineItemIds={setCheckedRoutineItemIds}
          bonusRoutineIds={bonusRoutineIds}
          setBonusRoutineIds={setBonusRoutineIds}
          onToast={showToast}
          onConfirmDelete={setConfirmDelete}
          onExpGained={onExpGained}
          chapters={chapters}
        />
      )}

      {/* 습관 섹션 */}
      {(taskFilter === "all" || taskFilter === "habit") && (
        <HabitSection
          dailyItems={dailyItems}
          setDailyItems={setDailyItems}
          checkedDailyIds={checkedDailyIds}
          setCheckedDailyIds={setCheckedDailyIds}
          habitGroups={habitGroups}
          setHabitGroups={setHabitGroups}
          bonusGroupIds={bonusGroupIds}
          setBonusGroupIds={setBonusGroupIds}
          onToast={showToast}
          onConfirmDelete={setConfirmDelete}
          onExpGained={onExpGained}
        />
      )}

      {/* 할 일 섹션 */}
      {(taskFilter === "all" || taskFilter === "todo") && (
        <TodoSection
          todoItems={todoItems}
          setTodoItems={setTodoItems}
          setCompletedTodoCount={setCompletedTodoCount}
          onToast={showToast}
          onConfirmDelete={setConfirmDelete}
          onExpGained={onExpGained}
        />
      )}

      {/* 프로젝트 섹션 */}
      {(taskFilter === "project" || taskFilter === "all") && (
        <ProjectsTab onExpGained={onExpGained} refreshTick={refreshTick} />
      )}

      {/* 삭제 확인 모달 */}
      {confirmDelete && (
        <>
          <div className="fixed inset-0 bg-black/40 z-30" onClick={() => setConfirmDelete(null)} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-background rounded-t-3xl z-40 px-6 py-6 shadow-2xl">
            <p className="text-sm font-bold text-foreground text-center mb-1">항목을 삭제하시겠습니까?</p>
            <p className="text-xs text-muted-foreground text-center mb-5">&ldquo;{confirmDelete.name}&rdquo;</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 rounded-2xl bg-muted text-muted-foreground font-bold text-sm active:scale-95">취소</button>
              <button onClick={executeDelete}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold text-sm active:scale-95">삭제</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
