import { NextRequest, NextResponse } from "next/server"
import { initDb } from "@/lib/db/schema"
import { getChapters, addChapter } from "@/lib/db/queries/chapter"

export async function GET() {
  try {
    await initDb()
    const chapters = await getChapters()
    return NextResponse.json({ chapters })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDb()
    const { name, start_date = null, end_date = null, bonus_tickets = 3 } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: "이름 필수" }, { status: 400 })
    await addChapter(name.trim(), start_date, end_date, bonus_tickets)
    const chapters = await getChapters()
    return NextResponse.json({ chapters })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
