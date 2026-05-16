"use client"

import { useState, Dispatch, SetStateAction } from "react"
import { Plus, X, Pencil, Clock, Bell } from "lucide-react"
import { useToast } from "@/contexts/ToastContext"

export interface TodoItem {
  id: number
  name: string
  suggested_exp: number
  is_completed: number
  exp_gained?: number
  ai_comment?: string
  notify_time?: string | null
  due_time?: string | null
}

type DeleteTarget = { type: "todo"; id: number; name: string }

interface TodoSectionProps {
  todoItems: TodoItem[]
  setTodoItems: Dispatch<SetStateAction<TodoItem[]>>
  setCompletedTodoCount: Dispatch<SetStateAction<number>>
  onConfirmDelete: (target: DeleteTarget) => void
  onExpGained?: () => void
}

export default function TodoSection({
  todoItems,
  setTodoItems,
  setCompletedTodoCount,
  onConfirmDelete,
  onExpGained,
}: TodoSectionProps) {
  const { showExp, showPenalty, showError } = useToast()
  const [completing, setCompleting] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newExp, setNewExp] = useState(0)
  const [newDueTime, setNewDueTime] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState("")
  const [editingExp, setEditingExp] = useState(0)
  const [notifyEditId, setNotifyEditId] = useState<number | null>(null)
  const [notifyEditVal, setNotifyEditVal] = useState("")

  const addTodo = async () => {
    if (!newName.trim()) return
    const dueTimeVal = newDueTime ? newDueTime.replace("T", " ") + ":00" : null
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, suggested_exp: newExp, due_time: dueTimeVal }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        showError(data?.error ?? "할 일 추가 실패")
        return
      }
      setTodoItems(data?.items ?? [])
      setNewName("")
      setNewExp(0)
      setNewDueTime("")
      setAdding(false)
    } catch {
      showError("네트워크 오류 — 잠시 후 다시 시도하세요")
    }
  }

  const saveTodoName = async (id: number) => {
    if (!editingName.trim()) return
    try {
      const res = await fetch("/api/todos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: editingName, suggested_exp: editingExp }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        showError(data?.error ?? "이름 수정 실패")
        return
      }
      setTodoItems(data?.items ?? [])
      setEditingId(null)
    } catch {
      showError("네트워크 오류 — 잠시 후 다시 시도하세요")
    }
  }

  const saveNotifyTime = async (id: number, time: string | null) => {
    try {
      const res = await fetch("/api/todos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, notify_time: time }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        showError(data?.error ?? "알림 저장 실패")
        return
      }
      setTodoItems(data?.items ?? [])
      setNotifyEditId(null)
    } catch {
      showError("네트워크 오류 — 잠시 후 다시 시도하세요")
    }
  }

  const completeTodo = async (item: TodoItem) => {
    if (item.is_completed) return
    const isAi = (item.suggested_exp ?? 0) === 0
    // AI: 응답 전까지 "처리 중..." 표시, 완료 처리는 응답 후. 비AI: 즉시 낙관적 완료.
    if (isAi) {
      setCompleting(item.id)
    } else {
      setTodoItems((prev) => prev.map((t) => t.id === item.id ? { ...t, is_completed: 1 } : t))
      setCompletedTodoCount((prev) => prev + 1)
    }
    try {
      const res = await fetch("/api/todos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        // 다른 디바이스/탭이 먼저 완료 → DB는 완료, UI도 완료로 유지
        if (data?.code === "already_completed") {
          setTodoItems((prev) => prev.map((t) => t.id === item.id ? { ...t, is_completed: 1 } : t))
          if (isAi) setCompletedTodoCount((prev) => prev + 1)
          return
        }
        if (!isAi) {
          setTodoItems((prev) => prev.map((t) => t.id === item.id ? { ...t, is_completed: 0 } : t))
          setCompletedTodoCount((prev) => Math.max(0, prev - 1))
        }
        showError(data?.error ?? "완료 처리 실패")
        return
      }
      if (isAi) setCompletedTodoCount((prev) => prev + 1)
      setTodoItems((prev) => prev.map((t) => t.id === item.id ? { ...t, is_completed: 1, exp_gained: data.exp } : t))
      if (data.penaltyApplied) {
        showPenalty(data.exp, data.comment)
      } else {
        showExp(data.exp, data.comment, data.bonusExp > 0 ? data.bonusExp : undefined)
      }
      onExpGained?.()
    } catch {
      if (!isAi) {
        setTodoItems((prev) => prev.map((t) => t.id === item.id ? { ...t, is_completed: 0 } : t))
        setCompletedTodoCount((prev) => Math.max(0, prev - 1))
      }
      showError("네트워크 오류 — 잠시 후 다시 시도하세요")
    } finally {
      if (isAi) setCompleting(null)
    }
  }

  return (
    <div className="mx-4 mt-2 rounded-2xl border border-violet-100 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between bg-violet-50 dark:bg-violet-900/30">
        <div className="flex items-center gap-2">
          <span className="text-sm">📋</span>
          <span className="text-sm font-bold text-foreground">할 일</span>
        </div>
        <button
          onClick={() => { setAdding(!adding); setNewName(""); setNewExp(0) }}
          className="w-7 h-7 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center active:scale-90 transition-transform"
          aria-label="할 일 추가"
        >
          {adding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        </button>
      </div>

      {adding && (
        <div className="px-4 py-2 flex flex-col gap-1.5 border-t border-violet-100 bg-violet-50/50 dark:bg-violet-950/30">
          <div className="flex gap-1.5">
            <input autoFocus type="text" value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTodo()}
              placeholder="할 일 이름..."
              className="flex-1 min-w-0 text-sm text-gray-900 bg-background border border-violet-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300"
            />
            <input type="number" value={newExp}
              onChange={(e) => setNewExp(Number(e.target.value))}
              className="w-14 text-sm text-center text-gray-900 bg-background border border-violet-200 rounded-xl px-1 py-2 outline-none"
              min={0}
            />
            <button onClick={addTodo} className="px-3 py-2 bg-violet-500 text-white rounded-xl text-sm font-bold active:scale-95">추가</button>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
            <input type="datetime-local" value={newDueTime}
              onChange={(e) => setNewDueTime(e.target.value)}
              className="flex-1 text-xs text-gray-700 bg-background border border-violet-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-violet-300"
            />
            {newDueTime && (
              <button onClick={() => setNewDueTime("")} className="text-muted-foreground"><X className="w-3 h-3" /></button>
            )}
          </div>
        </div>
      )}

      {todoItems.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-4">+ 버튼으로 할 일을 추가하세요</p>
      )}

      {[...todoItems].sort((a, b) => {
        const aDone = !!a.is_completed
        const bDone = !!b.is_completed
        if (aDone !== bDone) return aDone ? 1 : -1
        if (!a.due_time && !b.due_time) return 0
        if (!a.due_time) return -1
        if (!b.due_time) return 1
        return a.due_time.localeCompare(b.due_time)
      }).map((item) => {
        const done = !!item.is_completed
        const isLoading = completing === item.id
        const isEditingName = editingId === item.id

        return (
          <div key={item.id} className={`flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 transition-opacity ${done ? "opacity-50" : ""}`}>
            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <div className="flex items-center gap-1.5">
                  <input autoFocus type="text" value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveTodoName(item.id); if (e.key === "Escape") setEditingId(null) }}
                    className="flex-1 min-w-0 text-sm text-gray-900 bg-violet-50 dark:bg-violet-950/40 border border-violet-300 dark:border-violet-700 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-violet-300"
                  />
                  <input type="number" value={editingExp}
                    onChange={(e) => setEditingExp(Number(e.target.value))}
                    className="w-14 text-xs text-center text-gray-900 bg-violet-50 dark:bg-violet-950/40 border border-violet-300 dark:border-violet-700 rounded-lg px-1 py-0.5 outline-none flex-shrink-0"
                    min={0}
                  />
                  <button onClick={() => saveTodoName(item.id)} className="px-2.5 py-1 rounded-full text-xs font-bold text-violet-600 bg-violet-100 active:scale-95 flex-shrink-0">저장</button>
                  <button onClick={() => setEditingId(null)} className="text-muted-foreground flex-shrink-0"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className={`text-sm font-semibold leading-snug line-clamp-2 min-w-0 ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.name}</p>
                    {!done && (
                      <button onClick={() => { setEditingId(item.id); setEditingName(item.name); setEditingExp(item.suggested_exp ?? 0) }}
                        className="text-gray-300 hover:text-violet-400 transition-colors flex-shrink-0 p-0.5" aria-label="이름 수정">
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {!done && item.due_time && (() => {
                    const nowKstStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace("T", " ").slice(0, 19)
                    const expired = item.due_time < nowKstStr
                    return (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border self-start ${
                        expired ? "text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800" : "text-violet-600 bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800"
                      }`}>
                        {expired ? "⚠️ 기한초과" : `⏰ ${item.due_time.slice(5, 16).replace(" ", " ")}`}
                      </span>
                    )
                  })()}
                </div>
              )}
              {!isEditingName && notifyEditId === item.id && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Bell className="w-3 h-3 text-violet-400 flex-shrink-0" />
                  <input autoFocus type="time" value={notifyEditVal}
                    onChange={(e) => setNotifyEditVal(e.target.value)}
                    className="text-xs bg-background border border-violet-200 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-violet-300"
                  />
                  <button onClick={() => saveNotifyTime(item.id, notifyEditVal || null)}
                    className="text-xs font-bold text-violet-600 bg-violet-100 border border-violet-200 px-2 py-0.5 rounded-lg active:scale-95">저장</button>
                  {item.notify_time && (
                    <button onClick={() => saveNotifyTime(item.id, null)} className="text-xs text-muted-foreground active:scale-95">제거</button>
                  )}
                  <button onClick={() => setNotifyEditId(null)} className="text-muted-foreground"><X className="w-3 h-3" /></button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {!done && item.notify_time && notifyEditId !== item.id && (
                <button onClick={() => { setNotifyEditId(item.id); setNotifyEditVal(item.notify_time ?? "") }}
                  className="text-violet-400 flex items-center gap-0.5" aria-label="알림 설정">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold">{item.notify_time}</span>
                </button>
              )}
              {!done && !item.notify_time && notifyEditId !== item.id && (
                <button onClick={() => { setNotifyEditId(item.id); setNotifyEditVal("") }}
                  className="text-gray-300 hover:text-violet-400 transition-colors" aria-label="알림 설정">
                  <Clock className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => completeTodo(item)} disabled={done || isLoading}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all active:scale-95 ${
                  done ? "bg-muted text-muted-foreground cursor-not-allowed" :
                  isLoading ? "bg-violet-200 text-violet-700 animate-pulse cursor-wait" :
                  "bg-violet-100 text-violet-600 hover:bg-violet-200"
                }`}>
                {done ? "✓ 완료" : isLoading ? "처리 중..." : (item.suggested_exp ?? 0) === 0 ? "🤖 AI 판정" : `+${item.suggested_exp} EXP`}
              </button>
              <button onClick={() => onConfirmDelete({ type: "todo", id: item.id, name: item.name })}
                className="text-gray-300 hover:text-red-400 transition-colors p-0.5" aria-label="삭제">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
