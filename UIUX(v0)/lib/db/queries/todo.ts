import { getClient, now, todayKST } from "../client"

export async function cleanupCompletedTodos() {
  const db = getClient()
  const today = todayKST()
  await db.execute({
    sql: "DELETE FROM todo_item WHERE is_completed=1 AND DATE(completed_at) < ?",
    args: [today],
  })
}

export async function getTodoItems() {
  const db = getClient()
  const res = await db.execute("SELECT * FROM todo_item ORDER BY is_completed ASC, id DESC")
  return res.rows
}

export async function addTodoItem(name: string, suggestedExp: number, dueTime?: string | null) {
  const db = getClient()
  await db.execute({
    sql: "INSERT INTO todo_item (name, suggested_exp, is_completed, created_at, due_time) VALUES (?,?,0,?,?)",
    args: [name, suggestedExp, now(), dueTime ?? null],
  })
}

export async function applyExpiredTodoPenalties(): Promise<{ count: number; hpLost: number }> {
  const db = getClient()
  const currentNow = now()
  const expired = await db.execute({
    sql: "SELECT id FROM todo_item WHERE is_completed=0 AND penalty_applied=0 AND due_time IS NOT NULL AND due_time < ?",
    args: [currentNow],
  })
  if (expired.rows.length === 0) return { count: 0, hpLost: 0 }
  const charRes = await db.execute("SELECT current_hp, max_hp FROM character WHERE id=1")
  const char = charRes.rows[0]
  const maxHp = Number(char.max_hp)
  const penaltyPerItem = Math.ceil(maxHp * 0.1)
  const totalLost = penaltyPerItem * expired.rows.length
  const newHp = Math.max(0, Number(char.current_hp) - totalLost)
  for (const row of expired.rows) {
    await db.execute({ sql: "UPDATE todo_item SET penalty_applied=1 WHERE id=?", args: [row.id] })
  }
  await db.execute({ sql: "UPDATE character SET current_hp=? WHERE id=1", args: [newHp] })
  return { count: expired.rows.length, hpLost: totalLost }
}

export async function completeTodoItem(id: number, exp: number, comment: string) {
  const db = getClient()
  await db.execute({
    sql: "UPDATE todo_item SET is_completed=1, exp_gained=?, ai_comment=?, completed_at=? WHERE id=?",
    args: [exp, comment, now(), id],
  })
}

export async function updateTodoExp(id: number, suggestedExp: number) {
  const db = getClient()
  await db.execute({
    sql: "UPDATE todo_item SET suggested_exp=? WHERE id=?",
    args: [suggestedExp, id],
  })
}

export async function updateTodoName(id: number, name: string, suggestedExp?: number) {
  const db = getClient()
  if (suggestedExp !== undefined) {
    await db.execute({ sql: "UPDATE todo_item SET name=?, suggested_exp=? WHERE id=?", args: [name, suggestedExp, id] })
  } else {
    await db.execute({ sql: "UPDATE todo_item SET name=? WHERE id=?", args: [name, id] })
  }
}

export async function deleteTodoItem(id: number) {
  const db = getClient()
  await db.execute({ sql: "DELETE FROM todo_item WHERE id=?", args: [id] })
}
