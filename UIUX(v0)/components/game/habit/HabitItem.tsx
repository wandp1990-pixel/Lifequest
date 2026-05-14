/**
 * @module components/game/habit/HabitItem
 * @purpose 단일 습관 행. 이름/EXP 인라인 수정, 알림 시간 편집, 그룹 이동, 완료 버튼.
 *          state: editingName/editingExp/notify/moving 자체 보유.
 *          props.mutate: PUT body 그대로 callApi로 전달 — 응답으로 부모 state 일괄 갱신.
 */

"use client"

import { useState } from "react"
import { Clock, Bell, Pencil, Layers, X } from "lucide-react"
import type { HabitGroup } from "@/lib/db"
import type { DailyItem, DeleteTarget } from "./types"
import { streakInfo } from "./streakInfo"

interface Props {
  item: DailyItem
  done: boolean
  isLoading: boolean
  isCompletingAny: boolean
  groups: HabitGroup[]
  fromGroup?: HabitGroup
  onComplete: () => void
  mutate: (body: object) => Promise<void>
  onConfirmDelete: (target: DeleteTarget) => void
}

export default function HabitItem({
  item, done, isLoading, isCompletingAny,
  groups, fromGroup, onComplete, mutate, onConfirmDelete,
}: Props) {
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(item.name)
  const [expVal, setExpVal] = useState(item.fixed_exp)
  const [editingNotify, setEditingNotify] = useState(false)
  const [notifyVal, setNotifyVal] = useState("")
  const [moving, setMoving] = useState(false)

  const streak = item.streak ?? 0
  const { color: streakColor, label: streakLabel } = streakInfo(streak)

  const saveName = async () => {
    if (!nameVal.trim()) return
    await mutate({ id: item.id, name: nameVal, fixed_exp: expVal })
    setEditingName(false)
  }

  const saveNotify = async (time: string | null) => {
    await mutate({ id: item.id, notify_time: time })
    setEditingNotify(false)
  }

  const moveTo = async (groupId: number | null) => {
    await mutate({ action: "setItemGroup", itemId: item.id, groupId })
    setMoving(false)
  }

  return (
    <div className={`flex items-center gap-2.5 px-3 py-2.5 border-b border-amber-50 last:border-b-0 transition-colors ${done ? "bg-amber-50/20" : "bg-background"}`}>
      <button
        onClick={onComplete}
        disabled={done || isCompletingAny}
        className="w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-all active:scale-95"
        style={{ borderColor: done ? "#F59E0B" : "#D1D5DB", background: done ? "#F59E0B" : "transparent" }}
        aria-label={done ? "완료됨" : "습관 완료"}
      >
        {done && <span className="text-white text-[9px] font-black leading-none">✓</span>}
        {isLoading && !done && <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />}
      </button>

      <div className={`flex-1 min-w-0 ${done ? "opacity-55" : ""}`}>
        {editingName ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus type="text" value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false) }}
              className="flex-1 min-w-0 text-sm text-gray-900 dark:text-gray-100 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-amber-300"
            />
            <input
              type="number" value={expVal}
              onChange={(e) => setExpVal(Number(e.target.value))}
              className="w-14 text-xs text-center text-gray-900 dark:text-gray-100 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-lg px-1 py-0.5 outline-none flex-shrink-0"
              min={1}
            />
            <button onClick={saveName} className="px-2.5 py-1 rounded-full text-xs font-bold text-amber-600 bg-amber-100 active:scale-95 flex-shrink-0">저장</button>
            <button onClick={() => setEditingName(false)} className="text-muted-foreground flex-shrink-0"><X className="w-3 h-3" /></button>
          </div>
        ) : moving ? (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <span className="text-xs text-muted-foreground self-center">이동:</span>
            {fromGroup && (
              <button onClick={() => moveTo(null)} className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground active:scale-95">그룹 없음</button>
            )}
            {groups.filter((g) => g.id !== fromGroup?.id).map((g) => (
              <button key={g.id} onClick={() => moveTo(g.id)} className="text-[10px] px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 active:scale-95">{g.name}</button>
            ))}
            <button onClick={() => setMoving(false)} className="text-muted-foreground ml-1"><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <div className="flex flex-col gap-1 min-w-0">
            <p className={`text-sm font-semibold leading-snug truncate ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.name}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${streakColor}`}>{streakLabel}</span>
              {!done && (
                <button
                  onClick={() => { setEditingNotify(true); setNotifyVal(item.notify_time ?? "") }}
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

        {!editingName && !moving && editingNotify && (
          <div className="flex items-center gap-1.5 mt-1">
            <Bell className="w-3 h-3 text-amber-400 flex-shrink-0" />
            <input
              autoFocus type="time" value={notifyVal}
              onChange={(e) => setNotifyVal(e.target.value)}
              className="text-xs bg-background border border-amber-200 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-amber-300"
            />
            <button onClick={() => saveNotify(notifyVal || null)} className="text-xs font-bold text-amber-600 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg active:scale-95">저장</button>
            {item.notify_time && (
              <button onClick={() => saveNotify(null)} className="text-xs text-muted-foreground active:scale-95">제거</button>
            )}
            <button onClick={() => setEditingNotify(false)} className="text-muted-foreground"><X className="w-3 h-3" /></button>
          </div>
        )}
      </div>

      {!editingName && !moving && (
        <div className="flex items-center gap-1.5 flex-shrink-0 self-start">
          <button
            onClick={onComplete}
            disabled={done || isCompletingAny}
            className="px-2.5 py-1 rounded-full text-xs font-bold transition-all active:scale-95"
            style={done ? { background: "#F3F4F6", color: "#9CA3AF" } : { background: "#FFF4D6", color: "#D97706" }}
            aria-label={done ? "완료됨" : "경험치 받고 완료"}
          >
            {done ? "✓ 완료" : isLoading ? "처리 중..." : `+${item.fixed_exp} EXP`}
          </button>
          {!done && (
            <>
              <button
                onClick={() => { setEditingName(true); setNameVal(item.name); setExpVal(item.fixed_exp) }}
                className="text-gray-300 hover:text-amber-400 transition-colors p-0.5" aria-label="이름 수정"
              >
                <Pencil className="w-3 h-3" />
              </button>
              {groups.length > 0 && (
                <button onClick={() => setMoving(true)} className="text-gray-300 hover:text-amber-400 transition-colors p-0.5" aria-label="그룹 이동">
                  <Layers className="w-3 h-3" />
                </button>
              )}
            </>
          )}
          <button onClick={() => onConfirmDelete({ type: "daily", id: item.id, name: item.name })} className="text-gray-300 hover:text-red-400 transition-colors p-0.5" aria-label="삭제">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
