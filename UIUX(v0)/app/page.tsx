"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import TopHeader from "@/components/game/TopHeader"
import CharacterPanel from "@/components/game/CharacterPanel"
import QuestBanner from "@/components/game/QuestBanner"
import TasksTab from "@/components/game/TasksTab"
import HomeTab from "@/components/game/HomeTab"
import ItemsTab from "@/components/game/ItemsTab"
import BattleTab from "@/components/game/BattleTab"
import CharacterTab from "@/components/game/CharacterTab"
import BottomNav from "@/components/game/BottomNav"
import SettingsDrawer from "@/components/game/SettingsDrawer"
import { calcRegen } from "@/lib/regen"

type TabType = "home" | "tasks" | "battle" | "items" | "skills"

const TAB_TITLES: Record<TabType, string> = {
  home:   "홈",
  tasks:  "할일",
  battle: "전투",
  skills: "캐릭터",
  items:  "아이템",
}

type CharacterData = {
  name: string
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
  last_regen_at?: string | null
  effective?: {
    patk: number; matk: number; pdef: number; mdef: number
    dex: number; luk: number; vit: number; int: number
    max_hp: number; max_mp: number
    crit_rate: number; accuracy_bonus: number; evasion_bonus: number
    double_attack: boolean; life_steal: boolean; def_ignore: boolean; reflect: boolean
  }
  item_stat_bonuses?: { str: number; vit: number; dex: number; int_stat: number; luk: number }
  max_cleared_grade?: string | null
}

export default function GamePage() {
  const [activeTab, setActiveTab] = useState<TabType>("home")
  const [char, setChar] = useState<CharacterData | null>(null)
  const [tasksCount, setTasksCount] = useState(0)
  const [dailyCompleted, setDailyCompleted] = useState(0)
  const [questTotal, setQuestTotal] = useState(10)
  const [showSettings, setShowSettings] = useState(false)
  const [tick, setTick] = useState(0)
  const [refreshTick, setRefreshTick] = useState(0)
  const questRewardedRef = useRef(false)

  const fetchChar = useCallback(async () => {
    try {
      const res = await fetch("/api/character")
      if (res.ok) setChar(await res.json())
    } catch {}
  }, [])

  const fetchQuestTotal = useCallback(async () => {
    try {
      const res = await fetch("/api/config")
      if (!res.ok) return
      const rows: { config_key: string; config_value: string }[] = await res.json()
      const item = rows.find((r) => r.config_key === "daily_quest_total")
      if (item) setQuestTotal(parseInt(item.config_value) || 10)
    } catch {}
  }, [])

  useEffect(() => {
    fetchChar()
    fetchQuestTotal()
  }, [fetchChar, fetchQuestTotal])

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(id)
  }, [])

  const handleExpGained = useCallback(() => {
    fetchChar()
  }, [fetchChar])

  useEffect(() => {
    if (questRewardedRef.current) return
    if (dailyCompleted >= questTotal && questTotal > 0) {
      questRewardedRef.current = true
      fetch("/api/quest/reward", { method: "POST" })
        .then((r) => r.json())
        .then((d) => { if (d.exp) fetchChar() })
        .catch(() => {})
    }
  }, [dailyCompleted, questTotal, fetchChar])

  const renderTabContent = () => {
    return (
      <>
        {activeTab === "home"   && <HomeTab onExpGained={handleExpGained} refreshTick={refreshTick} />}
        {activeTab === "tasks"  && <TasksTab onExpGained={handleExpGained} onCountChange={setTasksCount} onDailyCompletedChange={setDailyCompleted} refreshTick={refreshTick} questTotal={questTotal} />}
        {activeTab === "skills" && <CharacterTab char={char} onCharUpdated={fetchChar} itemStatBonuses={char?.item_stat_bonuses} effectiveStats={char?.effective} />}
        {activeTab === "items"  && <ItemsTab drawTickets={char?.draw_tickets ?? 0} onTicketsChanged={fetchChar} refreshTick={refreshTick} />}
        <div className={activeTab === "battle" ? "block" : "hidden"}>
          <BattleTab char={char} onExpGained={handleExpGained} />
        </div>
      </>
    )
  }


  return (
    <main className="h-dvh overflow-hidden bg-background flex items-center justify-center">
      <div
        className="relative flex flex-col bg-background w-full max-w-sm"
        style={{ minHeight: "100dvh", maxHeight: "100dvh" }}
      >
        <div className="flex-shrink-0 bg-background">
          <TopHeader title={TAB_TITLES[activeTab]} onMenuClick={() => setShowSettings(true)} onRefresh={() => { fetchChar(); setRefreshTick((t) => t + 1) }} />
          <CharacterPanel
            name={char?.name ?? "모험가"}
            hp={char ? calcRegen(
              char.current_hp,
              char.effective?.max_hp ?? char.max_hp,
              char.effective?.vit ?? char.vit,
              char.last_regen_at
            ) : 0}
            maxHp={char?.effective?.max_hp ?? char?.max_hp ?? 100}
            mp={char ? calcRegen(
              char.current_mp,
              char.effective?.max_mp ?? char.max_mp,
              char.effective?.int ?? char.int_stat,
              char.last_regen_at
            ) : 0}
            maxMp={char?.effective?.max_mp ?? char?.max_mp ?? 50}
            level={char?.level ?? 1}
            drawTickets={char?.draw_tickets ?? 0}
            statPoints={char?.stat_points ?? 0}
            skillPoints={char?.skill_points ?? 0}
            totalExp={char?.total_exp ?? 0}
            nextExp={char?.next_exp ?? 100}
            tick={tick}
          />
          {activeTab !== "home" && activeTab !== "skills" && activeTab !== "battle" && (
            <QuestBanner
              title="데일리 완료"
              progress={Math.min(dailyCompleted, questTotal)}
              total={questTotal}
            />
          )}
        </div>

        <div className={`flex-1 min-h-0 ${activeTab === "skills" ? "flex flex-col overflow-hidden" : "overflow-y-auto"}`}>
          {renderTabContent()}
        </div>

        <div className="flex-shrink-0">
          <BottomNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tasksCount={tasksCount}
          />
        </div>

        {showSettings && (
          <SettingsDrawer
            char={char}
            onCharUpdated={fetchChar}
            onClose={() => { setShowSettings(false); fetchQuestTotal() }}
          />
        )}
      </div>
    </main>
  )
}
