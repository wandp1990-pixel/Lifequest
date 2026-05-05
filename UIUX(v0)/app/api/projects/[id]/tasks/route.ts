import { NextRequest, NextResponse } from "next/server"
import { initDb } from "@/lib/db/schema"
import { getProjects, addProjectTask, getProjectById } from "@/lib/db/queries/project"

function rollTaskExp(priority: string): number {
  const ranges: Record<string, [number, number]> = {
    low:    [5,  15],
    medium: [10, 30],
    high:   [20, 50],
  }
  const [min, max] = ranges[priority] ?? ranges.medium
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb()
    const { id } = await params
    const projectId = Number(id)
    const { name } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: "이름 필수" }, { status: 400 })
    const project = await getProjectById(projectId)
    const exp_reward = rollTaskExp(project?.priority ?? "medium")
    await addProjectTask(projectId, name.trim(), exp_reward)
    const projects = await getProjects()
    return NextResponse.json({ projects })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
