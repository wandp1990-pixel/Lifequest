import { NextRequest, NextResponse } from "next/server"
import { initDb } from "@/lib/db/schema"
import { getProjects, addProject } from "@/lib/db/queries/project"

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
    await addProject(name.trim(), description, priority, 0, due_date, color, chapter_id)
    const projects = await getProjects()
    return NextResponse.json({ projects })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
