"use client"

import { useState, useEffect, useCallback } from "react"
import { Send, CheckCircle2, Flame, AlertTriangle } from "lucide-react"

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

interface UrgentProject {
  id: number
  name: string
  due_date: string
  status: string
  priority: string
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
  const [urgentProjects, setUrgentProjects] = useState<UrgentProject[]>([])

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

  const fetchUrgentProjects = useCallback(async () => {
    const res = await fetch("/api/projects")
    if (!res.ok) return
    const data = await res.json()
    const now = Date.now()
    const urgent = (data.projects ?? []).filter((p: UrgentProject) => {
      if (!p.due_date || p.status === "done") return false
      const diff = new Date(p.due_date).getTime() - now
      return diff < 3 * 24 * 60 * 60 * 1000
    })
    setUrgentProjects(urgent)
  }, [])

  useEffect(() => {
    fetchActLogs()
    fetchAttendance()
    fetchHabits()
    fetchRoutines()
    fetchUrgentProjects()
  }, [fetchActLogs, fetchAttendance, fetchHabits, fetchRoutines, fetchUrgentProjects, refreshTick])

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

  const today = new Date()
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  const todayStr = `TODAY · ${dayNames[today.getDay()]}요일`
  const questTitle = `${today.getMonth() + 1}월 ${today.getDate()}일의 퀘스트`
  const remaining = nextMilestone - (streak % nextMilestone || (streak > 0 && streak % nextMilestone === 0 ? nextMilestone : nextMilestone - streak % nextMilestone))
  const daysLeft = nextMilestone - Math.min(streak, nextMilestone)

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



  return (
    <div className="flex flex-col gap-0 pb-6">

      {/* 출석체크 — 디자인 스타일 */}
      <div className="mx-4 mt-4 rounded-2xl px-4 pt-3 pb-4 relative overflow-hidden" style={{ border: '1px solid #FFE0BF', background: 'linear-gradient(135deg, #FFF8EE 0%, #FFEDD5 100%)' }}>
        {/* 배경 장식 원 */}
        <div className="absolute" style={{ right: -30, top: -30, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,138,61,0.08)' }} />

        {/* 상단: 제목 + 연속일 배지 */}
        <div className="flex items-start justify-between relative">
          <div>
            <p className="text-[11px] font-bold tracking-wider" style={{ color: '#B5651D', letterSpacing: '0.04em' }}>{todayStr}</p>
            <p className="text-[17px] font-extrabold text-foreground mt-0.5 leading-tight">{questTitle}</p>
            {attendToast && attendToast.bonusTickets > 0 && (
              <p className="text-xs font-black text-violet-500 mt-1">🎉 뽑기권 +{attendToast.bonusTickets} 보너스!</p>
            )}
          </div>
          <div className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 flex-shrink-0" style={{ background: 'white', border: '1px solid #FFE0BF', color: '#B5651D' }}>
            <Flame className="w-3.5 h-3.5" style={{ color: '#FFB87A' }} />
            <span className="text-xs font-extrabold">{streak}일 연속</span>
          </div>
        </div>

        {/* 스트릭 바 (7칸) */}
        <div className="flex gap-1.5 mt-3 relative">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full transition-all" style={{ background: i < Math.min(streak, 7) ? '#FFB87A' : 'rgba(255,138,61,0.18)' }} />
          ))}
        </div>

        {/* 하단: 안내 + 버튼 */}
        <div className="flex items-center justify-between mt-2.5 relative">
          <span className="text-[11px] text-muted-foreground">
            {daysLeft > 0 ? `${daysLeft}일 더 모으면 뽑기권 +${milestoneBonus}` : `🎉 ${nextMilestone}일 달성!`}
          </span>
          <button
            onClick={handleAttendance}
            disabled={attended || attendLoading}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black transition-all active:scale-95 flex-shrink-0"
            style={attended
              ? { background: '#E5E7EB', color: '#9CA3AF' }
              : { background: '#FFB87A', color: 'white', boxShadow: '0 2px 6px rgba(255,138,61,0.3)' }
            }
          >
            {attended ? (
              <><CheckCircle2 className="w-3.5 h-3.5" /> 완료</>
            ) : (
              attendLoading ? "..." : "출석 체크"
            )}
          </button>
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

      {/* 마감 임박 프로젝트 */}
      {urgentProjects.length > 0 && (
        <div className="mx-4 mt-3 rounded-xl border border-red-500/30 bg-red-500/5 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-red-500/20">
            <AlertTriangle size={13} className="text-red-400 shrink-0" />
            <span className="text-xs font-bold text-red-400">마감 임박 프로젝트</span>
          </div>
          {urgentProjects.map((p) => {
            const diff = new Date(p.due_date).getTime() - Date.now()
            const daysLeft = Math.ceil(diff / (24 * 60 * 60 * 1000))
            const label = daysLeft <= 0 ? "오늘 마감" : `D-${daysLeft}`
            return (
              <div key={p.id} className="flex items-center justify-between px-3 py-2 border-b border-red-500/10 last:border-0">
                <span className="text-xs text-foreground truncate flex-1">{p.name}</span>
                <span className={`text-[10px] font-bold ml-2 shrink-0 ${daysLeft <= 0 ? "text-red-500" : "text-red-400"}`}>{label}</span>
              </div>
            )
          })}
        </div>
      )}

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

    </div>
  )
}
