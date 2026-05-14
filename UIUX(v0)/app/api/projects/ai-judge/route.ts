import { NextRequest } from "next/server"
import { judgeProjectExp } from "@/lib/ai"
import { ok, badRequest, withInit } from "@/lib/api/respond"

export const POST = withInit(async (req: NextRequest) => {
  const { name, description = "", priority = "medium" } = await req.json()
  if (!name?.trim()) return badRequest("이름 필수")
  const result = await judgeProjectExp(name.trim(), description, priority)
  return ok(result)
})
