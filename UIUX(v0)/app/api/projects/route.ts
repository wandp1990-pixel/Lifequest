import { NextRequest, NextResponse } from "next/server"
import { initDb } from "@/lib/db/schema"
import { getProjects, addProject } from "@/lib/db/queries/project"

function rollBonusExp(priority: string): number {
  const ranges: Record<string, [number, number]> = {
    low:    [50,  150],
    medium: [100, 300],
    high:   [250, 500],
  }
  const [min, max] = ranges[priority] ?? ranges.medium
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export async function GET() {
  try {
    await initDb()
    const projects = await getProjects()
    return NextResponse.json({ projects })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDb()
    const { name, description = "", priority = "medium", due_date = null, color = "violet", chapter_id = null } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: "이름 필수" }, { status: 400 })
    const bonus_exp = rollBonusExp(priority)
    await addProject(name.trim(), description, priority, bonus_exp, due_date, color, chapter_id)
    const projects = await getProjects()
    return NextResponse.json({ projects })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
