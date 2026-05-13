import { NextRequest, NextResponse } from "next/server"
import { initDb } from "@/lib/db/schema"
import { getChapters, completeChapter, deleteChapter } from "@/lib/db/queries/chapter"
import { getCharacter, updateCharacter } from "@/lib/db/queries/character"
import { getProjects } from "@/lib/db/queries/project"
import { addActivityLog } from "@/lib/db/queries/activity"
import { gainExp } from "@/lib/game"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await initDb()
    const { id } = await params
    const chapterId = Number(id)
    const { action, bonus_tickets } = await req.json()

    if (action === "complete") {
      const projects = await getProjects()
      const linkedProjects = projects.filter((project) => project.chapter_id === chapterId)
      const hasIncompleteProject = linkedProjects.some((project) => project.status !== "done")
      if (hasIncompleteProject) {
        return NextResponse.json({ error: "연결된 프로젝트를 모두 완료해야 합니다." }, { status: 400 })
      }

      // 재완료 가드: completeChapter가 conditional. status='done'을 먼저 잡고 그 다음 티켓 지급.
      const newlyCompleted = await completeChapter(chapterId)
      if (!newlyCompleted) {
        return NextResponse.json({ error: "이미 완료된 챕터입니다" }, { status: 400 })
      }

      const chapters = await getChapters()
      const chapter = chapters.find((item) => item.id === chapterId)
      const bonusExp = Number(chapter?.bonus_exp ?? 0)
      let levelResult = null
      if (bonusExp > 0) {
        await addActivityLog(`[묶음 완료] ${chapter?.name ?? "프로젝트 묶음"}`, "todo", bonusExp, "묶음 완료 보너스!")
        levelResult = await gainExp(bonusExp)
      }

      const tickets = Number(bonus_tickets ?? 0)
      if (tickets > 0) {
        const char = await getCharacter()
        if (char) await updateCharacter({ draw_tickets: char.draw_tickets + tickets })
      }
      const refreshedChapters = await getChapters()
      return NextResponse.json({
        chapters: refreshedChapters,
        ticketsAwarded: tickets,
        bonusExp,
        ...(levelResult ?? {}),
      })
    }

    return NextResponse.json({ error: "알 수 없는 action" }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await initDb()
    const { id } = await params
    await deleteChapter(Number(id))
    const chapters = await getChapters()
    return NextResponse.json({ chapters })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
