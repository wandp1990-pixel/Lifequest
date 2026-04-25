import { NextRequest, NextResponse } from "next/server"
import {
  initDb, getChecklistItems, addChecklistLog, getTodayCheckedItemIds,
  addChecklistItem, deleteChecklistItem, addActivityLog, incrementTaskCount,
} from "@/lib/db"
import { gainExp } from "@/lib/game"
import { judgeActivity } from "@/lib/ai"

export async function GET() {
  try {
    await initDb()
    const items = await getChecklistItems()
    const checkedIds = await getTodayCheckedItemIds()
    return NextResponse.json({ items, checkedIds: [...checkedIds] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDb()
    const { itemId } = await req.json()

    const items = await getChecklistItems()
    const item = items.find((i) => i.id === itemId)
    if (!item) return NextResponse.json({ error: "항목 없음" }, { status: 404 })

    const result = await judgeActivity(item.name as string)
    if (result.error === "rate_limit") {
      return NextResponse.json({ error: "API 한도 초과. 잠시 후 다시 시도하세요." }, { status: 429 })
    }

    await addChecklistLog(itemId, result.exp)
    await addActivityLog(item.name as string, "daily", result.exp, result.comment)
    await incrementTaskCount()
    const levelResult = await gainExp(result.exp)

    return NextResponse.json({ exp: result.exp, comment: result.comment, ...levelResult })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await initDb()
    const { name, suggested_exp } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: "이름을 입력하세요" }, { status: 400 })
    await addChecklistItem(name.trim(), suggested_exp ?? 10)
    const items = await getChecklistItems()
    const checkedIds = await getTodayCheckedItemIds()
    return NextResponse.json({ items, checkedIds: [...checkedIds] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initDb()
    const { id } = await req.json()
    await deleteChecklistItem(id)
    const items = await getChecklistItems()
    const checkedIds = await getTodayCheckedItemIds()
    return NextResponse.json({ items, checkedIds: [...checkedIds] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
