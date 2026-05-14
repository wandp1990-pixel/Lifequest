import { NextRequest } from "next/server"
import { getGameConfigFull, updateGameConfigValue } from "@/lib/db"
import { ok, badRequest, withInit } from "@/lib/api/respond"

export const GET = withInit(async () => {
  return ok(await getGameConfigFull())
})

export const PUT = withInit(async (req: NextRequest) => {
  const { key, value } = await req.json()
  if (!key) return badRequest("key 필요")
  await updateGameConfigValue(key, String(value))
  return ok({ ok: true })
})
