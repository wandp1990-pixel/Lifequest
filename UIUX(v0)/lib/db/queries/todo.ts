import type { Transaction } from "@libsql/client"
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

export async function addTodoItem(name: string, suggestedExp: number, dueTime?: string | null, notifyTime?: string | null) {
  const db = getClient()
  const res = await db.execute({
    sql: "INSERT INTO todo_item (name, suggested_exp, is_completed, created_at, due_time, notify_time) VALUES (?,?,0,?,?,?)",
    args: [name, suggestedExp, now(), dueTime ?? null, notifyTime ?? null],
  })
  return Number(res.lastInsertRowid)
}

// race-guard claim: 미완료 상태에서만 통과. true면 이 호출이 winner.
// exp_gained / ai_comment 는 setTodoReward 로 별도 finalize (AI 호출 후에 채워야 하므로 분리).
export async function claimTodoItem(id: number): Promise<boolean> {
  const db = getClient()
  const res = await db.execute({
    sql: "UPDATE todo_item SET is_completed=1, completed_at=? WHERE id=? AND is_completed=0",
    args: [now(), id],
  })
  return res.rowsAffected > 0
}

// claim 이후 보상값 finalize. claim winner 만 호출하므로 race-guard 불필요.
// t 가 주어지면 그 트랜잭션 안에서 실행 — applyReward 시퀀스와 묶기 위함.
export async function setTodoReward(
  id: number,
  exp: number,
  comment: string,
  t?: Transaction,
): Promise<void> {
  const exec = t ?? getClient()
  await exec.execute({
    sql: "UPDATE todo_item SET exp_gained=?, ai_comment=? WHERE id=?",
    args: [exp, comment, id],
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
