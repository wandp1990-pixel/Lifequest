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
  for (const row of expired.rows) {
    await db.execute({ sql: "UPDATE todo_item SET penalty_applied=1 WHERE id=?", args: [row.id] })
  }
  return { count: expired.rows.length, hpLost: 0 }
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
