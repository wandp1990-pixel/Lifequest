import { getClient, now, todayKST } from "../client"

export async function getTodayAttendance(): Promise<boolean> {
  const db = getClient()
  const res = await db.execute({
    sql: "SELECT id FROM attendance_log WHERE checked_date = ?",
    args: [todayKST()],
  })
  return res.rows.length > 0
}

export async function checkAttendance(): Promise<{ alreadyChecked: boolean }> {
  const db = getClient()
  const today = todayKST()
  const existing = await db.execute({
    sql: "SELECT id FROM attendance_log WHERE checked_date = ?",
    args: [today],
  })
  if (existing.rows.length > 0) return { alreadyChecked: true }
  await db.execute({
    sql: "INSERT INTO attendance_log (checked_date, created_at) VALUES (?, ?)",
    args: [today, now()],
  })
  await db.execute("UPDATE character SET draw_tickets = COALESCE(draw_tickets, 0) + 1 WHERE id = 1")
  return { alreadyChecked: false }
}
