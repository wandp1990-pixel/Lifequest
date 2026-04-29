import { getClient, now, todayKST } from "../client"

export async function getTodoItems() {
  const db = getClient()
  const today = todayKST()
  await db.execute({
    sql: "DELETE FROM todo_item WHERE is_completed=1 AND DATE(completed_at) < ?",
    args: [today],
  })
  const res = await db.execute("SELECT * FROM todo_item ORDER BY is_completed ASC, id DESC")
  return res.rows
}

export async function addTodoItem(name: string, suggestedExp: number) {
  const db = getClient()
  await db.execute({
    sql: "INSERT INTO todo_item (name, suggested_exp, is_completed, created_at) VALUES (?,?,0,?)",
    args: [name, suggestedExp, now()],
  })
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

export async function updateTodoName(id: number, name: string) {
  const db = getClient()
  await db.execute({
    sql: "UPDATE todo_item SET name=? WHERE id=?",
    args: [name, id],
  })
}

export async function deleteTodoItem(id: number) {
  const db = getClient()
  await db.execute({ sql: "DELETE FROM todo_item WHERE id=?", args: [id] })
}
