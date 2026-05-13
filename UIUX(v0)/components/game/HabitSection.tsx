"use client"

import { useState, Dispatch, SetStateAction } from "react"
import { Plus, X, Pencil, Clock, Bell, ChevronDown, ChevronRight, FolderPlus, Layers } from "lucide-react"
import type { HabitGroup } from "@/lib/db"

export interface DailyItem {
  id: number
  name: string
  fixed_exp: number
  streak?: number
  notify_time?: string | null
  days_since_last?: number | null
  group_id?: number | null
}

type DeleteTarget = { type: "daily"; id: number; name: string }

interface HabitSectionProps {
  dailyItems: DailyItem[]
  setDailyItems: Dispatch<SetStateAction<DailyItem[]>>
  checkedDailyIds: Set<number>
  setCheckedDailyIds: Dispatch<SetStateAction<Set<number>>>
  habitGroups: HabitGroup[]
  setHabitGroups: Dispatch<SetStateAction<HabitGroup[]>>
  bonusGroupIds: Set<number>
  setBonusGroupIds: Dispatch<SetStateAction<Set<number>>>
  onToast: (exp: number, comment: string, bonus?: number, penalty?: boolean, penaltyExp?: number) => void
  onConfirmDelete: (target: DeleteTarget) => void
  onExpGained?: () => void
}

function streakInfo(streak: number) {
  const color =
    streak >= 100 ? "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800" :
    streak >= 30 ? "text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800" :
    streak >= 7 ? "text-orange-600 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800" :
    streak >= 1 ? "text-orange-500 bg-orange-50 dark:bg-orange-950/40 border-orange-100 dark:border-orange-800" :
    "text-muted-foreground bg-muted border-border"
  const label =
    streak >= 100 ? "🏆 완전 습관" :
    streak >= 90 ? `💫 ${streak}일 (루틴 완성)` :
    streak >= 60 ? `🔥 ${streak}일 (습관 완성!)` :
    streak >= 30 ? `🔥 ${streak}일 (자리잡는 중)` :
    streak >= 14 ? `🔥 ${streak}일 (유지 중)` :
    streak >= 7 ? `🔥 ${streak}일 (적응 중)` :
    streak >= 1 ? `🌱 ${streak}일 (시작)` : "아직 시작 전"
  return { color, label }
}

export default function HabitSection({
  dailyItems,
  setDailyItems,
  checkedDailyIds,
  setCheckedDailyIds,
  habitGroups,
  setHabitGroups,
  bonusGroupIds,
  setBonusGroupIds,
  onToast,
  onConfirmDelete,
  onExpGained,
}: HabitSectionProps) {
  const [completing, setCompleting] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [addingToGroup, setAddingToGroup] = useState<number | null>(null)
  const [newName, setNewName] = useState("")
  const [newExp, setNewExp] = useState(10)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState("")
  const [editingExp, setEditingExp] = useState(10)
  const [notifyEditId, setNotifyEditId] = useState<number | null>(null)
  const [notifyEditVal, setNotifyEditVal] = useState("")
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set())
  const [addingGroup, setAddingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null)
  const [editingGroupName, setEditingGroupName] = useState("")
  const [movingItemId, setMovingItemId] = useState<number | null>(null)

  const refreshFromResponse = (data: { items?: DailyItem[]; checkedIds?: number[]; groups?: HabitGroup[]; bonusGroupIds?: number[] }) => {
    if (data.items) setDailyItems(data.items)
    if (data.checkedIds) setCheckedDailyIds(new Set(data.checkedIds))
    if (data.groups) setHabitGroups(data.groups)
    if (data.bonusGroupIds) setBonusGroupIds(new Set(data.bonusGroupIds))
  }

  const callApi = async (method: string, body: object) => {
    const res = await fetch("/api/checklist", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.ok) refreshFromResponse(await res.json())
    return res
  }

  const addHabit = async (groupId?: number) => {
    if (!newName.trim()) return
    const body: Record<string, unknown> = { name: newName, suggested_exp: newExp }
    if (groupId) body.groupId = groupId
    await callApi("PUT", body)
    setNewName("")
    setAdding(false)
    setAddingToGroup(null)
  }

  const saveHabitName = async (id: number) => {
    if (!editingName.trim()) return
    await callApi("PUT", { id, name: editingName, fixed_exp: editingExp })
    setEditingId(null)
  }

  const saveNotifyTime = async (id: number, time: string | null) => {
    await callApi("PUT", { id, notify_time: time })
    setNotifyEditId(null)
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
        onToast(data.exp, data.comment, undefined, undefined, data.penaltyExp > 0 ? data.penaltyExp : undefined)
        setTimeout(() => {
          onToast(data.groupBonus, `'${data.groupName}' 스택 완성!`, data.groupBonus)
        }, 800)
      } else {
        onToast(data.exp, data.comment, data.bonusExp > 0 ? data.bonusExp : undefined, undefined, data.penaltyExp > 0 ? data.penaltyExp : undefined)
      }
      onExpGained?.()
    } finally {
      setCompleting(null)
    }
  }

  const createGroup = async () => {
    if (!newGroupName.trim()) return
    await callApi("PUT", { action: "addGroup", name: newGroupName.trim() })
    setNewGroupName("")
    setAddingGroup(false)
  }

  const saveGroupName = async (groupId: number) => {
    if (!editingGroupName.trim()) return
    await callApi("PUT", { action: "updateGroupName", groupId, name: editingGroupName.trim() })
    setEditingGroupId(null)
  }

  const removeGroup = async (groupId: number) => {
    await callApi("PUT", { action: "deleteGroup", groupId })
  }

  const moveItemToGroup = async (itemId: number, groupId: number | null) => {
    await callApi("PUT", { action: "setItemGroup", itemId, groupId })
    setMovingItemId(null)
  }

  const toggleGroup = (groupId: number) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  const ungroupedItems = dailyItems.filter((item) => !item.group_id)
  const ungroupedDoneCount = ungroupedItems.filter((item) => checkedDailyIds.has(item.id)).length

  const renderHabitItem = (item: DailyItem, fromGroup?: HabitGroup) => {
    const done = checkedDailyIds.has(item.id)
    const isLoading = completing === item.id
    const streak = item.streak ?? 0
    const { color: streakColor, label: streakLabel } = streakInfo(streak)
    const isEditingName = editingId === item.id
    const isMoving = movingItemId === item.id

    return (
      <div
        key={item.id}
        className={`flex items-center gap-2.5 px-3 py-2.5 border-b border-amber-50 last:border-b-0 transition-colors ${done ? "bg-amber-50/20" : "bg-background"}`}
      >
        <button
          onClick={() => completeHabit(item)}
          disabled={done || completing !== null}
          className="w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-all active:scale-95"
          style={{ borderColor: done ? "#F59E0B" : "#D1D5DB", background: done ? "#F59E0B" : "transparent" }}
          aria-label={done ? "완료됨" : "습관 완료"}
        >
          {done && <span className="text-white text-[9px] font-black leading-none">✓</span>}
          {isLoading && !done && <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />}
        </button>

        <div className={`flex-1 min-w-0 ${done ? "opacity-55" : ""}`}>
          {isEditingName ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveHabitName(item.id); if (e.key === "Escape") setEditingId(null) }}
                className="flex-1 min-w-0 text-sm text-gray-900 dark:text-gray-100 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-amber-300"
              />
              <input
                type="number"
                value={editingExp}
                onChange={(e) => setEditingExp(Number(e.target.value))}
                className="w-14 text-xs text-center text-gray-900 dark:text-gray-100 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-lg px-1 py-0.5 outline-none flex-shrink-0"
                min={1}
              />
              <button onClick={() => saveHabitName(item.id)} className="px-2.5 py-1 rounded-full text-xs font-bold text-amber-600 bg-amber-100 active:scale-95 flex-shrink-0">저장</button>
              <button onClick={() => setEditingId(null)} className="text-muted-foreground flex-shrink-0"><X className="w-3 h-3" /></button>
            </div>
          ) : isMoving ? (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <span className="text-xs text-muted-foreground self-center">이동:</span>
              {fromGroup && (
                <button
                  onClick={() => moveItemToGroup(item.id, null)}
                  className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground active:scale-95"
                >
                  그룹 없음
                </button>
              )}
              {habitGroups.filter((g) => g.id !== fromGroup?.id).map((g) => (
                <button
                  key={g.id}
                  onClick={() => moveItemToGroup(item.id, g.id)}
                  className="text-[10px] px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 active:scale-95"
                >
                  {g.name}
                </button>
              ))}
              <button onClick={() => setMovingItemId(null)} className="text-muted-foreground ml-1"><X className="w-3 h-3" /></button>
            </div>
          ) : (
            <div className="flex flex-col gap-1 min-w-0">
              <p className={`text-sm font-semibold leading-snug truncate ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.name}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${streakColor}`}>{streakLabel}</span>
                {!done && (
                  <button
                    onClick={() => { setNotifyEditId(item.id); setNotifyEditVal(item.notify_time ?? "") }}
                    className={`flex-shrink-0 flex items-center gap-0.5 transition-colors active:scale-95 ${item.notify_time ? "text-amber-500" : "text-gray-300 hover:text-amber-400"}`}
                    aria-label="알림 설정"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {item.notify_time && <span className="text-[10px] font-bold">{item.notify_time}</span>}
                  </button>
                )}
              </div>

              {!done && (item.days_since_last ?? 0) >= 2 && (() => {
                const missed = (item.days_since_last ?? 2) - 1
                const msg = missed === 1 ? "어제 못했어요, 오늘 다시 시작해봐요! 💪" :
                  missed <= 3 ? `${missed}일 쉬었어요, 오늘부터 다시! 🌱` :
                  `${missed}일 쉬었어요... 패널티가 쌓이고 있어요 ⚠️`
                return <p className="text-[10px] font-medium text-orange-500 leading-snug">{msg}</p>
              })()}
            </div>
          )}

          {!isEditingName && !isMoving && notifyEditId === item.id && (
            <div className="flex items-center gap-1.5 mt-1">
              <Bell className="w-3 h-3 text-amber-400 flex-shrink-0" />
              <input
                autoFocus
                type="time"
                value={notifyEditVal}
                onChange={(e) => setNotifyEditVal(e.target.value)}
                className="text-xs bg-background border border-amber-200 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-amber-300"
              />
              <button onClick={() => saveNotifyTime(item.id, notifyEditVal || null)}
                className="text-xs font-bold text-amber-600 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg active:scale-95">저장</button>
              {item.notify_time && (
                <button onClick={() => saveNotifyTime(item.id, null)} className="text-xs text-muted-foreground active:scale-95">제거</button>
              )}
              <button onClick={() => setNotifyEditId(null)} className="text-muted-foreground"><X className="w-3 h-3" /></button>
            </div>
          )}
        </div>

        {!isEditingName && !isMoving && (
          <div className="flex items-center gap-1.5 flex-shrink-0 self-start">
            <button
              onClick={() => completeHabit(item)}
              disabled={done || completing !== null}
              className="px-2.5 py-1 rounded-full text-xs font-bold transition-all active:scale-95"
              style={done ? { background: "#F3F4F6", color: "#9CA3AF" } : { background: "#FFF4D6", color: "#D97706" }}
              aria-label={done ? "완료됨" : "경험치 받고 완료"}
            >
              {done ? "✓ 완료" : isLoading ? "처리 중..." : `+${item.fixed_exp} EXP`}
            </button>
            {!done && (
              <>
                <button onClick={() => { setEditingId(item.id); setEditingName(item.name); setEditingExp(item.fixed_exp) }}
                  className="text-gray-300 hover:text-amber-400 transition-colors p-0.5" aria-label="이름 수정">
                  <Pencil className="w-3 h-3" />
                </button>
                {habitGroups.length > 0 && (
                  <button onClick={() => setMovingItemId(item.id)}
                    className="text-gray-300 hover:text-amber-400 transition-colors p-0.5" aria-label="그룹 이동">
                    <Layers className="w-3 h-3" />
                  </button>
                )}
              </>
            )}
            <button onClick={() => onConfirmDelete({ type: "daily", id: item.id, name: item.name })}
              className="text-gray-300 hover:text-red-400 transition-colors p-0.5" aria-label="삭제">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    )
  }

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
            autoFocus
            type="text"
            value={newGroupName}
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
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addHabit()}
            placeholder="예: 아침 식사 후 물 한 잔"
            className="flex-1 min-w-0 text-sm text-gray-900 dark:text-gray-100 bg-background border border-amber-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-amber-300"
          />
          <input
            type="number"
            value={newExp}
            onChange={(e) => setNewExp(Number(e.target.value))}
            className="w-14 text-sm text-center text-gray-900 dark:text-gray-100 bg-background border border-amber-200 rounded-xl px-1 py-2 outline-none"
            min={1}
          />
          <button onClick={() => addHabit()} className="px-3 py-2 bg-amber-400 text-white rounded-xl text-sm font-bold active:scale-95">추가</button>
        </div>
      )}

      {habitGroups.map((group) => {
        const collapsed = collapsedGroups.has(group.id)
        const total = group.items.length
        const checked = group.items.filter((it) => checkedDailyIds.has(it.id)).length
        const allDone = total > 0 && checked === total
        const hasBonus = bonusGroupIds.has(group.id)
        const progressPct = total > 0 ? (checked / total) * 100 : 0

        return (
          <div
            key={group.id}
            className="mx-4 mt-2 bg-background rounded-2xl overflow-hidden"
            style={{ border: allDone ? "1.5px solid #F6B73C" : "1px solid #FDE7B2", boxShadow: allDone ? "inset 3px 0 0 #F59E0B" : undefined }}
          >
            <button
              className={`w-full px-4 pt-3 pb-2.5 text-left transition-colors rounded-t-2xl ${allDone ? "bg-amber-50/80 dark:bg-amber-900/20" : "bg-background"}`}
              onClick={() => toggleGroup(group.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <span className="text-amber-400 flex-shrink-0">
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    {editingGroupId === group.id ? (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          autoFocus
                          type="text"
                          value={editingGroupName}
                          onChange={(e) => setEditingGroupName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveGroupName(group.id); if (e.key === "Escape") setEditingGroupId(null) }}
                          className="flex-1 min-w-0 text-sm text-gray-900 dark:text-gray-100 bg-background border border-amber-300 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-amber-300"
                        />
                        <button onClick={() => saveGroupName(group.id)} className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-lg active:scale-95">저장</button>
                        <button onClick={() => setEditingGroupId(null)} className="text-muted-foreground"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-sm font-bold text-foreground truncate">{group.name}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingGroupId(group.id); setEditingGroupName(group.name) }}
                            className="text-gray-300 hover:text-amber-400 transition-colors flex-shrink-0 p-0.5"
                            aria-label="그룹 이름 수정"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          {hasBonus && <span className="text-[10px] font-bold text-amber-500 flex-shrink-0">✓ 스택 완성</span>}
                          <span className="text-sm font-extrabold" style={{ color: "#D97706" }}>{checked}/{total}</span>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #FCD34D, #F59E0B)" }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {editingGroupId !== group.id && (
                  <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setAddingToGroup(addingToGroup === group.id ? null : group.id); setNewName(""); setNewExp(10) }}
                      className="text-gray-300 hover:text-amber-400 transition-colors p-0.5">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeGroup(group.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors p-0.5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </button>

            {addingToGroup === group.id && (
              <div className="px-4 py-2 flex gap-1.5 border-t border-amber-100 bg-amber-50/30">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addHabit(group.id)}
                  placeholder="습관 이름"
                  className="flex-1 min-w-0 text-sm text-gray-900 dark:text-gray-100 bg-background border border-amber-200 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-amber-300"
                />
                <input
                  type="number"
                  value={newExp}
                  onChange={(e) => setNewExp(Number(e.target.value))}
                  className="w-14 text-sm text-center text-gray-900 dark:text-gray-100 bg-background border border-amber-200 rounded-xl px-1 py-1.5 outline-none"
                  min={1}
                />
                <button onClick={() => addHabit(group.id)} className="px-3 py-1.5 bg-amber-400 text-white rounded-xl text-sm font-bold active:scale-95">추가</button>
              </div>
            )}

            {!collapsed && (
              <div className="border-t border-amber-100">
                {group.items.length === 0 ? (
                  <p className="text-center text-muted-foreground text-xs py-3">+ 버튼으로 습관을 추가하세요</p>
                ) : (
                  group.items.map((item) => renderHabitItem(item as DailyItem, group))
                )}
              </div>
            )}
          </div>
        )
      })}

      {ungroupedItems.length > 0 && (
        <div className="mx-4 mt-2 bg-background rounded-2xl overflow-hidden" style={{ border: "1px solid #FDE7B2" }}>
          <button
            onClick={() => toggleGroup(-1)}
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
              {ungroupedItems.map((item) => renderHabitItem(item))}
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
