import { NextRequest, NextResponse } from "next/server"
import {
  initDb, getChecklistItems, addChecklistLog, getTodayCheckedItemIds,
  addChecklistItem, deleteChecklistItem, addActivityLog, incrementTaskCount,
  updateChecklistStreak, updateChecklistItemName,
} from "@/lib/db"
import { gainExp } from "@/lib/game"

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

    const todayChecked = await getTodayCheckedItemIds()
    if (todayChecked.has(itemId)) {
      return NextResponse.json({ error: "오늘 이미 완료한 항목입니다" }, { status: 400 })
    }

    const baseExp = (item.fixed_exp as number) ?? 10
    const { streak, bonusExp } = await updateChecklistStreak(itemId)
    const totalExp = baseExp + bonusExp

    const comment = streak >= 7
      ? `🔥 ${streak}일 연속! (+${bonusExp} 보너스)`
      : streak > 1
      ? `🔥 ${streak}일 연속!`
      : "습관 완료!"

    await addChecklistLog(itemId, totalExp)
    await addActivityLog(item.name as string, "daily", totalExp, comment)
    await incrementTaskCount()
    const levelResult = await gainExp(totalExp)

    return NextResponse.json({ exp: baseExp, bonusExp, streak, comment, ...levelResult })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await initDb()
    const body = await req.json()
    if ("id" in body) {
      if (!body.name?.trim()) return NextResponse.json({ error: "이름을 입력하세요" }, { status: 400 })
      await updateChecklistItemName(body.id, body.name.trim(), body.fixed_exp !== undefined ? Number(body.fixed_exp) : undefined)
    } else {
      if (!body.name?.trim()) return NextResponse.json({ error: "이름을 입력하세요" }, { status: 400 })
      await addChecklistItem(body.name.trim(), body.suggested_exp ?? 10)
    }
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
