/**
 * @module components/game/HomeTab
 * @purpose 홈 탭 컨테이너. 4개 독립 카드 합성. 각 카드는 자체 fetch 수행.
 */

"use client"

import AttendanceCard from "./home/AttendanceCard"
import StatsGrid from "./home/StatsGrid"
import UrgentProjectsCard from "./home/UrgentProjectsCard"
import ActivitySection from "./home/ActivitySection"

interface Props {
  onExpGained: () => void
  refreshTick?: number
  onTabChange?: (tab: "home" | "tasks" | "battle" | "items" | "skills") => void
}

export default function HomeTab({ onExpGained, refreshTick, onTabChange }: Props) {
  return (
    <div className="flex flex-col gap-0 pb-6">
      <AttendanceCard refreshTick={refreshTick} onExpGained={onExpGained} />
      <StatsGrid refreshTick={refreshTick} onTabChange={onTabChange} />
      <UrgentProjectsCard refreshTick={refreshTick} />
      <ActivitySection refreshTick={refreshTick} onExpGained={onExpGained} />
    </div>
  )
}
