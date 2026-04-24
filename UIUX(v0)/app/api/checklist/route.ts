import { NextRequest, NextResponse } from "next/server"
import { initDb, getChecklistItems, addChecklistLog, getTodayCheckedItemIds } from "@/lib/db"
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

    const exp = item.fixed_exp as number
    await addChecklistLog(itemId, exp)
    const levelResult = await gainExp(exp)

    return NextResponse.json({ exp, ...levelResult })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
