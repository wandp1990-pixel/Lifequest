/**
 * @module components/game/habit/HabitGroupCard
 * @purpose 습관 그룹 카드. 헤더(접기/이름 편집/추가/삭제) + 진행률 + 항목 목록.
 *          state: editingName/addingItem/newName/newExp 자체 보유. collapsed state는 부모.
 */

"use client"

import { useState } from "react"
import { Plus, X, Pencil, ChevronDown, ChevronRight } from "lucide-react"
import type { HabitGroup } from "@/lib/db"
import type { DailyItem, DeleteTarget } from "./types"
import HabitItem from "./HabitItem"

interface Props {
  group: HabitGroup
  groups: HabitGroup[]
  checkedIds: Set<number>
  completing: number | null
  bonusGranted: boolean
  collapsed: boolean
  toggleCollapsed: () => void
  mutate: (body: object) => Promise<void>
  onCompleteItem: (item: DailyItem) => void
  onConfirmDelete: (target: DeleteTarget) => void
}

export default function HabitGroupCard({
  group, groups, checkedIds, completing, bonusGranted,
  collapsed, toggleCollapsed, mutate, onCompleteItem, onConfirmDelete,
}: Props) {
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(group.name)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newExp, setNewExp] = useState(10)

  const total = group.items.length
  const checked = group.items.filter((it) => checkedIds.has(it.id)).length
  const allDone = total > 0 && checked === total
  const progressPct = total > 0 ? (checked / total) * 100 : 0

  const saveName = async () => {
    if (!nameVal.trim()) return
    await mutate({ action: "updateGroupName", groupId: group.id, name: nameVal.trim() })
    setEditingName(false)
  }

  const remove = async () => {
    await mutate({ action: "deleteGroup", groupId: group.id })
  }

  const addItem = async () => {
    if (!newName.trim()) return
    await mutate({ name: newName, suggested_exp: newExp, groupId: group.id })
    setNewName(""); setNewExp(10); setAdding(false)
  }

  return (
    <div
      className="mx-4 mt-2 bg-background rounded-2xl overflow-hidden"
      style={{ border: allDone ? "1.5px solid #F6B73C" : "1px solid #FDE7B2", boxShadow: allDone ? "inset 3px 0 0 #F59E0B" : undefined }}
    >
      <button
        className={`w-full px-4 pt-3 pb-2.5 text-left transition-colors rounded-t-2xl ${allDone ? "bg-amber-50/80 dark:bg-amber-900/20" : "bg-background"}`}
        onClick={toggleCollapsed}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <span className="text-amber-400 flex-shrink-0">
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    autoFocus type="text" value={nameVal}
                    onChange={(e) => setNameVal(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false) }}
                    className="flex-1 min-w-0 text-sm text-gray-900 dark:text-gray-100 bg-background border border-amber-300 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-amber-300"
                  />
                  <button onClick={saveName} className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-lg active:scale-95">저장</button>
                  <button onClick={() => setEditingName(false)} className="text-muted-foreground"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-sm font-bold text-foreground truncate">{group.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingName(true); setNameVal(group.name) }}
                      className="text-gray-300 hover:text-amber-400 transition-colors flex-shrink-0 p-0.5"
                      aria-label="그룹 이름 수정"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    {bonusGranted && <span className="text-[10px] font-bold text-amber-500 flex-shrink-0">✓ 스택 완성</span>}
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
          {!editingName && (
            <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => { setAdding(!adding); setNewName(""); setNewExp(10) }} className="text-gray-300 hover:text-amber-400 transition-colors p-0.5">
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button onClick={remove} className="text-gray-300 hover:text-red-400 transition-colors p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </button>

      {adding && (
        <div className="px-4 py-2 flex gap-1.5 border-t border-amber-100 bg-amber-50/30">
          <input
            autoFocus type="text" value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder="습관 이름"
            className="flex-1 min-w-0 text-sm text-gray-900 dark:text-gray-100 bg-background border border-amber-200 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-amber-300"
          />
          <input
            type="number" value={newExp}
            onChange={(e) => setNewExp(Number(e.target.value))}
            className="w-14 text-sm text-center text-gray-900 dark:text-gray-100 bg-background border border-amber-200 rounded-xl px-1 py-1.5 outline-none"
            min={1}
          />
          <button onClick={addItem} className="px-3 py-1.5 bg-amber-400 text-white rounded-xl text-sm font-bold active:scale-95">추가</button>
        </div>
      )}

      {!collapsed && (
        <div className="border-t border-amber-100">
          {group.items.length === 0 ? (
            <p className="text-center text-muted-foreground text-xs py-3">+ 버튼으로 습관을 추가하세요</p>
          ) : (
            group.items.map((item) => (
              <HabitItem
                key={item.id}
                item={item as DailyItem}
                done={checkedIds.has(item.id)}
                isLoading={completing === item.id}
                isCompletingAny={completing !== null}
                groups={groups}
                fromGroup={group}
                onComplete={() => onCompleteItem(item as DailyItem)}
                mutate={mutate}
                onConfirmDelete={onConfirmDelete}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
