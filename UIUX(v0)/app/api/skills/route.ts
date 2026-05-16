import { NextRequest } from "next/server"
import { getSkillsWithInvestment, getCharacter } from "@/lib/db"
import { tx } from "@/lib/db/queries/_helpers"
import { now } from "@/lib/time/kst"
import { ok, badRequest, withInit } from "@/lib/api/respond"

export const GET = withInit(async () => {
  const skills = await getSkillsWithInvestment()
  return ok({ skills })
})

// 스킬 invested 변경. 단일 트랜잭션 안에서 read → 검증 → write 모두 처리.
// 누락 시 (이전): 동시 PUT 호출의 read-modify-write race 로 lost update 가능.
// 검증 실패는 discriminated union 으로 반환해 rollback 없이 빠져나감 (write 발생 전 단계).
export const PUT = withInit(async (req: NextRequest) => {
  const { investments } = await req.json() as { investments: Record<string, number> }

  for (const val of Object.values(investments)) {
    if (!Number.isInteger(val) || val < 0) {
      return badRequest("투자 값은 0 이상의 정수여야 합니다")
    }
  }

  type SkillRow = { id: string; name: string; max_skp: number; unlock_level: number; invested: number }
  type CharRow = { level: number; skill_points: number }

  const result = await tx<{ ok: true } | { ok: false; msg: string }>(async (t) => {
    const charRes = await t.execute("SELECT level, skill_points FROM character WHERE id = 1")
    if (charRes.rows.length === 0) return { ok: false, msg: "캐릭터 데이터 없음" }
    const char = charRes.rows[0] as unknown as CharRow

    const skillsRes = await t.execute(`
      SELECT s.id, s.name, s.max_skp, s.unlock_level,
             COALESCE(l.invested_points, 0) AS invested
      FROM skill_table s
      LEFT JOIN skill_log l ON s.id = l.skill_id
      WHERE s.is_active = 1
    `)
    const currentSkills = skillsRes.rows as unknown as SkillRow[]
    const currentMap = Object.fromEntries(currentSkills.map((s) => [s.id, s]))

    let skpDelta = 0
    for (const [id, newPts] of Object.entries(investments)) {
      const skill = currentMap[id]
      if (!skill) return { ok: false, msg: `알 수 없는 스킬: ${id}` }
      if (newPts > skill.max_skp) {
        return { ok: false, msg: `${skill.name} 최대 투자 포인트(${skill.max_skp}) 초과` }
      }
      if (newPts > skill.invested && char.level < skill.unlock_level) {
        return { ok: false, msg: `${skill.name} 해금 레벨(${skill.unlock_level}) 미달` }
      }
      skpDelta += newPts - skill.invested
    }

    if (skpDelta > char.skill_points) {
      return { ok: false, msg: "스킬 포인트 부족" }
    }

    // 검증 통과 — write 단계
    const ts = now()
    for (const [skillId, points] of Object.entries(investments)) {
      const existing = await t.execute({
        sql: "SELECT id FROM skill_log WHERE skill_id = ?",
        args: [skillId],
      })
      if (existing.rows.length > 0) {
        await t.execute({
          sql: "UPDATE skill_log SET invested_points = ?, is_unlocked = ?, updated_at = ? WHERE skill_id = ?",
          args: [points, points > 0 ? 1 : 0, ts, skillId],
        })
      } else {
        await t.execute({
          sql: "INSERT INTO skill_log (skill_id, invested_points, is_unlocked, updated_at) VALUES (?, ?, ?, ?)",
          args: [skillId, points, points > 0 ? 1 : 0, ts],
        })
      }
    }
    await t.execute({
      sql: "UPDATE character SET skill_points = ?, updated_at = ? WHERE id = 1",
      args: [char.skill_points - skpDelta, ts],
    })

    return { ok: true }
  })

  if (!result.ok) return badRequest(result.msg)

  const updatedSkills = await getSkillsWithInvestment()
  const charAfter = await getCharacter()
  return ok({ skills: updatedSkills, skill_points: charAfter.skill_points })
})
