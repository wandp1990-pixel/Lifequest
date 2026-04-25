import { NextRequest, NextResponse } from "next/server"
import { initDb, getActivePrompt, updatePromptContent } from "@/lib/db"

export async function GET() {
  try {
    await initDb()
    const content = await getActivePrompt("general")
    return NextResponse.json({ content })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await initDb()
    const { content } = await req.json()
    if (!content?.trim()) return NextResponse.json({ error: "내용을 입력하세요" }, { status: 400 })
    await updatePromptContent("general", content)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
