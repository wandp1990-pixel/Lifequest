import { getClient, now, todayKST } from "../client"

function offsetDay(base: string, delta: number): string {
  const d = new Date(base + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

async function computeStreak(db: ReturnType<typeof getClient>): Promise<number> {
  const res = await db.execute(
    "SELECT checked_date FROM attendance_log ORDER BY checked_date DESC LIMIT 100"
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

export async function getTodayAttendance(): Promise<{ checked: boolean; streak: number }> {
  const db = getClient()
  const today = todayKST()
  const attendRes = await db.execute({
    sql: "SELECT id FROM attendance_log WHERE checked_date = ?",
    args: [today],
  })
  const streak = await computeStreak(db)
  return { checked: attendRes.rows.length > 0, streak }
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

  await db.execute({
    sql: "INSERT INTO attendance_log (checked_date, created_at) VALUES (?, ?)",
    args: [today, now()],
  })

  const streak = await computeStreak(db)

  let ticketDelta = 1
  let bonusTickets = 0
  if (streak === 14) { bonusTickets = 10; ticketDelta += 10 }
  else if (streak === 7) { bonusTickets = 5; ticketDelta += 5 }

  await db.execute({
    sql: "UPDATE character SET draw_tickets = COALESCE(draw_tickets, 0) + ? WHERE id = 1",
    args: [ticketDelta],
  })

  return { alreadyChecked: false, streak, bonusTickets }
}
