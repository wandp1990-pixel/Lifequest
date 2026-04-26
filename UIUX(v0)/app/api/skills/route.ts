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

    const [char, currentSkills] = await Promise.all([
      getCharacter(),
      getSkillsWithInvestment(),
    ])

    const currentMap = Object.fromEntries(currentSkills.map((s) => [s.id, s.invested]))

    // 투자 포인트 변화량 계산
    let skpDelta = 0
    for (const [id, newPts] of Object.entries(investments)) {
      skpDelta += newPts - (currentMap[id] ?? 0)
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
