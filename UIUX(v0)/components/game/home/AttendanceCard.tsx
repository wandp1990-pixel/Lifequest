/**
 * @module components/game/home/AttendanceCard
 * @purpose 출석체크 카드. 7일 스트릭 시각화 + 출석 버튼. POST /api/attendance.
 *          attended/streak 자체 fetch 후 state 보유.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { CheckCircle2, Flame } from "lucide-react"

interface Props {
  refreshTick?: number
  onExpGained: () => void
}

export default function AttendanceCard({ refreshTick, onExpGained }: Props) {
  const [attended, setAttended] = useState(false)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ bonusTickets: number } | null>(null)

  const fetchAttendance = useCallback(async () => {
    const res = await fetch("/api/attendance")
    if (res.ok) {
      const data = await res.json()
      setAttended(data.checked)
      setStreak(data.streak)
    }
  }, [])

  useEffect(() => { fetchAttendance() }, [fetchAttendance, refreshTick])

  const handleAttend = async () => {
    if (attended || loading) return
    setLoading(true)
    try {
      const res = await fetch("/api/attendance", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        setAttended(true)
        setStreak(data.streak)
        setToast({ bonusTickets: data.bonusTickets })
        setTimeout(() => setToast(null), 3500)
        onExpGained()
      }
    } finally {
      setLoading(false)
    }
  }

  // 보너스는 7/14일에만 — 그 이후는 별도 마일스톤 없이 "유지" 상태로 표시
  const reachedMax = streak >= 14
  const nextMilestone = streak < 7 ? 7 : 14
  const milestoneBonus = nextMilestone === 7 ? 5 : 10
  const daysLeft = nextMilestone - Math.min(streak, nextMilestone)

  const today = new Date()
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"]
  const todayStr = `TODAY · ${dayNames[today.getDay()]}요일`
  const questTitle = `${today.getMonth() + 1}월 ${today.getDate()}일의 퀘스트`

  return (
    <div
      className="mx-4 mt-4 rounded-2xl px-4 pt-3 pb-4 relative overflow-hidden"
      style={{ border: "1px solid #FFE0BF", background: "linear-gradient(135deg, #FFF8EE 0%, #FFEDD5 100%)" }}
    >
      <div className="absolute" style={{ right: -30, top: -30, width: 130, height: 130, borderRadius: "50%", background: "rgba(255,138,61,0.08)" }} />

      <div className="flex items-start justify-between relative">
        <div>
          <p className="text-[11px] font-bold tracking-wider" style={{ color: "#B5651D", letterSpacing: "0.04em" }}>{todayStr}</p>
          <p className="text-[17px] font-extrabold text-gray-900 mt-0.5 leading-tight">{questTitle}</p>
          {toast && toast.bonusTickets > 0 && (
            <p className="text-xs font-black text-violet-500 mt-1">🎉 뽑기권 +{toast.bonusTickets} 보너스!</p>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 flex-shrink-0" style={{ background: "white", border: "1px solid #FFE0BF", color: "#B5651D" }}>
          <Flame className="w-3.5 h-3.5" style={{ color: "#FFB87A" }} />
          <span className="text-xs font-extrabold">{streak}일 연속</span>
        </div>
      </div>

      <div className="flex gap-1.5 mt-3 relative">
        {Array.from({ length: 7 }, (_, i) => {
          const cycleStart = nextMilestone - 7
          const progressInCycle = Math.min(streak - cycleStart, 7)
          return (
            <div key={i} className="flex-1 h-1.5 rounded-full transition-all" style={{ background: i < progressInCycle ? "#FFB87A" : "rgba(255,138,61,0.18)" }} />
          )
        })}
      </div>

      <div className="flex items-center justify-between mt-2.5 relative">
        <span className="text-[11px] text-muted-foreground">
          {reachedMax
            ? `🔥 14일 달성 유지중 · ${streak}일째`
            : daysLeft > 0
              ? `${daysLeft}일 더 모으면 뽑기권 +${milestoneBonus}`
              : `🎉 ${nextMilestone}일 달성!`}
        </span>
        <button
          onClick={handleAttend}
          disabled={attended || loading}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black transition-all active:scale-95 flex-shrink-0"
          style={attended
            ? { background: "#E5E7EB", color: "#9CA3AF" }
            : { background: "#FFB87A", color: "white", boxShadow: "0 2px 6px rgba(255,138,61,0.3)" }
          }
        >
          {attended ? (
            <><CheckCircle2 className="w-3.5 h-3.5" /> 완료</>
          ) : (
            loading ? "..." : "출석 체크"
          )}
        </button>
      </div>
    </div>
  )
}
