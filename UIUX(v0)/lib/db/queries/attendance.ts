import { getClient, now, todayKST } from "../client"

function yesterdayKST(): string {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export async function getTodayAttendance(): Promise<{ checked: boolean; streak: number }> {
  const db = getClient()
  const today = todayKST()
  const [attendRes, charRes] = await Promise.all([
    db.execute({ sql: "SELECT id FROM attendance_log WHERE checked_date = ?", args: [today] }),
    db.execute("SELECT COALESCE(attendance_streak, 0) AS streak FROM character WHERE id = 1"),
  ])
  return {
    checked: attendRes.rows.length > 0,
    streak: Number(charRes.rows[0]?.streak ?? 0),
  }
}

export async function checkAttendance(): Promise<{
  alreadyChecked: boolean
  streak: number
  bonusTickets: number
}> {
  const db = getClient()
  const today = todayKST()

  const existing = await db.execute({
    sql: "SELECT id FROM attendance_log WHERE checked_date = ?",
    args: [today],
  })
  if (existing.rows.length > 0) return { alreadyChecked: true, streak: 0, bonusTickets: 0 }

  // 어제 출석 여부로 연속 여부 판단
  const yesterday = yesterdayKST()
  const yesterdayRes = await db.execute({
    sql: "SELECT id FROM attendance_log WHERE checked_date = ?",
    args: [yesterday],
  })
  const charRes = await db.execute(
    "SELECT COALESCE(attendance_streak, 0) AS streak FROM character WHERE id = 1"
  )
  const prevStreak = Number(charRes.rows[0]?.streak ?? 0)
  const newStreak = yesterdayRes.rows.length > 0 ? prevStreak + 1 : 1

  // 기본 뽑기권 +1
  let ticketDelta = 1
  let bonusTickets = 0

  if (newStreak === 14) {
    bonusTickets = 10
    ticketDelta += 10
  } else if (newStreak === 7) {
    bonusTickets = 5
    ticketDelta += 5
  }

  const nextStreak = newStreak >= 14 ? 0 : newStreak

  await db.execute({
    sql: "INSERT INTO attendance_log (checked_date, created_at) VALUES (?, ?)",
    args: [today, now()],
  })
  await db.execute({
    sql: "UPDATE character SET draw_tickets = COALESCE(draw_tickets, 0) + ?, attendance_streak = ? WHERE id = 1",
    args: [ticketDelta, nextStreak],
  })

  return { alreadyChecked: false, streak: nextStreak, bonusTickets }
}
