import { NextRequest, NextResponse } from "next/server"
import {
  initDb, getChecklistItems, claimChecklistLog, setChecklistLogExp,
  getTodayCheckedItemIds, addChecklistItem, deleteChecklistItem,
  addActivityLog, incrementTaskCount, updateChecklistStreak,
  updateChecklistItemName, updateChecklistNotifyTime, penaltyExpForMissedDays,
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

    // race 방어: 오늘 자리 atomic 선점. 실패 시 즉시 차단.
    const logId = await claimChecklistLog(itemId)
    if (logId === null) {
      return NextResponse.json({ error: "오늘 이미 완료한 항목입니다" }, { status: 400 })
    }

    const baseExp = (item.fixed_exp as number) ?? 10
    const daysSinceLast = (item.days_since_last as number | null) ?? null
    // days_since_last=1 은 어제 완료(정상), 2부터 하루씩 밀림
    const missedDays = daysSinceLast !== null && daysSinceLast >= 2 ? daysSinceLast - 1 : 0
    const penaltyExp = penaltyExpForMissedDays(missedDays, baseExp)

    const { streak, bonusExp, isReturn } = await updateChecklistStreak(itemId)
    const totalExp = Math.max(1, baseExp + bonusExp - penaltyExp)

    const comment = penaltyExp > 0
      ? isReturn
        ? "다시 이어가기 시작했어요 💪"
        : `${missedDays}일 만에 완료! 다시 시작이에요`
      : streak >= 7
      ? `🔥 ${streak}일 연속! (+${bonusExp} 보너스)`
      : streak > 1
      ? `🔥 ${streak}일 연속!`
      : isReturn
      ? "다시 이어가기 시작했어요 💪"
      : "좋은 시작이에요"

    await setChecklistLogExp(logId, totalExp)
    await addActivityLog(item.name as string, "daily", totalExp, comment)
    await incrementTaskCount()
    const levelResult = await gainExp(totalExp)

    return NextResponse.json({ exp: totalExp, baseExp, bonusExp, penaltyExp, streak, comment, ...levelResult })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await initDb()
    const body = await req.json()
    if ("id" in body && "notify_time" in body) {
      await updateChecklistNotifyTime(body.id, body.notify_time ?? null)
    } else if ("id" in body) {
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
