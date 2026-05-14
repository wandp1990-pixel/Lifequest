import { NextRequest } from "next/server"
import {
  getTodoTemplates,
  addTodoTemplate,
  updateTodoTemplate,
  deleteTodoTemplate,
} from "@/lib/db"
import { ok, badRequest, withInit } from "@/lib/api/respond"

export const GET = withInit(async () => {
  const templates = await getTodoTemplates()
  return ok({ templates })
})

export const POST = withInit(async (req: NextRequest) => {
  const body = await req.json()
  if (!body.name?.trim()) return badRequest("이름 필수")
  await addTodoTemplate({
    name: body.name.trim(),
    suggestedExp: Math.max(0, Number(body.suggested_exp) || 0),
    repeatType: body.repeat_type,
    weeklyDays: body.weekly_days ?? [],
    monthlyMode: body.monthly_mode ?? null,
    monthWeek: body.month_week ?? null,
    monthWeekday: body.month_weekday ?? null,
    monthDay: body.month_day ?? null,
    notifyTime: body.notify_time ?? null,
  })
  const templates = await getTodoTemplates()
  return ok({ templates })
})

export const PUT = withInit(async (req: NextRequest) => {
  const body = await req.json()
  if (!body.id) return badRequest("id 필수")
  if (!body.name?.trim()) return badRequest("이름 필수")
  await updateTodoTemplate(Number(body.id), {
    name: body.name.trim(),
    suggestedExp: Math.max(0, Number(body.suggested_exp) || 0),
    repeatType: body.repeat_type,
    weeklyDays: body.weekly_days ?? [],
    monthlyMode: body.monthly_mode ?? null,
    monthWeek: body.month_week ?? null,
    monthWeekday: body.month_weekday ?? null,
    monthDay: body.month_day ?? null,
    notifyTime: body.notify_time ?? null,
  })
  const templates = await getTodoTemplates()
  return ok({ templates })
})

export const DELETE = withInit(async (req: NextRequest) => {
  const { id } = await req.json()
  if (!id) return badRequest("id 필수")
  await deleteTodoTemplate(Number(id))
  const templates = await getTodoTemplates()
  return ok({ templates })
})
