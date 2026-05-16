import { NextRequest, NextResponse } from "next/server"
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

// PUT: 환경변수 ADMIN_SECRET 기반 토큰 검증 (외부 임의 호출 방지)
// 헤더 x-admin-token 또는 Authorization: Bearer <token> 으로 전달
// ADMIN_SECRET 미설정 시 PUT 불가 (production 보안)
// /api/skill-db 와 동일 env 사용 — CRON_SECRET 컨벤션 일관
export const PUT = withInit(async (req: NextRequest) => {
  const expected = process.env.ADMIN_SECRET
  if (!expected) {
    return NextResponse.json({ error: "ADMIN_SECRET not configured" }, { status: 503 })
  }
  const headerToken = req.headers.get("x-admin-token")
    ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    ?? null
  if (headerToken !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const { key, value } = await req.json()
  if (!key) return badRequest("key 필요")
  await updateBattleConfigValue(key, String(value))
  return ok({ ok: true })
})
