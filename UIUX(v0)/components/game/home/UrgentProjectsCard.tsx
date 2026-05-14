/**
 * @module components/game/home/UrgentProjectsCard
 * @purpose 3일 이내 마감 임박 프로젝트만 표시.
 */

"use client"

import { useEffect, useState, useCallback } from "react"
import { AlertTriangle } from "lucide-react"

interface UrgentProject {
  id: number
  name: string
  due_date: string
  status: string
}

const URGENT_MS = 3 * 24 * 60 * 60 * 1000

export default function UrgentProjectsCard({ refreshTick }: { refreshTick?: number }) {
  const [items, setItems] = useState<UrgentProject[]>([])

  const fetchUrgent = useCallback(async () => {
    const res = await fetch("/api/projects")
    if (!res.ok) return
    const data = await res.json()
    const all: UrgentProject[] = data.projects ?? []
    const now = Date.now()
    setItems(all.filter((p) => {
      if (!p.due_date || p.status === "done") return false
      return new Date(p.due_date).getTime() - now < URGENT_MS
    }))
  }, [])

  useEffect(() => { fetchUrgent() }, [fetchUrgent, refreshTick])

  if (items.length === 0) return null

  return (
    <div className="mx-4 mt-3 rounded-xl border border-red-500/30 bg-red-500/5 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-red-500/20">
        <AlertTriangle size={13} className="text-red-400 shrink-0" />
        <span className="text-xs font-bold text-red-400">마감 임박 프로젝트</span>
      </div>
      {items.map((p) => {
        const diff = new Date(p.due_date).getTime() - Date.now()
        const daysLeft = Math.ceil(diff / (24 * 60 * 60 * 1000))
        const label = daysLeft <= 0 ? "오늘 마감" : `D-${daysLeft}`
        return (
          <div key={p.id} className="flex items-center justify-between px-3 py-2 border-b border-red-500/10 last:border-0">
            <span className="text-xs text-foreground truncate flex-1">{p.name}</span>
            <span className={`text-[10px] font-bold ml-2 shrink-0 ${daysLeft <= 0 ? "text-red-500" : "text-red-400"}`}>{label}</span>
          </div>
        )
      })}
    </div>
  )
}
