/**
 * @module components/game/HomeTab
 * @purpose 홈 탭 컨테이너. 4개 카드 합성. projects 는 여기서 한 번 fetch 해서 자식에 내려준다(중복 호출 방지).
 */

"use client"

import { useEffect, useState, useCallback } from "react"
import AttendanceCard from "./home/AttendanceCard"
import StatsGrid from "./home/StatsGrid"
import UrgentProjectsCard, { UrgentProject } from "./home/UrgentProjectsCard"
import ActivitySection from "./home/ActivitySection"

interface Props {
  onExpGained: () => void
  refreshTick?: number
  onTabChange?: (tab: "home" | "tasks" | "battle" | "items" | "skills") => void
}

export default function HomeTab({ onExpGained, refreshTick, onTabChange }: Props) {
  const [projects, setProjects] = useState<UrgentProject[]>([])

  const fetchProjects = useCallback(async () => {
    const res = await fetch("/api/projects")
    if (!res.ok) return
    const data = await res.json()
    setProjects((data?.projects ?? []) as UrgentProject[])
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects, refreshTick])

  return (
    <div className="flex flex-col gap-0 pb-6">
      <AttendanceCard refreshTick={refreshTick} onExpGained={onExpGained} />
      <StatsGrid refreshTick={refreshTick} onTabChange={onTabChange} projects={projects} />
      <UrgentProjectsCard projects={projects} />
      <ActivitySection refreshTick={refreshTick} onExpGained={onExpGained} />
    </div>
  )
}
