/**
 * @module components/game/HabitSection
 * @purpose 습관 섹션 컨테이너. mutate 단일 PUT 헬퍼 + complete POST + group/ungrouped 합성.
 *          children: HabitGroupCard / HabitItem (단독섹션) + 인라인 추가 폼.
 *          props에서 받은 setter로 응답 데이터(items/checkedIds/groups/bonusGroupIds) 동기화.
 */

"use client"

import { useState, Dispatch, SetStateAction } from "react"
import { Plus, X, FolderPlus, ChevronDown, ChevronRight } from "lucide-react"
import type { HabitGroup } from "@/lib/db"
import type { DailyItem, DeleteTarget } from "./habit/types"
import HabitGroupCard from "./habit/HabitGroupCard"
import HabitItem from "./habit/HabitItem"
import { useToast } from "@/contexts/ToastContext"

export type { DailyItem } from "./habit/types"

interface Props {
  dailyItems: DailyItem[]
  setDailyItems: Dispatch<SetStateAction<DailyItem[]>>
  checkedDailyIds: Set<number>
  setCheckedDailyIds: Dispatch<SetStateAction<Set<number>>>
  habitGroups: HabitGroup[]
  setHabitGroups: Dispatch<SetStateAction<HabitGroup[]>>
  bonusGroupIds: Set<number>
  setBonusGroupIds: Dispatch<SetStateAction<Set<number>>>
  onConfirmDelete: (target: DeleteTarget) => void
  onExpGained?: () => void
}

export default function HabitSection({
  dailyItems, setDailyItems, checkedDailyIds, setCheckedDailyIds,
  habitGroups, setHabitGroups, bonusGroupIds, setBonusGroupIds,
  onConfirmDelete, onExpGained,
}: Props) {
  const { showExp } = useToast()
  const [completing, setCompleting] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newExp, setNewExp] = useState(10)
  const [addingGroup, setAddingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set())

  const refreshFromResponse = (data: { items?: DailyItem[]; checkedIds?: number[]; groups?: HabitGroup[]; bonusGroupIds?: number[] }) => {
    if (data.items) setDailyItems(data.items)
    if (data.checkedIds) setCheckedDailyIds(new Set(data.checkedIds))
    if (data.groups) setHabitGroups(data.groups)
    if (data.bonusGroupIds) setBonusGroupIds(new Set(data.bonusGroupIds))
  }

  const mutate = async (body: object) => {
    const res = await fetch("/api/checklist", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.ok) refreshFromResponse(await res.json())
  }

  const completeHabit = async (item: DailyItem) => {
    if (checkedDailyIds.has(item.id) || completing !== null) return
    setCompleting(item.id)
    try {
      const res = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      })
      const data = await res.json()
      if (!res.ok) return
      setCheckedDailyIds((prev) => new Set([...prev, item.id]))
      setDailyItems((prev) => prev.map((d) => d.id === item.id ? { ...d, streak: data.streak } : d))
      setHabitGroups((prev) => prev.map((g) => ({
        ...g,
        items: g.items.map((it) => it.id === item.id ? { ...it, streak: data.streak } : it),
      })))
      if (data.groupBonus && item.group_id) {
        setBonusGroupIds((prev) => new Set([...prev, item.group_id!]))
        showExp(data.exp, data.comment, undefined, data.penaltyExp > 0 ? data.penaltyExp : undefined)
        setTimeout(() => {
          showExp(data.groupBonus, `'${data.groupName}' 스택 완성!`, data.groupBonus)
        }, 800)
      } else {
        showExp(data.exp, data.comment, data.bonusExp > 0 ? data.bonusExp : undefined, data.penaltyExp > 0 ? data.penaltyExp : undefined)
      }
      onExpGained?.()
    } finally {
      setCompleting(null)
    }
  }

  const addHabit = async () => {
    if (!newName.trim()) return
    await mutate({ name: newName, suggested_exp: newExp })
    setNewName(""); setAdding(false)
  }

  const createGroup = async () => {
    if (!newGroupName.trim()) return
    await mutate({ action: "addGroup", name: newGroupName.trim() })
    setNewGroupName(""); setAddingGroup(false)
  }

  const toggleCollapsed = (id: number) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const ungroupedItems = dailyItems.filter((item) => !item.group_id)
  const ungroupedDoneCount = ungroupedItems.filter((item) => checkedDailyIds.has(item.id)).length

  return (
    <>
      <div className="mx-4 mt-3 rounded-2xl border border-amber-100 overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between bg-amber-50 dark:bg-amber-900/30">
          <div className="flex items-center gap-2">
            <span className="text-sm">☀️</span>
            <span className="text-sm font-bold text-foreground">습관</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setAddingGroup(!addingGroup); setNewGroupName("") }}
              className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center active:scale-90 transition-transform"
              aria-label="그룹 추가"
            >
              {addingGroup ? <X className="w-3.5 h-3.5" /> : <FolderPlus className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => { setAdding(!adding); setNewName(""); setNewExp(10) }}
              className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center active:scale-90 transition-transform"
              aria-label="습관 추가"
            >
              {adding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {addingGroup && (
        <div className="mx-4 mt-2 px-4 py-2 flex gap-1.5 rounded-2xl border border-amber-100 bg-amber-50/50 dark:bg-amber-950/30">
          <input
            autoFocus type="text" value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createGroup()}
            placeholder="스택 이름 (예: 아침 건강 루틴)"
            className="flex-1 min-w-0 text-sm text-gray-900 dark:text-gray-100 bg-background border border-amber-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-amber-300"
          />
          <button onClick={createGroup} className="px-3 py-2 bg-amber-400 text-white rounded-xl text-sm font-bold active:scale-95">만들기</button>
        </div>
      )}

      {adding && (
        <div className="mx-4 mt-2 px-4 py-2 flex gap-1.5 rounded-2xl border border-amber-100 bg-amber-50/50 dark:bg-amber-950/30">
          <input
            autoFocus type="text" value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addHabit()}
            placeholder="예: 아침 식사 후 물 한 잔"
            className="flex-1 min-w-0 text-sm text-gray-900 dark:text-gray-100 bg-background border border-amber-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-amber-300"
          />
          <input
            type="number" value={newExp}
            onChange={(e) => setNewExp(Number(e.target.value))}
            className="w-14 text-sm text-center text-gray-900 dark:text-gray-100 bg-background border border-amber-200 rounded-xl px-1 py-2 outline-none"
            min={1}
          />
          <button onClick={addHabit} className="px-3 py-2 bg-amber-400 text-white rounded-xl text-sm font-bold active:scale-95">추가</button>
        </div>
      )}

      {habitGroups.map((group) => (
        <HabitGroupCard
          key={group.id}
          group={group}
          groups={habitGroups}
          checkedIds={checkedDailyIds}
          completing={completing}
          bonusGranted={bonusGroupIds.has(group.id)}
          collapsed={collapsedGroups.has(group.id)}
          toggleCollapsed={() => toggleCollapsed(group.id)}
          mutate={mutate}
          onCompleteItem={completeHabit}
          onConfirmDelete={onConfirmDelete}
        />
      ))}

      {ungroupedItems.length > 0 && (
        <div className="mx-4 mt-2 bg-background rounded-2xl overflow-hidden" style={{ border: "1px solid #FDE7B2" }}>
          <button
            onClick={() => toggleCollapsed(-1)}
            className="w-full px-4 pt-3 pb-2.5 text-left transition-colors rounded-t-2xl bg-background"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 min-w-0 flex-1">
                <span className="text-amber-400 flex-shrink-0">
                  {collapsedGroups.has(-1) ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </span>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-foreground truncate">단독 습관</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">그룹 없이 개별 관리</p>
                </div>
              </div>
              <span className="text-sm font-extrabold" style={{ color: "#D97706" }}>{ungroupedDoneCount}/{ungroupedItems.length}</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${ungroupedItems.length > 0 ? (ungroupedDoneCount / ungroupedItems.length) * 100 : 0}%`,
                  background: "linear-gradient(90deg, #FCD34D, #F59E0B)",
                }}
              />
            </div>
          </button>
          {!collapsedGroups.has(-1) && (
            <div className="border-t border-amber-100">
              {ungroupedItems.map((item) => (
                <HabitItem
                  key={item.id}
                  item={item}
                  done={checkedDailyIds.has(item.id)}
                  isLoading={completing === item.id}
                  isCompletingAny={completing !== null}
                  groups={habitGroups}
                  onComplete={() => completeHabit(item)}
                  mutate={mutate}
                  onConfirmDelete={onConfirmDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {ungroupedItems.length === 0 && habitGroups.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-4">+ 버튼으로 습관을 추가하세요</p>
      )}
    </>
  )
}
