import { NextRequest } from "next/server"
import {
  getTodoItems, cleanupCompletedTodos, addTodoItem, claimTodoItem, setTodoReward, deleteTodoItem,
  updateTodoExp, updateTodoName, updateTodoNotifyTime,
  generateRecurringTodosIfNeeded,
} from "@/lib/db"
import { now } from "@/lib/time/kst"
import { judgeActivity } from "@/lib/ai"
import { calcDueBonus } from "@/lib/game/exp-bonus"
import { applyReward } from "@/lib/game/rewards"
import { tx } from "@/lib/db/queries/_helpers"
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

  // race-guard 를 가장 먼저: winner 확정 전까지 AI 호출 / due bonus 계산 하지 않음
  // (이전에는 AI 호출 후 claim 시도 → race 패자에서 Gemini 쿼터 낭비)
  const claimed = await claimTodoItem(id as number)
  if (!claimed) return badRequest("이미 완료된 항목입니다", "already_completed")

  // 여기서부터 이 PATCH 는 winner. 외부 호출/계산 안전.
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

  // setTodoReward + applyReward 를 동일 트랜잭션 안에서 묶어 부분 실패 방지.
  // 어느 한 단계라도 실패하면 전체 rollback — is_completed=1 은 claim 단계라 별개.
  const levelResult = await tx(async (t) => {
    await setTodoReward(id as number, exp, comment, t)
    return await applyReward(
      { source: "todo", label: item.name as string, exp, comment },
      t,
    )
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
  return ok({ items: await getTodoItems() })
})

export const DELETE = withInit(async (req: NextRequest) => {
  const { id } = await req.json()
  await deleteTodoItem(id)
  return ok({ items: await getTodoItems() })
})
