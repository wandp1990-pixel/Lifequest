import { NextRequest, NextResponse } from "next/server"
import { initDb } from "@/lib/db/schema"
import { getChapters, completeChapter, deleteChapter } from "@/lib/db/queries/chapter"
import { getCharacter, updateCharacter } from "@/lib/db/queries/character"

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
      const tickets = Number(bonus_tickets ?? 0)
      if (tickets > 0) {
        const char = await getCharacter()
        if (char) await updateCharacter({ draw_tickets: char.draw_tickets + tickets })
      }
      await completeChapter(chapterId)
      const chapters = await getChapters()
      return NextResponse.json({ chapters, ticketsAwarded: tickets })
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
