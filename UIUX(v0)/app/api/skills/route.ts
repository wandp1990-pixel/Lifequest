import { NextRequest, NextResponse } from "next/server"
import {
  initDb, getSkillsWithInvestment, saveSkillInvestments,
  getCharacter, updateCharacter,
} from "@/lib/db"

export async function GET() {
  try {
    await initDb()
    const skills = await getSkillsWithInvestment()
    return NextResponse.json({ skills })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await initDb()
    const { investments } = await req.json() as { investments: Record<string, number> }

    for (const val of Object.values(investments)) {
      if (!Number.isInteger(val) || val < 0) {
        return NextResponse.json({ error: "투자 값은 0 이상의 정수여야 합니다" }, { status: 400 })
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
        return NextResponse.json({ error: `알 수 없는 스킬: ${id}` }, { status: 400 })
      }
      if (newPts > skill.max_skp) {
        return NextResponse.json({ error: `${skill.name} 최대 투자 포인트(${skill.max_skp}) 초과` }, { status: 400 })
      }
      if (newPts > skill.invested && char.level < skill.unlock_level) {
        return NextResponse.json({ error: `${skill.name} 해금 레벨(${skill.unlock_level}) 미달` }, { status: 400 })
      }
      skpDelta += newPts - skill.invested
    }

    const available = char.skill_points
    if (skpDelta > available) {
      return NextResponse.json({ error: "스킬 포인트 부족" }, { status: 400 })
    }

    await saveSkillInvestments(investments)
    await updateCharacter({ skill_points: available - skpDelta })

    const updatedSkills = await getSkillsWithInvestment()
    const charAfter = await getCharacter()
    return NextResponse.json({ skills: updatedSkills, skill_points: charAfter.skill_points })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
