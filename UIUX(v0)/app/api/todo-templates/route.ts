import { NextRequest, NextResponse } from "next/server"
import {
  initDb,
  getTodoTemplates,
  addTodoTemplate,
  updateTodoTemplate,
  deleteTodoTemplate,
} from "@/lib/db"

export async function GET() {
  try {
    await initDb()
    const templates = await getTodoTemplates()
    return NextResponse.json({ templates })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDb()
    const body = await req.json()
    if (!body.name?.trim()) return NextResponse.json({ error: "이름 필수" }, { status: 400 })
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
    return NextResponse.json({ templates })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await initDb()
    const body = await req.json()
    if (!body.id) return NextResponse.json({ error: "id 필수" }, { status: 400 })
    if (!body.name?.trim()) return NextResponse.json({ error: "이름 필수" }, { status: 400 })
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
    return NextResponse.json({ templates })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initDb()
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: "id 필수" }, { status: 400 })
    await deleteTodoTemplate(Number(id))
    const templates = await getTodoTemplates()
    return NextResponse.json({ templates })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
