/**
 * @module lib/db/queries/attendance
 * @purpose 출석 체크 / 스트릭 / 월간 마일스톤 보상.
 *
 * 보상 시스템 (월간):
 *   - 매월 1일 카운터 리셋. monthAttendedDays = 이번 달 누적 출석일.
 *   - 매일 +attendance_daily_ticket (기본 1)
 *   - 7/14/21/30 일 도달 시 추가 보너스 (game_config 키로 동적 튜닝)
 *
 * 스트릭(연속 출석)은 무제한 누적, 끊김 시 0. 게이지 UI 는 streak 와 별개로
 * monthAttendedDays 진행도로 표시한다 (route 응답에 같이 실어줌).
 *
 * 모든 수치는 game_config 에서 읽기 — 코드 수정 없이 SettingsDrawer 에서 튜닝.
 */

import { getClient, now, todayKST } from "../client"

const MILESTONE_DAYS = [7, 14, 21, 30] as const
const STREAK_HISTORY_LIMIT = 1000 // 무제한 스트릭이지만 SQL LIMIT 가드

function offsetDay(base: string, delta: number): string {
  const d = new Date(base + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

function monthPrefix(date: string): string {
  return date.slice(0, 7) // "YYYY-MM"
}

async function getAttendanceConfig(db: ReturnType<typeof getClient>) {
  const res = await db.execute(
    "SELECT config_key, config_value FROM game_config WHERE config_key LIKE 'attendance_%'"
  )
  const map: Record<string, number> = {}
  for (const r of res.rows) {
    map[r.config_key as string] = parseInt(r.config_value as string, 10) || 0
  }
  return {
    daily: map["attendance_daily_ticket"] ?? 1,
    milestoneBonus: {
      7: map["attendance_milestone_7_bonus"] ?? 0,
      14: map["attendance_milestone_14_bonus"] ?? 0,
      21: map["attendance_milestone_21_bonus"] ?? 0,
      30: map["attendance_milestone_30_bonus"] ?? 0,
    } as Record<number, number>,
  }
}

async function computeStreak(db: ReturnType<typeof getClient>): Promise<number> {
  const res = await db.execute(
    `SELECT checked_date FROM attendance_log ORDER BY checked_date DESC LIMIT ${STREAK_HISTORY_LIMIT}`
  )
  const dates = res.rows.map((r) => r.checked_date as string)
  if (dates.length === 0) return 0

  const today = todayKST()
  // 오늘 또는 어제 출석이 없으면 연속 끊김
  if (dates[0] !== today && dates[0] !== offsetDay(today, -1)) return 0

  let streak = 0
  let expected = dates[0]
  for (const d of dates) {
    if (d === expected) {
      streak++
      expected = offsetDay(expected, -1)
    } else {
      break
    }
  }
  return streak
}

async function getMonthAttendedDays(db: ReturnType<typeof getClient>, today: string): Promise<number> {
  const prefix = monthPrefix(today)
  const res = await db.execute({
    sql: "SELECT COUNT(*) AS cnt FROM attendance_log WHERE checked_date LIKE ?",
    args: [`${prefix}-%`],
  })
  return (res.rows[0]?.cnt as number) ?? 0
}

function nextMilestone(monthDays: number): { day: number | null; daysLeft: number } {
  for (const m of MILESTONE_DAYS) {
    if (monthDays < m) return { day: m, daysLeft: m - monthDays }
  }
  return { day: null, daysLeft: 0 } // 30일 완주
}

export interface AttendanceStatus {
  checked: boolean
  streak: number
  monthAttended: number
  nextMilestoneDay: number | null
  nextMilestoneBonus: number
  daysToNextMilestone: number
}

export async function getTodayAttendance(): Promise<AttendanceStatus> {
  const db = getClient()
  const today = todayKST()
  const attendRes = await db.execute({
    sql: "SELECT id FROM attendance_log WHERE checked_date = ?",
    args: [today],
  })
  const streak = await computeStreak(db)
  const monthAttended = await getMonthAttendedDays(db, today)
  const cfg = await getAttendanceConfig(db)
  const { day, daysLeft } = nextMilestone(monthAttended)
  return {
    checked: attendRes.rows.length > 0,
    streak,
    monthAttended,
    nextMilestoneDay: day,
    nextMilestoneBonus: day ? cfg.milestoneBonus[day] ?? 0 : 0,
    daysToNextMilestone: daysLeft,
  }
}

export interface CheckResult {
  alreadyChecked: boolean
  streak: number
  monthAttended: number
  dailyTickets: number
  bonusTickets: number
  milestoneHit: number | null
  nextMilestoneDay: number | null
  nextMilestoneBonus: number
  daysToNextMilestone: number
}

export async function checkAttendance(): Promise<CheckResult> {
  const db = getClient()
  const today = todayKST()
  const cfg = await getAttendanceConfig(db)

  // UNIQUE(checked_date) 제약 + INSERT OR IGNORE 로 race 방어
  const insertRes = await db.execute({
    sql: "INSERT OR IGNORE INTO attendance_log (checked_date, created_at) VALUES (?, ?)",
    args: [today, now()],
  })
  const alreadyChecked = (insertRes.rowsAffected ?? 0) === 0

  const streak = await computeStreak(db)
  const monthAttended = await getMonthAttendedDays(db, today)
  const { day: nextDay, daysLeft } = nextMilestone(monthAttended)

  if (alreadyChecked) {
    return {
      alreadyChecked: true,
      streak,
      monthAttended,
      dailyTickets: 0,
      bonusTickets: 0,
      milestoneHit: null,
      nextMilestoneDay: nextDay,
      nextMilestoneBonus: nextDay ? cfg.milestoneBonus[nextDay] ?? 0 : 0,
      daysToNextMilestone: daysLeft,
    }
  }

  const dailyTickets = cfg.daily
  const milestoneHit = (MILESTONE_DAYS as readonly number[]).includes(monthAttended)
    ? monthAttended
    : null
  const bonusTickets = milestoneHit ? cfg.milestoneBonus[milestoneHit] ?? 0 : 0
  const ticketDelta = dailyTickets + bonusTickets

  if (ticketDelta > 0) {
    await db.execute({
      sql: "UPDATE character SET draw_tickets = COALESCE(draw_tickets, 0) + ? WHERE id = 1",
      args: [ticketDelta],
    })
  }

  return {
    alreadyChecked: false,
    streak,
    monthAttended,
    dailyTickets,
    bonusTickets,
    milestoneHit,
    nextMilestoneDay: nextDay,
    nextMilestoneBonus: nextDay ? cfg.milestoneBonus[nextDay] ?? 0 : 0,
    daysToNextMilestone: daysLeft,
  }
}
