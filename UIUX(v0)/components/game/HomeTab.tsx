"use client"

import { useState, useEffect, useCallback } from "react"
import { Send, CheckCircle2, Gift, Clock, Flame } from "lucide-react"

interface ActivityLog {
  id: number
  input_text: string
  exp_gained: number
  ai_comment: string
}

interface HabitItem {
  id: number
  name: string
  streak: number
  fixed_exp: number
}

interface RoutineItem {
  id: number
  name: string
  deadline_time: string | null
}

interface HomeTabProps {
  onExpGained: () => void
  refreshTick?: number
}

export default function HomeTab({ onExpGained, refreshTick }: HomeTabProps) {
  const [actText, setActText] = useState("")
  const [actSubmitting, setActSubmitting] = useState(false)
  const [actLogs, setActLogs] = useState<ActivityLog[]>([])
  const [actToast, setActToast] = useState<{ exp: number; comment: string } | null>(null)
  const [actError, setActError] = useState<string | null>(null)

  const [attended, setAttended] = useState(false)
  const [attendLoading, setAttendLoading] = useState(false)
  const [streak, setStreak] = useState(0)
  const [attendToast, setAttendToast] = useState<{ bonusTickets: number } | null>(null)

  const [habits, setHabits] = useState<HabitItem[]>([])
  const [checkedHabitIds, setCheckedHabitIds] = useState<Set<number>>(new Set())
  const [routines, setRoutines] = useState<RoutineItem[]>([])

  const fetchActLogs = useCallback(async () => {
    const res = await fetch("/api/activities?type=ai&limit=5")
    if (res.ok) setActLogs(await res.json())
  }, [])

  const fetchAttendance = useCallback(async () => {
    const res = await fetch("/api/attendance")
    if (res.ok) {
      const data = await res.json()
      setAttended(data.checked)
      setStreak(data.streak)
    }
  }, [])

  const fetchHabits = useCallback(async () => {
    const res = await fetch("/api/checklist")
    if (res.ok) {
      const data = await res.json()
      setHabits(data.items ?? [])
      setCheckedHabitIds(new Set(data.checkedIds ?? []))
    }
  }, [])

  const fetchRoutines = useCallback(async () => {
    const res = await fetch("/api/routines")
    if (res.ok) {
      const data = await res.json()
      setRoutines((data.routines ?? []).filter((r: RoutineItem) => r.deadline_time))
    }
  }, [])

  useEffect(() => {
    fetchActLogs()
    fetchAttendance()
    fetchHabits()
    fetchRoutines()
  }, [fetchActLogs, fetchAttendance, fetchHabits, fetchRoutines, refreshTick])

  const handleAttendance = async () => {
    if (attended || attendLoading) return
    setAttendLoading(true)
    try {
      const res = await fetch("/api/attendance", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        setAttended(true)
        setStreak(data.streak)
        setAttendToast({ bonusTickets: data.bonusTickets })
        setTimeout(() => setAttendToast(null), 3500)
        onExpGained()
      }
    } finally {
      setAttendLoading(false)
    }
  }

  const nextMilestone = streak < 7 ? 7 : 14
  const milestoneBonus = nextMilestone === 7 ? 5 : 10

  const submitActivity = async () => {
    if (!actText.trim() || actSubmitting) return
    setActSubmitting(true)
    setActError(null)
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: actText }),
      })
      const data = await res.json()
      if (!res.ok) { setActError(data.error ?? "오류"); return }
      setActText("")
      setActToast({ exp: data.exp, comment: data.comment })
      setTimeout(() => setActToast(null), 3000)
      onExpGained()
      fetchActLogs()
    } finally {
      setActSubmitting(false)
    }
  }

  // 오늘 획득 XP 합계
  const todayXp = actLogs.reduce((s, l) => s + l.exp_gained, 0)

  // 최고 스트릭 습관
  const maxStreak = habits.reduce((mx, h) => Math.max(mx, h.streak ?? 0), 0)

  // 다음 일정: deadline_time이 있는 루틴 중 현재 시간 이후 첫 번째
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
  const nextRoutine = routines
    .filter(r => r.deadline_time)
    .sort((a, b) => {
      const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
      return toMins(a.deadline_time!) - toMins(b.deadline_time!)
    })
    .find(r => {
      const [h, m] = r.deadline_time!.split(':').map(Number)
      return (h * 60 + m) >= nowMins - 30
    })

  const topHabit = habits.filter(h => !checkedHabitIds.has(h.id)).sort((a, b) => (b.streak ?? 0) - (a.streak ?? 0))[0]

  return (
    <div className="flex flex-col gap-0 pb-6">

      {/* 출석체크 */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden shadow-sm" style={{ border: '1px solid #FFE0BF', background: 'linear-gradient(135deg, #FFF8EE 0%, #FFEDD5 100%)' }}>
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black uppercase tracking-wide" style={{ color: '#B5651D' }}>🗓️ 오늘의 출석</p>
            {attendToast && attendToast.bonusTickets > 0 ? (
              <p className="text-xs font-black text-violet-500 mt-0.5">
                🎉 {streak === 0 ? "14" : "7"}일 연속! 뽑기권 +{attendToast.bonusTickets} 보너스!
              </p>
            ) : attendToast ? (
              <p className="text-xs font-black text-violet-500 mt-0.5">뽑기권 +1 획득!</p>
            ) : attended ? (
              <p className="text-xs text-muted-foreground mt-0.5">오늘 출석 완료</p>
            ) : null}
          </div>
          <button
            onClick={handleAttendance}
            disabled={attended || attendLoading}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black transition active:scale-95 flex-shrink-0
              ${attended
                ? "bg-muted text-muted-foreground cursor-default"
                : "bg-violet-500 text-white shadow-sm"
              }`}
          >
            {attended ? (
              <><CheckCircle2 className="w-4 h-4" /> 완료</>
            ) : (
              <><Gift className="w-4 h-4" />{attendLoading ? "..." : "출석 체크"}</>
            )}
          </button>
        </div>

        {/* 연속 출석 진행바 */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-muted-foreground">
              연속 <span className="font-black text-violet-500">{streak}일</span>
            </span>
            <span className="text-[11px] text-muted-foreground">
              {nextMilestone}일 달성 시 뽑기권 +{milestoneBonus}
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-400 rounded-full transition-all duration-500"
              style={{ width: `${(streak / nextMilestone) * 100}%` }}
            />
          </div>
          <div className="flex mt-1">
            {Array.from({ length: nextMilestone }, (_, i) => (
              <div key={i} className="flex-1 flex justify-end">
                <div className={`w-1 h-1 rounded-full ${i < streak ? "bg-violet-400" : "bg-muted"}`} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 미니 스탯 그리드 */}
      <div className="mx-4 mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-background p-2.5 flex flex-col gap-1 shadow-sm">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#E5F4ED' }}>
            <span className="text-xs">✓</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">습관 완료</p>
          <p className="text-sm font-extrabold">{checkedHabitIds.size} / {habits.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-2.5 flex flex-col gap-1 shadow-sm">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#FFF1E0' }}>
            <Flame className="w-3.5 h-3.5" style={{ color: '#B5651D' }} />
          </div>
          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">최고 스트릭</p>
          <p className="text-sm font-extrabold">{maxStreak}일</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-2.5 flex flex-col gap-1 shadow-sm">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#F0ECFB' }}>
            <span className="text-xs" style={{ color: '#A89BF0' }}>✦</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">오늘 획득</p>
          <p className="text-sm font-extrabold">+{todayXp} XP</p>
        </div>
      </div>

      {/* 오늘의 활동 */}
      <div className="mx-4 mt-3 rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-3 bg-background">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black text-muted-foreground uppercase tracking-wide">✍️ 오늘의 활동</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#EFEAFE', color: '#6E59F2' }}>🤖 AI 자동 채점</span>
          </div>

          {actToast && (
            <div className="mb-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex flex-col gap-0.5">
              <span className="text-sm font-black text-amber-600">+{actToast.exp} EXP!</span>
              <span className="text-xs text-amber-500 leading-snug">{actToast.comment}</span>
            </div>
          )}
          {actError && (
            <div className="mb-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <p className="text-xs text-red-600">{actError}</p>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={actText}
              onChange={(e) => setActText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitActivity()}
              placeholder="오늘 한 일을 입력하세요..."
              style={{ fontSize: '16px' }}
              className="flex-1 min-w-0 bg-muted border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-300 transition"
              disabled={actSubmitting}
            />
            <button
              onClick={submitActivity}
              disabled={actSubmitting || !actText.trim()}
              className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center text-white disabled:opacity-40 active:scale-95 flex-shrink-0"
            >
              {actSubmitting ? (
                <span className="text-[9px] font-black animate-pulse">AI</span>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          {actSubmitting && (
            <p className="text-[11px] text-amber-400 mt-1.5 text-center animate-pulse">
              AI 게임 마스터가 판정 중...
            </p>
          )}
        </div>

        {actLogs.length > 0 && (
          <div className="border-t border-border">
            {actLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 px-4 py-2.5 border-b border-border last:border-0 bg-background">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{log.input_text}</p>
                  <p className="text-[10px] text-muted-foreground leading-snug break-keep">{log.ai_comment}</p>
                </div>
                <span className="text-xs font-black text-amber-500 flex-shrink-0">+{log.exp_gained}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 다음 일정 */}
      {(nextRoutine || topHabit) && (
        <div className="mx-4 mt-3 rounded-2xl border border-border bg-background shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-1 flex items-center justify-between">
            <p className="text-xs font-black text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> 다음 일정
            </p>
          </div>
          {nextRoutine && (
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#E5F4ED' }}>
                <Clock className="w-4 h-4" style={{ color: '#5BA888' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{nextRoutine.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">⏰ {nextRoutine.deadline_time}까지 · 2배 보너스</p>
              </div>
            </div>
          )}
          {topHabit && (
            <div className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FFF1E0' }}>
                <Flame className="w-4 h-4" style={{ color: '#B5651D' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{topHabit.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">🔥 {topHabit.streak}일 스트릭 중</p>
              </div>
              <span className="text-[11px] font-bold text-amber-500 flex-shrink-0">+{topHabit.fixed_exp} EXP</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
