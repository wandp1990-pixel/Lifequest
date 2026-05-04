import { NextRequest, NextResponse } from "next/server"
import { initDb } from "@/lib/db/schema"
import {
  getProjects,
  completeProjectTask,
  deleteProjectTask,
  checkAndCompleteProject,
  getProjectById,
} from "@/lib/db/queries/project"
import { gainExp } from "@/lib/game"
import { addActivityLog } from "@/lib/db/queries/activity"
import { incrementTaskCount } from "@/lib/db/queries/character"
import { getClient } from "@/lib/db/client"

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    await initDb()
    const { id, taskId } = await params
    const projectId = Number(id)
    const taskIdNum = Number(taskId)

    const db = getClient()
    const taskRes = await db.execute({ sql: "SELECT * FROM project_task WHERE id=?", args: [taskIdNum] })
    if (taskRes.rows.length === 0) return NextResponse.json({ error: "없음" }, { status: 404 })
    const task = taskRes.rows[0]

    if (task.is_completed) return NextResponse.json({ error: "이미 완료됨" }, { status: 400 })

    await completeProjectTask(taskIdNum)
    await incrementTaskCount()

    const expReward = Number(task.exp_reward)
    const project = await getProjectById(projectId)
    const taskComment = `[${project?.name ?? "프로젝트"}] ${task.name} 완료`
    await addActivityLog(String(task.name), "todo", expReward, taskComment)
    const levelResult = await gainExp(expReward)

    const projectCompleted = await checkAndCompleteProject(projectId)
    let bonusExp = 0
    let bonusLevelResult = null
    if (projectCompleted && project && project.bonus_exp > 0) {
      bonusExp = project.bonus_exp
      await addActivityLog(`[프로젝트 완료] ${project.name}`, "todo", bonusExp, "프로젝트 완료 보너스!")
      bonusLevelResult = await gainExp(bonusExp)
    }

    const projects = await getProjects()
    return NextResponse.json({
      exp: expReward,
      comment: taskComment,
      projectCompleted,
      bonusExp,
      ...levelResult,
      ...(bonusLevelResult ? { bonusLevelResult } : {}),
      projects,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    await initDb()
    const { taskId } = await params
    await deleteProjectTask(Number(taskId))
    const projects = await getProjects()
    return NextResponse.json({ projects })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
