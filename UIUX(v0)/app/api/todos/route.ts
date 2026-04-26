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

    let exp = (item.suggested_exp as number) ?? 10
    let comment = "할 일 완료!"
    if (exp === 0) {
      const aiResult = await judgeActivity(item.name as string)
      exp = aiResult.exp
      comment = aiResult.comment
    }
    await completeTodoItem(id, exp, comment)
    await addActivityLog(item.name as string, "todo", exp, comment)
    await incrementTaskCount()
    const levelResult = await gainExp(exp)

    return NextResponse.json({ exp, comment, ...levelResult })
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
