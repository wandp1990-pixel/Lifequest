import { NextRequest } from "next/server"
import {
  getProjects,
  completeProjectTask,
  deleteProjectTask,
  checkAndCompleteProject,
  getProjectById,
  updateProjectTaskExp,
} from "@/lib/db/queries/project"
import { getChapterById } from "@/lib/db/queries/chapter"
import { gainExp } from "@/lib/game"
import { addActivityLog } from "@/lib/db/queries/activity"
import { incrementTaskCount } from "@/lib/db/queries/character"
import { execOne } from "@/lib/db/queries/_helpers"
import { judgeActivity } from "@/lib/ai"
import { ok, badRequest, notFound, withInit } from "@/lib/api/respond"

export const PATCH = withInit(async (
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; taskId: string }> },
) => {
  const { id, taskId } = await ctx.params
  const projectId = Number(id)
  const taskIdNum = Number(taskId)

  const task = await execOne<{ name: unknown; exp_reward: unknown; is_completed: unknown }>(
    "SELECT * FROM project_task WHERE id=?",
    [taskIdNum],
  )
  if (!task) return notFound("없음")
  if (task.is_completed) return badRequest("이미 완료됨")

  // race 방어: completeProjectTask 가 conditional. 동시 PATCH 시 한 쪽만 통과.
  const claimed = await completeProjectTask(taskIdNum)
  if (!claimed) return badRequest("이미 완료됨")
  await incrementTaskCount()

  let expReward = Number(task.exp_reward)
  let project = await getProjectById(projectId)
  const chapter = project?.chapter_id ? await getChapterById(project.chapter_id) : null
  const chapterPrefix = chapter ? `[${chapter.name}] ` : ""
  const taskLabel = `${chapterPrefix}${project?.name ?? "프로젝트"} > ${String(task.name)}`
  let aiComment: string | null = null
  if (expReward === 0) {
    const aiResult = await judgeActivity(taskLabel)
    expReward = aiResult.exp
    aiComment = aiResult.comment
    await updateProjectTaskExp(taskIdNum, expReward)
    project = await getProjectById(projectId)
  }
  const taskComment = `${taskLabel} 완료`
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
  return ok({
    exp: expReward,
    comment: aiComment ?? taskComment,
    usedAi: aiComment !== null,
    projectCompleted,
    bonusExp,
    ...levelResult,
    ...(bonusLevelResult ? { bonusLevelResult } : {}),
    projects,
  })
})

export const DELETE = withInit(async (
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; taskId: string }> },
) => {
  const { taskId } = await ctx.params
  await deleteProjectTask(Number(taskId))
  const projects = await getProjects()
  return ok({ projects })
})
