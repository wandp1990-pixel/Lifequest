import { NextRequest } from "next/server"
import {
  getChecklistItems, claimChecklistLog, setChecklistLogExp,
  getTodayCheckedItemIds, addChecklistItem, deleteChecklistItem,
  updateChecklistStreak,
  updateChecklistItemName, updateChecklistNotifyTime,
  getHabitGroups, getTodayBonusGroupIds, claimHabitGroupBonus,
  addHabitGroup, updateHabitGroupName, deleteHabitGroup,
  setItemGroup, reorderHabitGroups,
} from "@/lib/db"
import { calcMissPenalty } from "@/lib/game/exp-bonus"
import { applyReward } from "@/lib/game/rewards"
import { tx } from "@/lib/db/queries/_helpers"
import { ok, badRequest, notFound, withInit } from "@/lib/api/respond"
import { DEFAULT_ITEM_EXP, STREAK_THRESHOLDS } from "@/lib/constants/exp"

const STREAK_BONUS_MIN = STREAK_THRESHOLDS[0] // = 7 (보너스 첫 단계). 동작 보존.

export const GET = withInit(async () => {
  const [items, checkedIds, groups, bonusGroupIds] = await Promise.all([
    getChecklistItems(),
    getTodayCheckedItemIds(),
    getHabitGroups(),
    getTodayBonusGroupIds(),
  ])
  return ok({ items, checkedIds: [...checkedIds], groups, bonusGroupIds: [...bonusGroupIds] })
})

export const POST = withInit(async (req: NextRequest) => {
  const { itemId } = await req.json()

  const items = await getChecklistItems()
  const item = items.find((i) => i.id === itemId)
  if (!item) return notFound("항목 없음")

  const baseExp = (item.fixed_exp as number) ?? DEFAULT_ITEM_EXP
  const daysSinceLast = (item.days_since_last as number | null) ?? null
  const missedDays = daysSinceLast !== null && daysSinceLast >= 2 ? daysSinceLast - 1 : 0
  const penaltyExp = calcMissPenalty(missedDays, baseExp)
  const groupId = item.group_id as number | null

  // claim + streak + log exp + 보상 + 그룹 보너스를 한 트랜잭션으로 묶는다.
  // - 부분 실패 시 전체 rollback (예전: streak 만 갱신되고 보상 누락되는 inconsistency 제거).
  // - claim 을 트랜잭션 안에 두면 libsql write tx 직렬 격리 덕에 같은 그룹의 다른 PATCH 의
  //   checklist_log INSERT 가 SELECT 시 보여 "다 끝났는데 보너스 미적립" race 가 해소된다.
  const txResult = await tx(async (t) => {
    const logId = await claimChecklistLog(itemId, t)
    if (logId === null) return null

    const { streak, bonusExp, isReturn } = await updateChecklistStreak(itemId, t)
    const totalExp = Math.max(1, baseExp + bonusExp - penaltyExp)

    const comment = penaltyExp > 0
      ? isReturn
        ? "다시 이어가기 시작했어요 💪"
        : `${missedDays}일 만에 완료! 다시 시작이에요`
      : streak >= STREAK_BONUS_MIN
      ? `🔥 ${streak}일 연속! (+${bonusExp} 보너스)`
      : streak > 1
      ? `🔥 ${streak}일 연속!`
      : isReturn
      ? "다시 이어가기 시작했어요 💪"
      : "좋은 시작이에요"

    await setChecklistLogExp(logId, totalExp, t)
    const levelResult = await applyReward(
      { source: "daily", label: item.name as string, exp: totalExp, comment },
      t,
    )

    // 그룹 보너스: 같은 그룹의 모든 항목 완료 시 추가 EXP.
    // applyReward 통일 — activity_log + incrementTaskCount + gainExp 시퀀스를 일관 적용.
    let groupBonus: number | null = null
    if (groupId) {
      groupBonus = await claimHabitGroupBonus(groupId, t)
      if (groupBonus !== null) {
        await applyReward(
          { source: "daily", label: "습관 스택 완성", exp: groupBonus, comment: "모든 습관 완료!" },
          t,
        )
      }
    }

    return { totalExp, bonusExp, streak, comment, groupBonus, levelResult }
  })

  if (txResult === null) return badRequest("오늘 이미 완료한 항목입니다", "already_completed")

  // 응답 shape 통일 — GET/PUT/DELETE 와 동일하게 items/checkedIds/groups/bonusGroupIds 도 포함.
  // 클라이언트가 별도 refetch 없이 한 번에 완전 동기화 가능.
  const [refreshedItems, checkedIds, groups, bonusGroupIds] = await Promise.all([
    getChecklistItems(),
    getTodayCheckedItemIds(),
    getHabitGroups(),
    getTodayBonusGroupIds(),
  ])
  const groupName = txResult.groupBonus !== null && groupId
    ? groups.find((g) => g.id === groupId)?.name ?? null
    : null

  return ok({
    exp: txResult.totalExp,
    baseExp,
    bonusExp: txResult.bonusExp,
    penaltyExp,
    streak: txResult.streak,
    comment: txResult.comment,
    groupBonus: txResult.groupBonus,
    groupName,
    ...txResult.levelResult,
    items: refreshedItems,
    checkedIds: [...checkedIds],
    groups,
    bonusGroupIds: [...bonusGroupIds],
  })
})

export const PUT = withInit(async (req: NextRequest) => {
  const body = await req.json()
  const { action } = body

  if (action === "addGroup") {
    if (!body.name?.trim()) return badRequest("이름을 입력하세요")
    await addHabitGroup(body.name.trim())
  } else if (action === "updateGroupName") {
    if (!body.name?.trim()) return badRequest("이름을 입력하세요")
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
    if (!body.name?.trim()) return badRequest("이름을 입력하세요")
    await updateChecklistItemName(body.id, body.name.trim(), body.fixed_exp !== undefined ? Number(body.fixed_exp) : undefined)
  } else {
    if (!body.name?.trim()) return badRequest("이름을 입력하세요")
    const newId = await addChecklistItem(body.name.trim(), body.suggested_exp ?? DEFAULT_ITEM_EXP)
    if (body.groupId) await setItemGroup(newId, body.groupId)
  }

  const [items, checkedIds, groups, bonusGroupIds] = await Promise.all([
    getChecklistItems(),
    getTodayCheckedItemIds(),
    getHabitGroups(),
    getTodayBonusGroupIds(),
  ])
  return ok({ items, checkedIds: [...checkedIds], groups, bonusGroupIds: [...bonusGroupIds] })
})

export const DELETE = withInit(async (req: NextRequest) => {
  const { id } = await req.json()
  await deleteChecklistItem(id)
  const [items, checkedIds, groups, bonusGroupIds] = await Promise.all([
    getChecklistItems(),
    getTodayCheckedItemIds(),
    getHabitGroups(),
    getTodayBonusGroupIds(),
  ])
  return ok({ items, checkedIds: [...checkedIds], groups, bonusGroupIds: [...bonusGroupIds] })
})
