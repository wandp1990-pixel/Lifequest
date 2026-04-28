"use client"

import { User, CheckSquare, Swords, ShoppingBag, Sparkles } from "lucide-react"

type TabType = "home" | "tasks" | "battle" | "items" | "skills"

interface BottomNavProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  tasksCount?: number
}

const TAB_CONFIG: {
  id: TabType
  label: string
  activeColor: string
  activeBg: string
  badgeColor: string
}[] = [
  {
    id: "home",
    label: "홈",
    activeColor: "text-emerald-500",
    activeBg: "bg-emerald-50",
    badgeColor: "bg-emerald-500",
  },
  {
    id: "tasks",
    label: "할일",
    activeColor: "text-amber-500",
    activeBg: "bg-amber-50",
    badgeColor: "bg-amber-500",
  },
  {
    id: "battle",
    label: "전투",
    activeColor: "text-red-500",
    activeBg: "bg-red-50",
    badgeColor: "bg-red-500",
  },
  {
    id: "skills",
    label: "캐릭터",
    activeColor: "text-purple-500",
    activeBg: "bg-purple-50",
    badgeColor: "bg-purple-500",
  },
  {
    id: "items",
    label: "아이템",
    activeColor: "text-sky-500",
    activeBg: "bg-sky-50",
    badgeColor: "bg-sky-500",
  },
]

const ICONS: Record<TabType, React.ReactNode> = {
  home:   <User        className="w-5 h-5" />,
  tasks:  <CheckSquare className="w-5 h-5" />,
  battle: <Swords      className="w-5 h-5" />,
  skills: <Sparkles    className="w-5 h-5" />,
  items:  <ShoppingBag className="w-5 h-5" />,
}

export default function BottomNav({
  activeTab,
  onTabChange,
  tasksCount = 0,
}: BottomNavProps) {
  const badges: Partial<Record<TabType, number>> = {
    tasks: tasksCount,
  }

  return (
    <nav
      className="flex items-center justify-around px-2 py-2 border-t border-border bg-muted"
      aria-label="메인 내비게이션"
    >
      {TAB_CONFIG.map((tab) => {
        const isActive = activeTab === tab.id
        const badge = badges[tab.id]

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex flex-col items-center gap-0.5 px-2 py-2 rounded-2xl transition-all duration-200 ${
              isActive ? `${tab.activeBg} shadow-sm` : "bg-transparent"
            }`}
            aria-label={tab.label}
            aria-current={isActive ? "page" : undefined}
          >
            {badge !== undefined && badge > 0 && (
              <div
                className={`absolute -top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center z-10 ${
                  isActive ? tab.badgeColor : "bg-muted-foreground"
                }`}
              >
                <span className="text-[10px] font-bold text-white leading-none">{badge}</span>
              </div>
            )}

            <div className={`transition-colors duration-200 ${isActive ? tab.activeColor : "text-muted-foreground"}`}>
              {ICONS[tab.id]}
            </div>

            <span
              className={`text-[10px] font-bold transition-colors duration-200 ${
                isActive ? tab.activeColor : "text-muted-foreground"
              }`}
            >
              {tab.label}
            </span>

            {isActive && (
              <div className={`w-1 h-1 rounded-full ${tab.badgeColor}`} />
            )}
          </button>
        )
      })}
    </nav>
  )
}
