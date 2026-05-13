import { NextRequest, NextResponse } from "next/server"
import {
  initDb, getChecklistItems, claimChecklistLog, setChecklistLogExp,
  getTodayCheckedItemIds, addChecklistItem, deleteChecklistItem,
  addActivityLog, incrementTaskCount, updateChecklistStreak,
  updateChecklistItemName, updateChecklistNotifyTime, penaltyExpForMissedDays,
  getHabitGroups, getTodayBonusGroupIds, claimHabitGroupBonus,
  addHabitGroup, updateHabitGroupName, deleteHabitGroup,
  setItemGroup, reorderHabitGroups,
} from "@/lib/db"
import { gainExp } from "@/lib/game"

export async function GET() {
  try {
    await initDb()
    const [items, checkedIds, groups, bonusGroupIds] = await Promise.all([
      getChecklistItems(),
      getTodayCheckedItemIds(),
      getHabitGroups(),
      getTodayBonusGroupIds(),
    ])
    return NextResponse.json({ items, checkedIds: [...checkedIds], groups, bonusGroupIds: [...bonusGroupIds] })
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

    const logId = await claimChecklistLog(itemId)
    if (logId === null) {
      return NextResponse.json({ error: "오늘 이미 완료한 항목입니다" }, { status: 400 })
    }

    const baseExp = (item.fixed_exp as number) ?? 10
    const daysSinceLast = (item.days_since_last as number | null) ?? null
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

    // 그룹 보너스 확인
    let groupBonus: number | null = null
    let groupName: string | null = null
    const groupId = item.group_id as number | null
    if (groupId) {
      groupBonus = await claimHabitGroupBonus(groupId)
      if (groupBonus !== null) {
        await gainExp(groupBonus)
        await addActivityLog("습관 스택 완성", "daily", groupBonus, "모든 습관 완료!")
        const groups = await getHabitGroups()
        groupName = groups.find((g) => g.id === groupId)?.name ?? null
      }
    }

    return NextResponse.json({ exp: totalExp, baseExp, bonusExp, penaltyExp, streak, comment, groupBonus, groupName, ...levelResult })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await initDb()
    const body = await req.json()
    const { action } = body

    if (action === "addGroup") {
      if (!body.name?.trim()) return NextResponse.json({ error: "이름을 입력하세요" }, { status: 400 })
      await addHabitGroup(body.name.trim())
    } else if (action === "updateGroupName") {
      if (!body.name?.trim()) return NextResponse.json({ error: "이름을 입력하세요" }, { status: 400 })
      await updateHabitGroupName(body.groupId, body.name.trim())
    } else if (action === "deleteGroup") {
      await deleteHabitGroup(body.groupId)
    } else if (action === "setItemGroup") {
      await setItemGroup(body.itemId, body.groupId ?? null)
    } else if (action === "reorderGroups") {
      await reorderHabitGroups(body.orderedGroupIds)
    } else if ("id" in body && "notify_time" in body) {
      await updateChecklistNotifyTime(body.id, body.notify_time ?? null)
    } else if ("id" in body) {
      if (!body.name?.trim()) return NextResponse.json({ error: "이름을 입력하세요" }, { status: 400 })
      await updateChecklistItemName(body.id, body.name.trim(), body.fixed_exp !== undefined ? Number(body.fixed_exp) : undefined)
    } else {
      if (!body.name?.trim()) return NextResponse.json({ error: "이름을 입력하세요" }, { status: 400 })
      const newId = await addChecklistItem(body.name.trim(), body.suggested_exp ?? 10)
      if (body.groupId) await setItemGroup(newId, body.groupId)
    }

    const [items, checkedIds, groups, bonusGroupIds] = await Promise.all([
      getChecklistItems(),
      getTodayCheckedItemIds(),
      getHabitGroups(),
      getTodayBonusGroupIds(),
    ])
    return NextResponse.json({ items, checkedIds: [...checkedIds], groups, bonusGroupIds: [...bonusGroupIds] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initDb()
    const { id } = await req.json()
    await deleteChecklistItem(id)
    const [items, checkedIds, groups, bonusGroupIds] = await Promise.all([
      getChecklistItems(),
      getTodayCheckedItemIds(),
      getHabitGroups(),
      getTodayBonusGroupIds(),
    ])
    return NextResponse.json({ items, checkedIds: [...checkedIds], groups, bonusGroupIds: [...bonusGroupIds] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
