/**
 * @module components/game/home/AttendanceCard
 * @purpose 출석체크 카드.
 *   - 스트릭(연속 출석)은 무제한 누적, 우측 상단 칩.
 *   - 게이지는 "이번 달" 마일스톤(7/14/21/30일) 진행도. 매월 1일 자동 리셋.
 *   - 보상: 매일 기본 +N, 7/14/21/30 도달 시 추가 보너스 (game_config 동적).
 *   - POST /api/attendance 응답에서 dailyTickets/bonusTickets/milestoneHit 받아 토스트.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { CheckCircle2, Flame } from "lucide-react"

interface Props {
  refreshTick?: number
  onExpGained: () => void
}

interface AttendanceStatus {
  checked: boolean
  streak: number
  monthAttended: number
  nextMilestoneDay: number | null
  nextMilestoneBonus: number
  daysToNextMilestone: number
}

interface CheckResult extends AttendanceStatus {
  alreadyChecked: boolean
  dailyTickets: number
  bonusTickets: number
  milestoneHit: number | null
}

const MILESTONE_DAYS = [7, 14, 21, 30]

// monthAttended 가 속한 7일 사이클의 시작 (직전 마일스톤 또는 0).
function cycleStart(monthDays: number): number {
  let last = 0
  for (const m of MILESTONE_DAYS) {
    if (monthDays >= m) last = m
    else break
  }
  return last
}

export default function AttendanceCard({ refreshTick, onExpGained }: Props) {
  const [status, setStatus] = useState<AttendanceStatus>({
    checked: false,
    streak: 0,
    monthAttended: 0,
    nextMilestoneDay: 7,
    nextMilestoneBonus: 0,
    daysToNextMilestone: 7,
  })
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ daily: number; bonus: number; milestone: number | null } | null>(null)

  const fetchAttendance = useCallback(async () => {
    const res = await fetch("/api/attendance")
    if (res.ok) setStatus(await res.json())
  }, [])

  useEffect(() => { fetchAttendance() }, [fetchAttendance, refreshTick])

  const handleAttend = async () => {
    if (status.checked || loading) return
    setLoading(true)
    try {
      const res = await fetch("/api/attendance", { method: "POST" })
      if (res.ok) {
        const data = (await res.json()) as CheckResult
        setStatus({
          checked: true,
          streak: data.streak,
          monthAttended: data.monthAttended,
          nextMilestoneDay: data.nextMilestoneDay,
          nextMilestoneBonus: data.nextMilestoneBonus,
          daysToNextMilestone: data.daysToNextMilestone,
        })
        if (!data.alreadyChecked) {
          setToast({ daily: data.dailyTickets, bonus: data.bonusTickets, milestone: data.milestoneHit })
          setTimeout(() => setToast(null), 4000)
          onExpGained()
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const { checked, streak, monthAttended, nextMilestoneDay, nextMilestoneBonus, daysToNextMilestone } = status

  // 게이지: 현재 사이클 시작(0/7/14/21)부터 다음 마일스톤(7/14/21/30)까지 7칸 진행도
  const startDay = cycleStart(monthAttended)
  const cycleLen = nextMilestoneDay ? nextMilestoneDay - startDay : 0
  const cycleProgress = Math.min(monthAttended - startDay, cycleLen)
  const allDone = nextMilestoneDay === null // 이번 달 30일 완주

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
          {toast && (
            <p className="text-xs font-black text-violet-500 mt-1">
              🎉 뽑기권 +{toast.daily}
              {toast.bonus > 0 && ` · ${toast.milestone}일 보너스 +${toast.bonus}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 flex-shrink-0" style={{ background: "white", border: "1px solid #FFE0BF", color: "#B5651D" }}>
          <Flame className="w-3.5 h-3.5" style={{ color: "#FFB87A" }} />
          <span className="text-xs font-extrabold">{streak}일 연속</span>
        </div>
      </div>

      <div className="flex gap-1.5 mt-3 relative">
        {Array.from({ length: cycleLen || 7 }, (_, i) => (
          <div
            key={i}
            className="flex-1 h-1.5 rounded-full transition-all"
            style={{ background: allDone || i < cycleProgress ? "#FFB87A" : "rgba(255,138,61,0.18)" }}
          />
        ))}
      </div>

      <div className="flex items-center justify-between mt-2.5 relative">
        <span className="text-[11px] text-muted-foreground">
          {allDone
            ? `🎉 이번 달 30일 완주! · ${monthAttended}일 출석`
            : `이번 달 ${monthAttended}일 · ${daysToNextMilestone}일 더 모으면 +${nextMilestoneBonus}`}
        </span>
        <button
          onClick={handleAttend}
          disabled={checked || loading}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black transition-all active:scale-95 flex-shrink-0"
          style={checked
            ? { background: "#E5E7EB", color: "#9CA3AF" }
            : { background: "#FFB87A", color: "white", boxShadow: "0 2px 6px rgba(255,138,61,0.3)" }
          }
        >
          {checked ? (
            <><CheckCircle2 className="w-3.5 h-3.5" /> 완료</>
          ) : (
            loading ? "..." : "출석 체크"
          )}
        </button>
      </div>
    </div>
  )
}
