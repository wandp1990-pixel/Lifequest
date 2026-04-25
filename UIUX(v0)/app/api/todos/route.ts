import { NextRequest, NextResponse } from "next/server"
import {
  initDb, getTodoItems, addTodoItem, completeTodoItem, deleteTodoItem,
  addActivityLog, incrementTaskCount,
} from "@/lib/db"
import { gainExp } from "@/lib/game"
import { judgeActivity } from "@/lib/ai"

export async function GET() {
  try {
    await initDb()
    return NextResponse.json(await getTodoItems())
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDb()
    const { name, suggested_exp } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: "할 일을 입력하세요" }, { status: 400 })
    await addTodoItem(name.trim(), suggested_exp ?? 10)
    return NextResponse.json(await getTodoItems())
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await initDb()
    const { id } = await req.json()
    const items = await getTodoItems()
    const item = items.find((i) => i.id === id)
    if (!item) return NextResponse.json({ error: "항목 없음" }, { status: 404 })

    const result = await judgeActivity(item.name as string)
    if (result.error === "rate_limit") {
      return NextResponse.json({ error: "API 한도 초과. 잠시 후 다시 시도하세요." }, { status: 429 })
    }

    await completeTodoItem(id, result.exp, result.comment)
    await addActivityLog(item.name as string, "todo", result.exp, result.comment)
    await incrementTaskCount()
    const levelResult = await gainExp(result.exp)

    return NextResponse.json({ exp: result.exp, comment: result.comment, ...levelResult })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initDb()
    const { id } = await req.json()
    await deleteTodoItem(id)
    return NextResponse.json(await getTodoItems())
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
