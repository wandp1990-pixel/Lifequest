import { getClient, now } from "../client"

export async function getChecklistItems() {
  const db = getClient()
  const res = await db.execute("SELECT * FROM checklist_item WHERE is_active = 1 ORDER BY id")
  return res.rows
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
  const today = new Date().toISOString().slice(0, 10)
  const res = await db.execute({
    sql: "SELECT item_id FROM checklist_log WHERE checked_at LIKE ?",
    args: [`${today}%`],
  })
  return new Set(res.rows.map((r) => r.item_id as number))
}
