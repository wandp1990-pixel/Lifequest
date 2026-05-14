import { NextRequest } from "next/server"
import { getChapters, completeChapter, deleteChapter } from "@/lib/db/queries/chapter"
import { getProjects } from "@/lib/db/queries/project"
import { addActivityLog } from "@/lib/db/queries/activity"
import { gainExp } from "@/lib/game"
import { ok, badRequest, withInit } from "@/lib/api/respond"

export const PATCH = withInit(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params
  const chapterId = Number(id)
  const { action } = await req.json()

  if (action === "complete") {
    const projects = await getProjects()
    const linkedProjects = projects.filter((project) => project.chapter_id === chapterId)
    const hasIncompleteProject = linkedProjects.some((project) => project.status !== "done")
    if (hasIncompleteProject) {
      return badRequest("연결된 프로젝트를 모두 완료해야 합니다.")
    }

    // 재완료 가드: completeChapter가 conditional. status='done'을 먼저 잡는다.
    const newlyCompleted = await completeChapter(chapterId)
    if (!newlyCompleted) {
      return badRequest("이미 완료된 챕터입니다")
    }

    const chapters = await getChapters()
    const chapter = chapters.find((item) => item.id === chapterId)
    const bonusExp = Number(chapter?.bonus_exp ?? 0)
    let levelResult = null
    if (bonusExp > 0) {
      await addActivityLog(`[묶음 완료] ${chapter?.name ?? "프로젝트 묶음"}`, "todo", bonusExp, "묶음 완료 보너스!")
      levelResult = await gainExp(bonusExp)
    }

    const refreshedChapters = await getChapters()
    return ok({
      chapters: refreshedChapters,
      bonusExp,
      ...(levelResult ?? {}),
    })
  }

  return badRequest("알 수 없는 action")
})

export const DELETE = withInit(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params
  await deleteChapter(Number(id))
  const chapters = await getChapters()
  return ok({ chapters })
})
