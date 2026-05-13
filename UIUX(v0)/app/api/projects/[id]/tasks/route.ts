import { NextRequest, NextResponse } from "next/server"
import { initDb } from "@/lib/db/schema"
import { getProjects, addProjectTask, getProjectById } from "@/lib/db/queries/project"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb()
    const { id } = await params
    const projectId = Number(id)
    const { name, exp_reward = 0 } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: "이름 필수" }, { status: 400 })
    await addProjectTask(projectId, name.trim(), Math.max(0, Number(exp_reward) || 0))
    const projects = await getProjects()
    return NextResponse.json({ projects })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
