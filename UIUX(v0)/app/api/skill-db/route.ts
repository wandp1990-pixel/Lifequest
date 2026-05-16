import { NextRequest, NextResponse } from "next/server"
import { getAllSkillsDb, createSkillDb, updateSkillDb, deleteSkillDb } from "@/lib/db"
import { ok, badRequest, withInit } from "@/lib/api/respond"

/**
 * 쓰기 요청 인증 가드 (fail-closed).
 * - `ADMIN_SECRET` 환경변수가 미설정이면 503 반환 (외부 임의 호출 차단).
 * - 설정되어 있으면 `Authorization: Bearer <secret>` 헤더를 강제 (실패 시 401).
 * - GET 은 면제 (UI 에서 호출, settings 패널 표시용).
 * - `/api/battle-config` PUT 과 동일 정책. SkillDbPanel UI 가 헤더를 보내도록 추가 작업 필요.
 *
 * 인증 통과 시 null, 실패 시 503/401 NextResponse 반환.
 */
function requireAdmin(req: NextRequest): NextResponse | null {
  const secret = process.env.ADMIN_SECRET
  if (!secret) {
    return NextResponse.json({ error: "ADMIN_SECRET not configured" }, { status: 503 })
  }
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}

export const GET = withInit(async () => {
  const skills = await getAllSkillsDb()
  return ok({ skills })
})

export const POST = withInit(async (req: NextRequest) => {
  const unauth = requireAdmin(req)
  if (unauth) return unauth
  const data = await req.json()
  await createSkillDb(data)
  const skills = await getAllSkillsDb()
  return ok({ skills })
})

export const PUT = withInit(async (req: NextRequest) => {
  const unauth = requireAdmin(req)
  if (unauth) return unauth
  const { id, ...data } = await req.json()
  if (!id) return badRequest("id required")
  await updateSkillDb(id, data)
  const skills = await getAllSkillsDb()
  return ok({ skills })
})

export const DELETE = withInit(async (req: NextRequest) => {
  const unauth = requireAdmin(req)
  if (unauth) return unauth
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return badRequest("id required")
  await deleteSkillDb(id)
  const skills = await getAllSkillsDb()
  return ok({ skills })
})
