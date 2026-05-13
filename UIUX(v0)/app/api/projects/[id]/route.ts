import { NextRequest } from "next/server"
import { getProjects, updateProject, deleteProject, getProjectById, completeProject } from "@/lib/db/queries/project"
import { gainExp } from "@/lib/game"
import { addActivityLog } from "@/lib/db/queries/activity"
import { ok, badRequest, notFound, withInit } from "@/lib/api/respond"

export const PATCH = withInit(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const projectId = Number(id)
  const body = await req.json()

  if (body.status === "done") {
    const project = await getProjectById(projectId)
    if (!project) return notFound("없음")
    // 모든 task 완료되어야 프로젝트 done 전환 + 보너스 지급. 우회로 차단.
    const total = project.tasks.length
    const doneCount = project.tasks.filter((t) => t.is_completed).length
    if (total === 0 || doneCount < total) {
      return badRequest("모든 작업을 완료해야 프로젝트를 완료할 수 있습니다")
    }
    // 재완료 가드: completeProject 가 conditional UPDATE 라 false 면 이미 완료된 것
    const newlyCompleted = await completeProject(projectId)
    if (!newlyCompleted) return badRequest("이미 완료된 프로젝트입니다")

    // 프로젝트 완료 보너스: incrementTaskCount 미호출 (기존 동작 보존 — applyReward 미사용)
    let levelResult = null
    if (project.bonus_exp > 0) {
      await addActivityLog(`[프로젝트 완료] ${project.name}`, "todo", project.bonus_exp, "프로젝트 완료 보너스!")
      levelResult = await gainExp(project.bonus_exp)
    }
    const projects = await getProjects()
    return ok({ projects, bonusExp: project.bonus_exp, ...(levelResult ?? {}) })
  }

  // 이미 done 인 프로젝트를 todo/in_progress 로 되돌리는 PATCH 차단.
  // 허용하면 재완료 가드(status != 'done')가 무력화되어 보너스 무한 지급 가능.
  if (body.status === "todo" || body.status === "in_progress") {
    const current = await getProjectById(projectId)
    if (current?.status === "done") return badRequest("완료된 프로젝트는 되돌릴 수 없습니다")
  }

  const allowed = ["name", "description", "status", "priority", "due_date", "bonus_exp", "color", "chapter_id"] as const
  const fields: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) fields[key] = body[key]
  }
  await updateProject(projectId, fields)
  const projects = await getProjects()
  return ok({ projects })
})

export const DELETE = withInit(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  await deleteProject(Number(id))
  const projects = await getProjects()
  return ok({ projects })
})
