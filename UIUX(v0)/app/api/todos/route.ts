import { NextRequest, NextResponse } from "next/server"
import {
  initDb, getTodoItems, cleanupCompletedTodos, addTodoItem, completeTodoItem, deleteTodoItem,
  updateTodoExp, updateTodoName, addActivityLog, incrementTaskCount, updateTodoNotifyTime,
} from "@/lib/db"
import { now } from "@/lib/db/client"
import { gainExp } from "@/lib/game"
import { judgeActivity } from "@/lib/ai"

export async function GET() {
  try {
    await initDb()
    await cleanupCompletedTodos()
    const items = await getTodoItems()
    return NextResponse.json({ items })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDb()
    const { name, suggested_exp, due_time } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: "할 일을 입력하세요" }, { status: 400 })
    await addTodoItem(name.trim(), suggested_exp ?? 0, due_time ?? null)
    const items = await getTodoItems()
    return NextResponse.json({ items })
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
    if (item.is_completed) return NextResponse.json({ error: "이미 완료된 항목입니다" }, { status: 400 })

    let baseExp = (item.suggested_exp as number) ?? 10
    let comment = "할 일 완료!"
    if (baseExp === 0) {
      const aiResult = await judgeActivity(item.name as string)
      baseExp = aiResult.exp
      comment = aiResult.comment
    }

    let exp = baseExp
    let bonusExp = 0
    let penaltyApplied = false

    const dueTime = item.due_time as string | null
    if (dueTime) {
      const currentNow = now()
      if (currentNow <= dueTime) {
        bonusExp = Math.floor(baseExp * 0.5)
        exp = baseExp + bonusExp
        comment = `⏰ 기한 내 완료! ${comment}`
      } else {
        exp = Math.floor(baseExp * 0.5)
        penaltyApplied = true
        comment = `⌛ 기한 초과 (EXP 절반)`
      }
    }

    // race/재완료 방어: completeTodoItem이 false면 다른 요청이 먼저 완료시킨 것
    const claimed = await completeTodoItem(id, exp, comment)
    if (!claimed) return NextResponse.json({ error: "이미 완료된 항목입니다" }, { status: 400 })

    await addActivityLog(item.name as string, "todo", exp, comment)
    await incrementTaskCount()
    const levelResult = await gainExp(exp)

    return NextResponse.json({ exp, comment, bonusExp, penaltyApplied, ...levelResult })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await initDb()
    const body = await req.json()
    const { id } = body
    if ("notify_time" in body) {
      await updateTodoNotifyTime(id, body.notify_time ?? null)
    } else if ("name" in body) {
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
