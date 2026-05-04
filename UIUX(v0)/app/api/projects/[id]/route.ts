import { NextRequest, NextResponse } from "next/server"
import { initDb } from "@/lib/db/schema"
import { getProjects, updateProject, deleteProject, getProjectById } from "@/lib/db/queries/project"
import { gainExp } from "@/lib/game"
import { addActivityLog } from "@/lib/db/queries/activity"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb()
    const { id } = await params
    const projectId = Number(id)
    const body = await req.json()

    if (body.status === "done") {
      const project = await getProjectById(projectId)
      if (!project) return NextResponse.json({ error: "없음" }, { status: 404 })
      await updateProject(projectId, { status: "done" })
      let levelResult = null
      if (project.bonus_exp > 0) {
        await addActivityLog(`[프로젝트 완료] ${project.name}`, "todo", project.bonus_exp, "프로젝트 완료 보너스!")
        levelResult = await gainExp(project.bonus_exp)
      }
      const projects = await getProjects()
      return NextResponse.json({ projects, bonusExp: project.bonus_exp, ...(levelResult ?? {}) })
    }

    const allowed = ["name", "description", "status", "priority", "due_date", "bonus_exp", "color"] as const
    const fields: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) fields[key] = body[key]
    }
    await updateProject(projectId, fields)
    const projects = await getProjects()
    return NextResponse.json({ projects })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb()
    const { id } = await params
    await deleteProject(Number(id))
    const projects = await getProjects()
    return NextResponse.json({ projects })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
