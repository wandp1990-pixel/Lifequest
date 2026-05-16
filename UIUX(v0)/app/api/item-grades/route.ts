import { NextRequest } from "next/server"
import { getItemGrades, updateItemGradeWeight } from "@/lib/db"
import { ok, badRequest, withInit } from "@/lib/api/respond"

export const GET = withInit(async () => {
  const rows = await getItemGrades()
  return ok(rows)
})

export const PUT = withInit(async (req: NextRequest) => {
  const { grade, weight } = await req.json()
  if (!grade) return badRequest("grade 필요")
  const w = parseFloat(weight)
  if (isNaN(w) || w < 0) return badRequest("weight는 0 이상 숫자")
  await updateItemGradeWeight(grade, w)
  return ok({ ok: true })
})
