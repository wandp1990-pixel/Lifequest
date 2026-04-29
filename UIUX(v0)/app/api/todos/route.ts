import { NextRequest, NextResponse } from "next/server"
import {
  initDb, getTodoItems, cleanupCompletedTodos, addTodoItem, completeTodoItem, deleteTodoItem,
  updateTodoExp, updateTodoName, addActivityLog, incrementTaskCount,
} from "@/lib/db"
import { gainExp } from "@/lib/game"
import { judgeActivity } from "@/lib/ai"

export async function GET() {
  try {
    await initDb()
    await cleanupCompletedTodos()
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
    await addTodoItem(name.trim(), suggested_exp ?? 0)
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

export async function PUT(req: NextRequest) {
  try {
    await initDb()
    const body = await req.json()
    const { id } = body
    if ("name" in body) {
      if (!body.name?.trim()) return NextResponse.json({ error: "이름을 입력하세요" }, { status: 400 })
      await updateTodoName(id, body.name.trim(), body.suggested_exp !== undefined ? Number(body.suggested_exp) : undefined)
    } else {
      await updateTodoExp(id, body.suggested_exp ?? 0)
    }
    return NextResponse.json(await getTodoItems())
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
