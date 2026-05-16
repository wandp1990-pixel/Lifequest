import { NextRequest } from "next/server"
import {
  getTodoItems, cleanupCompletedTodos, addTodoItem, completeTodoItem, deleteTodoItem,
  updateTodoExp, updateTodoName, updateTodoNotifyTime,
  generateRecurringTodosIfNeeded,
} from "@/lib/db"
import { now } from "@/lib/time/kst"
import { judgeActivity } from "@/lib/ai"
import { calcDueBonus } from "@/lib/game/exp-bonus"
import { applyReward } from "@/lib/game/rewards"
import { ok, badRequest, notFound, withInit } from "@/lib/api/respond"
import { DEFAULT_ITEM_EXP } from "@/lib/constants/exp"

export const GET = withInit(async () => {
  await cleanupCompletedTodos()
  await generateRecurringTodosIfNeeded(addTodoItem)
  const items = await getTodoItems()
  return ok({ items })
})

export const POST = withInit(async (req: NextRequest) => {
  const { name, suggested_exp, due_time } = await req.json()
  if (!name?.trim()) return badRequest("할 일을 입력하세요")
  await addTodoItem(name.trim(), suggested_exp ?? 0, due_time ?? null)
  const items = await getTodoItems()
  return ok({ items })
})

export const PATCH = withInit(async (req: NextRequest) => {
  const { id } = await req.json()
  const items = await getTodoItems()
  const item = items.find((i) => i.id === id)
  if (!item) return notFound("항목 없음")
  if (item.is_completed) return badRequest("이미 완료된 항목입니다", "already_completed")

  let baseExp = (item.suggested_exp as number) ?? DEFAULT_ITEM_EXP
  let comment = "할 일 완료!"
  if (baseExp === 0) {
    const aiResult = await judgeActivity(item.name as string)
    baseExp = aiResult.exp
    comment = aiResult.comment
  }

  const due = calcDueBonus(item.due_time as string | null, now(), baseExp)
  const exp = due.exp
  const bonusExp = due.bonus
  const penaltyApplied = due.penalty
  if (bonusExp > 0) comment = `⏰ 기한 내 완료! ${comment}`
  else if (penaltyApplied) comment = `⌛ 기한 초과 (EXP 절반)`

  // race/재완료 방어: completeTodoItem 이 false 면 다른 요청이 먼저 완료시킨 것
  const claimed = await completeTodoItem(id, exp, comment)
  if (!claimed) return badRequest("이미 완료된 항목입니다", "already_completed")

  const levelResult = await applyReward({
    source: "todo",
    label: item.name as string,
    exp,
    comment,
  })

  return ok({ exp, comment, bonusExp, penaltyApplied, ...levelResult })
})

export const PUT = withInit(async (req: NextRequest) => {
  const body = await req.json()
  const { id } = body
  if ("notify_time" in body) {
    await updateTodoNotifyTime(id, body.notify_time ?? null)
  } else if ("name" in body) {
    if (!body.name?.trim()) return badRequest("이름을 입력하세요")
    await updateTodoName(id, body.name.trim(), body.suggested_exp !== undefined ? Number(body.suggested_exp) : undefined)
  } else if ("suggested_exp" in body) {
    await updateTodoExp(id, Number(body.suggested_exp) || 0)
  } else {
    return badRequest("수정할 필드가 없습니다")
  }
  return ok(await getTodoItems())
})

export const DELETE = withInit(async (req: NextRequest) => {
  const { id } = await req.json()
  await deleteTodoItem(id)
  return ok(await getTodoItems())
})
