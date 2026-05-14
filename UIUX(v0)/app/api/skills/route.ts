import { NextRequest } from "next/server"
import {
  getSkillsWithInvestment, saveSkillInvestments,
  getCharacter, updateCharacter,
} from "@/lib/db"
import { ok, badRequest, withInit } from "@/lib/api/respond"

export const GET = withInit(async () => {
  const skills = await getSkillsWithInvestment()
  return ok({ skills })
})

export const PUT = withInit(async (req: NextRequest) => {
  const { investments } = await req.json() as { investments: Record<string, number> }

  for (const val of Object.values(investments)) {
    if (!Number.isInteger(val) || val < 0) {
      return badRequest("투자 값은 0 이상의 정수여야 합니다")
    }
  }

  const [char, currentSkills] = await Promise.all([
    getCharacter(),
    getSkillsWithInvestment(),
  ])

  const currentMap = Object.fromEntries(currentSkills.map((s) => [s.id, s]))

  let skpDelta = 0
  for (const [id, newPts] of Object.entries(investments)) {
    const skill = currentMap[id]
    if (!skill) {
      return badRequest(`알 수 없는 스킬: ${id}`)
    }
    if (newPts > skill.max_skp) {
      return badRequest(`${skill.name} 최대 투자 포인트(${skill.max_skp}) 초과`)
    }
    if (newPts > skill.invested && char.level < skill.unlock_level) {
      return badRequest(`${skill.name} 해금 레벨(${skill.unlock_level}) 미달`)
    }
    skpDelta += newPts - skill.invested
  }

  const available = char.skill_points
  if (skpDelta > available) {
    return badRequest("스킬 포인트 부족")
  }

  await saveSkillInvestments(investments)
  await updateCharacter({ skill_points: available - skpDelta })

  const updatedSkills = await getSkillsWithInvestment()
  const charAfter = await getCharacter()
  return ok({ skills: updatedSkills, skill_points: charAfter.skill_points })
})
