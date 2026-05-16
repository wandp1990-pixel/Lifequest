/**
 * @module components/game/home/UrgentProjectsCard
 * @purpose 3일 이내 마감 임박 프로젝트만 표시. projects 는 부모(HomeTab)에서 fetch 해서 props 로 받는다.
 *          due_date 비교는 KST 자정 기준으로 일수를 계산한다(UTC 파싱 시 ±9h 시차로 D-라벨이 흔들리는 문제 방지).
 */

"use client"

import { AlertTriangle } from "lucide-react"
import { todayKST } from "@/lib/time/kst"

export interface UrgentProject {
  id: number
  name: string
  due_date: string | null
  status: string
}

const URGENT_DAYS = 3
const DAY_MS = 24 * 60 * 60 * 1000

// 'YYYY-MM-DD' 또는 'YYYY-MM-DDTHH:MM:...' → 해당 날짜의 KST 자정 epoch ms
function kstMidnightMs(dateStr: string): number {
  const ymd = dateStr.split("T")[0]
  return new Date(`${ymd}T00:00:00+09:00`).getTime()
}

export default function UrgentProjectsCard({ projects }: { projects: UrgentProject[] }) {
  const todayMs = kstMidnightMs(todayKST())

  const items = projects
    .filter((p) => p.due_date && p.status !== "done")
    .map((p) => ({
      ...p,
      daysLeft: Math.round((kstMidnightMs(p.due_date as string) - todayMs) / DAY_MS),
    }))
    .filter((p) => p.daysLeft <= URGENT_DAYS)

  if (items.length === 0) return null

  return (
    <div className="mx-4 mt-3 rounded-xl border border-red-500/30 bg-red-500/5 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-red-500/20">
        <AlertTriangle size={13} className="text-red-400 shrink-0" />
        <span className="text-xs font-bold text-red-400">마감 임박 프로젝트</span>
      </div>
      {items.map((p) => {
        const label = p.daysLeft <= 0 ? "오늘 마감" : `D-${p.daysLeft}`
        return (
          <div key={p.id} className="flex items-center justify-between px-3 py-2 border-b border-red-500/10 last:border-0">
            <span className="text-xs text-foreground truncate flex-1">{p.name}</span>
            <span className={`text-[10px] font-bold ml-2 shrink-0 ${p.daysLeft <= 0 ? "text-red-500" : "text-red-400"}`}>{label}</span>
          </div>
        )
      })}
    </div>
  )
}
