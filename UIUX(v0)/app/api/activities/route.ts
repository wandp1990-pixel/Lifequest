import { NextRequest, NextResponse } from "next/server"
import { initDb, addActivityLog, getRecentActivities } from "@/lib/db"
import { gainExp } from "@/lib/game"
import { judgeActivity } from "@/lib/ai"

export async function GET(req: NextRequest) {
  try {
    await initDb()
    const type = req.nextUrl.searchParams.get("type") ?? undefined
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "5")
    const logs = await getRecentActivities(type, limit)
    return NextResponse.json(logs)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDb()
    const { text } = await req.json()
    if (!text?.trim()) return NextResponse.json({ error: "활동 내용을 입력하세요" }, { status: 400 })

    const result = await judgeActivity(text)
    if (result.error) {
      return NextResponse.json({ error: `[AI 오류] ${result.error}` }, { status: 500 })
    }
    const levelResult = await gainExp(result.exp)
    await addActivityLog(text, "ai", result.exp, result.comment)

    return NextResponse.json({ ...result, ...levelResult })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
