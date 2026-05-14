import { NextRequest } from "next/server"
import { getBattleConfigFull, updateBattleConfigValue } from "@/lib/db"
import { ok, badRequest, withInit } from "@/lib/api/respond"

export const GET = withInit(async () => {
  const rows = await getBattleConfigFull()
  const mapped = rows.map((r) => ({
    config_key: r.config_key,
    config_value: r.config_value,
    label: r.label,
    min_val: r.min_val,
    max_val: r.max_val,
    step: r.step,
  }))
  return ok(mapped)
})

export const PUT = withInit(async (req: NextRequest) => {
  const { key, value } = await req.json()
  if (!key) return badRequest("key 필요")
  await updateBattleConfigValue(key, String(value))
  return ok({ ok: true })
})
