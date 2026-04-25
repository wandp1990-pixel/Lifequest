"use client"

import { useState, useEffect, useCallback } from "react"
import TopHeader from "@/components/game/TopHeader"
import CharacterPanel from "@/components/game/CharacterPanel"
import LevelBar from "@/components/game/LevelBar"
import QuestBanner from "@/components/game/QuestBanner"
import TasksTab from "@/components/game/TasksTab"
import ItemsTab from "@/components/game/ItemsTab"
import BattleTab from "@/components/game/BattleTab"
import BottomNav from "@/components/game/BottomNav"

type TabType = "home" | "tasks" | "battle" | "items"

const TAB_TITLES: Record<TabType, string> = {
  home:   "홈",
  tasks:  "할일",
  battle: "전투",
  items:  "아이템",
}

type CharacterData = {
  level: number
  total_exp: number
  next_exp: number
  current_hp: number
  max_hp: number
  current_mp: number
  max_mp: number
  draw_tickets: number
  clear_count: number
  task_count: number
  stat_points: number
  skill_points: number
  str: number
  vit: number
  dex: number
  int_stat: number
  luk: number
}

export default function GamePage() {
  const [activeTab, setActiveTab] = useState<TabType>("tasks")
  const [char, setChar] = useState<CharacterData | null>(null)
  const [tasksCount, setTasksCount] = useState(0)

  const fetchChar = useCallback(async () => {
    try {
      const res = await fetch("/api/character")
      if (res.ok) setChar(await res.json())
    } catch {}
  }, [])

  useEffect(() => {
    fetchChar()
  }, [fetchChar])

  const handleExpGained = useCallback(() => {
    fetchChar()
  }, [fetchChar])

  const questTotal = 5 * (1 + Math.floor((char?.task_count ?? 0) / 10))

  const renderTabContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <div className="px-4 pt-4 flex flex-col gap-3">
            {char && (
              <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-2">
                <p className="text-sm font-bold text-gray-700 mb-1">캐릭터 스탯</p>
                {[
                  ["STR", char.str],
                  ["VIT", char.vit],
                  ["DEX", char.dex],
                  ["INT", char.int_stat],
                  ["LUK", char.luk],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">{label}</span>
                    <span className="font-bold text-gray-800">{val}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 mt-1 pt-2 flex justify-between text-sm">
                  <span className="text-gray-500">스탯 포인트</span>
                  <span className="font-bold text-amber-600">{char.stat_points}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">스킬 포인트</span>
                  <span className="font-bold text-violet-600">{char.skill_points}</span>
                </div>
                <div className="border-t border-gray-200 mt-1 pt-2 flex justify-between text-sm">
                  <span className="text-gray-500">누적 태스크</span>
                  <span className="font-bold text-emerald-600">{char.task_count ?? 0}</span>
                </div>
              </div>
            )}
          </div>
        )
      case "tasks":
        return <TasksTab onExpGained={handleExpGained} onCountChange={setTasksCount} />
      case "battle":
        return <BattleTab char={char} onExpGained={handleExpGained} />
      case "items":
        return <ItemsTab drawTickets={char?.draw_tickets ?? 0} onTicketsChanged={fetchChar} />
    }
  }

  const expPercent = char ? Math.round((char.total_exp / char.next_exp) * 100) : 0

  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <div
        className="relative flex flex-col bg-white w-full max-w-sm"
        style={{ minHeight: "100dvh", maxHeight: "100dvh" }}
      >
        <div className="flex-shrink-0 bg-white">
          <TopHeader title={TAB_TITLES[activeTab]} />
          <CharacterPanel
            hp={char?.current_hp ?? 0}
            maxHp={char?.max_hp ?? 100}
            mp={char?.current_mp ?? 0}
            maxMp={char?.max_mp ?? 50}
            exp={char?.total_exp ?? 0}
            maxExp={char?.next_exp ?? 100}
            level={char?.level ?? 1}
            gems={0}
            gold={0}
          />
          <LevelBar
            level={char?.level ?? 1}
            expPercent={expPercent}
            drawTickets={char?.draw_tickets ?? 0}
          />
          <QuestBanner
            title="데일리 완료"
            reward={50}
            progress={tasksCount}
            total={questTotal}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {renderTabContent()}
        </div>

        <div className="flex-shrink-0">
          <BottomNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tasksCount={tasksCount}
          />
        </div>
      </div>
    </main>
  )
}
