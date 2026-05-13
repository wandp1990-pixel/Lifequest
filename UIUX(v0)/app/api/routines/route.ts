import { NextRequest } from "next/server"
import {
  getRoutines, addRoutine, addRoutineItem,
  deleteRoutine, deleteRoutineItem, checkRoutineItem,
  reorderRoutineItems,
  updateRoutineDeadline, updateRoutineName, updateRoutineItemName,
  updateRoutineChapter,
} from "@/lib/db"
import { applyReward } from "@/lib/game/rewards"
import { ok, badRequest, withInit } from "@/lib/api/respond"
import { DEFAULT_ITEM_EXP } from "@/lib/constants/exp"

export const GET = withInit(async () => ok(await getRoutines()))

export const POST = withInit(async (req: NextRequest) => {
  const { itemId } = await req.json()
  if (typeof itemId !== "number") return badRequest("itemId 필요")

  const result = await checkRoutineItem(itemId)
  if (!result) return badRequest("항목 없음 또는 이미 체크됨")

  const totalExp = result.exp + result.bonusExp
  const comment = result.deadlineBonus
    ? `⏰ 마감 전 달성! 🎉 ${result.routineName} 완수! (2배 보너스)`
    : result.allDone && result.bonusExp > 0
      ? `🎉 ${result.routineName} 완수! 보너스 +${result.bonusExp}`
      : "루틴 항목 완료"

  const levelResult = await applyReward({
    source: "routine",
    label: result.allDone ? `${result.routineName} 루틴 완수` : `루틴 항목 완료`,
    exp: totalExp,
    comment,
  })

  return ok({
    exp: result.exp,
    bonusExp: result.bonusExp,
    allDone: result.allDone,
    routineName: result.routineName,
    deadlineBonus: result.deadlineBonus,
    ...levelResult,
  })
})

export const PUT = withInit(async (req: NextRequest) => {
  const body = await req.json()
  const { action } = body
  if (action === "addRoutine") {
    const name = (body.name ?? "").trim()
    if (!name) return badRequest("이름을 입력하세요")
    const chapterId = body.chapterId != null ? Number(body.chapterId) : null
    const id = await addRoutine(name, chapterId)
    return ok({ ...(await getRoutines()), createdRoutineId: id })
  }
  if (action === "updateChapter") {
    if (typeof body.routineId !== "number") return badRequest("routineId 필요")
    const chapterId = body.chapterId != null ? Number(body.chapterId) : null
    await updateRoutineChapter(body.routineId, chapterId)
    return ok(await getRoutines())
  }
  if (action === "addItem") {
    const routineId = body.routineId
    const name = (body.name ?? "").trim()
    const fixedExp = Number(body.fixedExp ?? DEFAULT_ITEM_EXP)
    if (typeof routineId !== "number" || !name) return badRequest("필수값 누락")
    await addRoutineItem(routineId, name, fixedExp)
    return ok(await getRoutines())
  }
  if (action === "updateDeadline") {
    const routineId = body.routineId
    const deadlineTime = body.deadlineTime ?? null
    if (typeof routineId !== "number") return badRequest("routineId 필요")
    await updateRoutineDeadline(routineId, deadlineTime)
    return ok(await getRoutines())
  }
  if (action === "reorderItems") {
    const orderedItemIds = body.orderedItemIds
    if (!Array.isArray(orderedItemIds)) return badRequest("orderedItemIds 필요")
    await reorderRoutineItems(orderedItemIds)
    return ok(await getRoutines())
  }
  if (action === "updateRoutineName") {
    const name = (body.name ?? "").trim()
    if (typeof body.routineId !== "number" || !name) return badRequest("필수값 누락")
    await updateRoutineName(body.routineId, name)
    return ok(await getRoutines())
  }
  if (action === "updateItemName") {
    const name = (body.name ?? "").trim()
    if (typeof body.itemId !== "number" || !name) return badRequest("필수값 누락")
    await updateRoutineItemName(body.itemId, name, body.fixedExp !== undefined ? Number(body.fixedExp) : undefined)
    return ok(await getRoutines())
  }
  return badRequest("알 수 없는 action")
})

export const DELETE = withInit(async (req: NextRequest) => {
  const body = await req.json()
  const { action } = body
  if (action === "deleteRoutine") {
    await deleteRoutine(body.id)
  } else if (action === "deleteItem") {
    await deleteRoutineItem(body.id)
  } else {
    return badRequest("알 수 없는 action")
  }
  return ok(await getRoutines())
})
