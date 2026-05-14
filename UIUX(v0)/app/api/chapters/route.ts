import { NextRequest } from "next/server"
import { getChapters, addChapter } from "@/lib/db/queries/chapter"
import { ok, badRequest, withInit } from "@/lib/api/respond"

export const GET = withInit(async () => {
  const chapters = await getChapters()
  return ok({ chapters })
})

export const POST = withInit(async (req: NextRequest) => {
  const { name, start_date = null, end_date = null } = await req.json()
  if (!name?.trim()) return badRequest("이름 필수")
  await addChapter(name.trim(), start_date, end_date, 0)
  const chapters = await getChapters()
  return ok({ chapters })
})
