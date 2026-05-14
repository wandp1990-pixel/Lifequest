import { NextRequest } from "next/server"
import { getActivePrompt, updatePromptContent } from "@/lib/db"
import { ok, badRequest, withInit } from "@/lib/api/respond"

export const GET = withInit(async () => {
  const content = await getActivePrompt("general")
  return ok({ content })
})

export const PUT = withInit(async (req: NextRequest) => {
  const { content } = await req.json()
  if (!content?.trim()) return badRequest("내용을 입력하세요")
  await updatePromptContent("general", content)
  return ok({ ok: true })
})
