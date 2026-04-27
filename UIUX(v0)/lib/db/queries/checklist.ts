import { getClient, now, todayKST } from "../client"

export async function getChecklistItems() {
  const db = getClient()
  const res = await db.execute("SELECT * FROM checklist_item WHERE is_active = 1 ORDER BY id")
  return res.rows
}

function yesterdayKST(): string {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export function streakBonusExp(streak: number, baseExp: number): number {
  let pct = 0
  if (streak >= 100) pct = 1.0
  else if (streak >= 60) pct = 0.75
  else if (streak >= 30) pct = 0.5
  else if (streak >= 14) pct = 0.25
  else if (streak >= 7) pct = 0.1
  return Math.floor(baseExp * pct)
}

export async function updateChecklistStreak(itemId: number): Promise<{ streak: number; bonusExp: number }> {
  const db = getClient()
  const yesterday = yesterdayKST()

  const [yesterdayRes, itemRes] = await Promise.all([
    db.execute({
      sql: "SELECT 1 FROM checklist_log WHERE item_id=? AND checked_at LIKE ? LIMIT 1",
      args: [itemId, `${yesterday}%`],
    }),
    db.execute({
      sql: "SELECT streak, best_streak, fixed_exp FROM checklist_item WHERE id=?",
      args: [itemId],
    }),
  ])

  const item = itemRes.rows[0]
  const currentStreak = (item?.streak as number) ?? 0
  const bestStreak = (item?.best_streak as number) ?? 0
  const baseExp = (item?.fixed_exp as number) ?? 10

  const hadYesterday = yesterdayRes.rows.length > 0
  const newStreak = Math.min(hadYesterday ? currentStreak + 1 : 1, 100)
  const newBest = Math.max(bestStreak, newStreak)

  await db.execute({
    sql: "UPDATE checklist_item SET streak=?, best_streak=? WHERE id=?",
    args: [newStreak, newBest, itemId],
  })

  return { streak: newStreak, bonusExp: streakBonusExp(newStreak, baseExp) }
}

export async function addChecklistLog(itemId: number, exp: number) {
  const db = getClient()
  await db.execute({
    sql: "INSERT INTO checklist_log (item_id,exp_gained,checked_at) VALUES (?,?,?)",
    args: [itemId, exp, now()],
  })
}

export async function addChecklistItem(name: string, fixedExp: number) {
  const db = getClient()
  await db.execute({
    sql: "INSERT INTO checklist_item (name, fixed_exp, is_active) VALUES (?,?,1)",
    args: [name, fixedExp],
  })
}

export async function deleteChecklistItem(id: number) {
  const db = getClient()
  await db.execute({ sql: "UPDATE checklist_item SET is_active=0 WHERE id=?", args: [id] })
}

export async function getTodayCheckedItemIds(): Promise<Set<number>> {
  const db = getClient()
  const today = todayKST()
  const res = await db.execute({
    sql: "SELECT item_id FROM checklist_log WHERE checked_at LIKE ?",
    args: [`${today}%`],
  })
  return new Set(res.rows.map((r) => r.item_id as number))
}
