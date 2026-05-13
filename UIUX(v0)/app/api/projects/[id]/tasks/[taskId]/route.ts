import { NextRequest, NextResponse } from "next/server"
import { initDb } from "@/lib/db/schema"
import {
  getProjects,
  completeProjectTask,
  deleteProjectTask,
  checkAndCompleteProject,
  getProjectById,
  updateProjectTaskExp,
} from "@/lib/db/queries/project"
import { gainExp } from "@/lib/game"
import { addActivityLog } from "@/lib/db/queries/activity"
import { incrementTaskCount } from "@/lib/db/queries/character"
import { getClient } from "@/lib/db/client"
import { judgeActivity } from "@/lib/ai"

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

    // race 방어: completeProjectTask가 conditional. 동시 PATCH 시 한 쪽만 통과.
    const claimed = await completeProjectTask(taskIdNum)
    if (!claimed) return NextResponse.json({ error: "이미 완료됨" }, { status: 400 })
    await incrementTaskCount()

    let expReward = Number(task.exp_reward)
    let project = await getProjectById(projectId)
    let aiComment: string | null = null
    if (expReward === 0) {
      const aiInput = `${project?.name ?? "프로젝트"} - ${String(task.name)}`
      const aiResult = await judgeActivity(aiInput)
      expReward = aiResult.exp
      aiComment = aiResult.comment
      await updateProjectTaskExp(taskIdNum, expReward)
      project = await getProjectById(projectId)
    }
    const taskComment = `[${project?.name ?? "프로젝트"}] ${task.name} 완료`
    await addActivityLog(String(task.name), "todo", expReward, aiComment ?? taskComment)
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
      comment: aiComment ?? taskComment,
      usedAi: aiComment !== null,
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
