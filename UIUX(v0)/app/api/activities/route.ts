import { NextRequest } from "next/server"
import { addActivityLog, getRecentActivities } from "@/lib/db"
import { gainExp } from "@/lib/game"
import { judgeActivity } from "@/lib/ai"
import { ok, badRequest, withInit } from "@/lib/api/respond"

export const GET = withInit(async (req: NextRequest) => {
  const type = req.nextUrl.searchParams.get("type") ?? undefined
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "5")
  const logs = await getRecentActivities(type, limit)
  return ok(logs)
})

// AI 호출 비용 보호: 너무 긴 텍스트는 차단
const MAX_ACTIVITY_LENGTH = 1000

export const POST = withInit(async (req: NextRequest) => {
  const { text } = await req.json()
  if (!text?.trim()) return badRequest("활동 내용을 입력하세요")
  if (typeof text !== "string" || text.length > MAX_ACTIVITY_LENGTH) {
    return badRequest(`활동 내용은 ${MAX_ACTIVITY_LENGTH}자 이하로 입력하세요`)
  }

  const result = await judgeActivity(text)
  const levelResult = await gainExp(result.exp)
  await addActivityLog(text, "ai", result.exp, result.comment)

  return ok({ ...result, ...levelResult })
})
