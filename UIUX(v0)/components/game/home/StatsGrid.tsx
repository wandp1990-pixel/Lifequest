/**
 * @module components/game/home/StatsGrid
 * @purpose 홈 미니 스탯 그리드 (4칸). 습관/루틴/프로젝트/할 일 진척률을 SVG 원형 게이지로.
 *          habits/routines/todos 는 자체 fetch, projects 는 부모(HomeTab)에서 props 로 받는다(중복 호출 방지).
 */

"use client"

import { useEffect, useState, useCallback } from "react"

interface Props {
  refreshTick?: number
  onTabChange?: (tab: "home" | "tasks" | "battle" | "items" | "skills") => void
  projects: { status: string }[]
}

interface StatEntry {
  label: string
  done: number
  total: number
  color: string
  icon: string
  bg: string
  border: string
  trackColor: string
}

export default function StatsGrid({ refreshTick, onTabChange, projects }: Props) {
  const [habitsDone, setHabitsDone] = useState(0)
  const [habitsTotal, setHabitsTotal] = useState(0)
  const [routinesDone, setRoutinesDone] = useState(0)
  const [routinesTotal, setRoutinesTotal] = useState(0)
  const [todosDone, setTodosDone] = useState(0)
  const [todosTotal, setTodosTotal] = useState(0)

  const projectsTotal = projects.length
  const projectsDone = projects.filter((p) => p.status === "done").length

  const fetchAll = useCallback(async () => {
    const [hRes, rRes, tRes] = await Promise.all([
      fetch("/api/checklist"),
      fetch("/api/routines"),
      fetch("/api/todos"),
    ])
    if (hRes.ok) {
      const d = await hRes.json()
      setHabitsTotal((d.items ?? []).length)
      setHabitsDone((d.checkedIds ?? []).length)
    }
    if (rRes.ok) {
      const d = await rRes.json()
      setRoutinesTotal((d.routines ?? []).length)
      setRoutinesDone((d.bonusRoutineIds ?? []).length)
    }
    if (tRes.ok) {
      const d = await tRes.json()
      const items = (d.items ?? []) as { is_completed: number }[]
      setTodosTotal(items.length)
      setTodosDone(items.filter((t) => t.is_completed).length)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll, refreshTick])

  const stats: StatEntry[] = [
    { label: "할 일",    done: todosDone,    total: todosTotal,    color: "#fbbf24", icon: "📋", bg: "bg-amber-50 dark:bg-amber-950/40",   border: "border-amber-200 dark:border-amber-800",   trackColor: "#fde68a" },
    { label: "습관",     done: habitsDone,   total: habitsTotal,   color: "#22c55e", icon: "☀️", bg: "bg-green-50 dark:bg-green-950/40",   border: "border-green-200 dark:border-green-800",   trackColor: "#bbf7d0" },
    { label: "루틴",     done: routinesDone, total: routinesTotal, color: "#818cf8", icon: "🔁", bg: "bg-indigo-50 dark:bg-indigo-950/40", border: "border-indigo-200 dark:border-indigo-800", trackColor: "#c7d2fe" },
    { label: "프로젝트", done: projectsDone, total: projectsTotal, color: "#a78bfa", icon: "🗂️", bg: "bg-violet-50 dark:bg-violet-950/40", border: "border-violet-200 dark:border-violet-800", trackColor: "#ddd6fe" },
  ]
  const R = 22, C = 50, stroke = 4
  const circ = 2 * Math.PI * R

  return (
    <div className="mx-4 mt-3 grid grid-cols-4 gap-2">
      {stats.map(({ label, done, total, color, icon, bg, border, trackColor }) => {
        const pct = total > 0 ? done / total : 0
        const offset = circ * (1 - pct)
        return (
          <button
            key={label}
            onClick={() => onTabChange?.("tasks")}
            className={`rounded-xl border ${bg} ${border} py-3 flex flex-col items-center gap-1.5 shadow-sm active:scale-95 transition-transform`}
          >
            <div className="relative" style={{ width: C, height: C }}>
              <svg width={C} height={C} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={C / 2} cy={C / 2} r={R} fill="none" stroke={trackColor} strokeWidth={stroke} />
                <circle
                  cx={C / 2} cy={C / 2} r={R}
                  fill="none" stroke={color} strokeWidth={stroke}
                  strokeDasharray={circ} strokeDashoffset={offset}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.4s ease" }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-base">{icon}</span>
            </div>
            <p className="text-[10px] font-bold text-foreground">
              {label} <span className="font-extrabold">{done}</span>
              <span className="text-muted-foreground font-medium"> /{total}</span>
            </p>
          </button>
        )
      })}
    </div>
  )
}
