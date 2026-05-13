import { getClient, now, todayKST } from "../client"

export type TodoTemplate = {
  id: number
  name: string
  suggested_exp: number
  repeat_type: "weekly" | "monthly"
  weekly_days: string | null
  monthly_mode: "weekday" | "day" | null
  month_week: number | null
  month_weekday: number | null
  month_day: number | null
  notify_time: string | null
  is_active: number
  created_at: string
}

function getTodayParts() {
  const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return {
    date: nowKst.toISOString().slice(0, 10),
    weekday: nowKst.getUTCDay(),
    dayOfMonth: nowKst.getUTCDate(),
    weekOfMonth: Math.floor((nowKst.getUTCDate() - 1) / 7) + 1,
  }
}

function isTemplateDueToday(template: TodoTemplate): boolean {
  const today = getTodayParts()

  if (template.repeat_type === "weekly") {
    if (!template.weekly_days) return false
    const days = template.weekly_days
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value))
    return days.includes(today.weekday)
  }

  if (template.repeat_type === "monthly") {
    if (template.monthly_mode === "day") {
      return Number(template.month_day) === today.dayOfMonth
    }
    if (template.monthly_mode === "weekday") {
      return Number(template.month_week) === today.weekOfMonth && Number(template.month_weekday) === today.weekday
    }
  }

  return false
}

export async function getTodoTemplates(): Promise<TodoTemplate[]> {
  const db = getClient()
  const res = await db.execute(
    "SELECT * FROM todo_template WHERE is_active=1 ORDER BY repeat_type ASC, id DESC"
  )
  return res.rows as unknown as TodoTemplate[]
}

export async function addTodoTemplate(input: {
  name: string
  suggestedExp: number
  repeatType: "weekly" | "monthly"
  weeklyDays?: number[]
  monthlyMode?: "weekday" | "day" | null
  monthWeek?: number | null
  monthWeekday?: number | null
  monthDay?: number | null
  notifyTime?: string | null
}) {
  const db = getClient()
  await db.execute({
    sql: `INSERT INTO todo_template
          (name, suggested_exp, repeat_type, weekly_days, monthly_mode, month_week, month_weekday, month_day, notify_time, is_active, created_at)
          VALUES (?,?,?,?,?,?,?,?,?,1,?)`,
    args: [
      input.name,
      input.suggestedExp,
      input.repeatType,
      input.weeklyDays?.join(",") ?? null,
      input.monthlyMode ?? null,
      input.monthWeek ?? null,
      input.monthWeekday ?? null,
      input.monthDay ?? null,
      input.notifyTime ?? null,
      now(),
    ],
  })
}

export async function updateTodoTemplate(id: number, input: {
  name: string
  suggestedExp: number
  repeatType: "weekly" | "monthly"
  weeklyDays?: number[]
  monthlyMode?: "weekday" | "day" | null
  monthWeek?: number | null
  monthWeekday?: number | null
  monthDay?: number | null
  notifyTime?: string | null
}) {
  const db = getClient()
  await db.execute({
    sql: `UPDATE todo_template
          SET name=?, suggested_exp=?, repeat_type=?, weekly_days=?, monthly_mode=?, month_week=?, month_weekday=?, month_day=?, notify_time=?
          WHERE id=?`,
    args: [
      input.name,
      input.suggestedExp,
      input.repeatType,
      input.weeklyDays?.join(",") ?? null,
      input.monthlyMode ?? null,
      input.monthWeek ?? null,
      input.monthWeekday ?? null,
      input.monthDay ?? null,
      input.notifyTime ?? null,
      id,
    ],
  })
}

export async function deleteTodoTemplate(id: number) {
  const db = getClient()
  await db.execute({ sql: "UPDATE todo_template SET is_active=0 WHERE id=?", args: [id] })
}

export async function claimTodoTemplateGeneration(templateId: number, scheduledDate: string): Promise<number | null> {
  const db = getClient()
  const res = await db.execute({
    sql: "INSERT OR IGNORE INTO todo_template_log (template_id, scheduled_date, todo_id, created_at) VALUES (?,?,0,?)",
    args: [templateId, scheduledDate, now()],
  })
  if (res.rowsAffected === 0) return null
  return Number(res.lastInsertRowid)
}

export async function linkGeneratedTodo(logId: number, todoId: number) {
  const db = getClient()
  await db.execute({
    sql: "UPDATE todo_template_log SET todo_id=? WHERE id=?",
    args: [todoId, logId],
  })
}

export async function generateRecurringTodosIfNeeded(addTodoItem: (name: string, suggestedExp: number, dueTime?: string | null, notifyTime?: string | null) => Promise<number>) {
  const templates = await getTodoTemplates()
  const today = todayKST()

  for (const template of templates) {
    if (!isTemplateDueToday(template)) continue
    const logId = await claimTodoTemplateGeneration(template.id, today)
    if (logId === null) continue
    try {
      const todoId = await addTodoItem(template.name, template.suggested_exp, null, template.notify_time)
      await linkGeneratedTodo(logId, todoId)
    } catch {
      // 생성 실패 시 로그 제거 → 당일 재시도 가능하게 복원
      const db = getClient()
      await db.execute({ sql: "DELETE FROM todo_template_log WHERE id=?", args: [logId] })
    }
  }
}
