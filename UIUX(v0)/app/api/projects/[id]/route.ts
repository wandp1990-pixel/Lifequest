import { NextRequest, NextResponse } from "next/server"
import { initDb } from "@/lib/db/schema"
import { getProjects, updateProject, deleteProject, getProjectById, completeProject } from "@/lib/db/queries/project"
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
      // 모든 task가 완료되어야 프로젝트 done 전환 + 보너스 지급.
      // 우회로 차단: task 미완료에도 status 토글로 bonus를 받던 버그.
      const total = project.tasks.length
      const doneCount = project.tasks.filter((t) => t.is_completed).length
      if (total === 0 || doneCount < total) {
        return NextResponse.json({ error: "모든 작업을 완료해야 프로젝트를 완료할 수 있습니다" }, { status: 400 })
      }
      // 재완료 가드: completeProject가 conditional UPDATE라 false면 이미 완료된 것
      const newlyCompleted = await completeProject(projectId)
      if (!newlyCompleted) {
        return NextResponse.json({ error: "이미 완료된 프로젝트입니다" }, { status: 400 })
      }
      let levelResult = null
      if (project.bonus_exp > 0) {
        await addActivityLog(`[프로젝트 완료] ${project.name}`, "todo", project.bonus_exp, "프로젝트 완료 보너스!")
        levelResult = await gainExp(project.bonus_exp)
      }
      const projects = await getProjects()
      return NextResponse.json({ projects, bonusExp: project.bonus_exp, ...(levelResult ?? {}) })
    }

    // 이미 done인 프로젝트를 todo/in_progress로 되돌리는 PATCH 차단.
    // 허용하면 재완료 가드(status!='done')가 무력화되어 보너스 무한 지급 가능.
    if (body.status === "todo" || body.status === "in_progress") {
      const current = await getProjectById(projectId)
      if (current?.status === "done") {
        return NextResponse.json({ error: "완료된 프로젝트는 되돌릴 수 없습니다" }, { status: 400 })
      }
    }

    const allowed = ["name", "description", "status", "priority", "due_date", "bonus_exp", "color", "chapter_id"] as const
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
