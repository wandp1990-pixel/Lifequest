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

// AI 호출 비용 보호: 너무 긴 텍스트는 차단
const MAX_ACTIVITY_LENGTH = 1000

export async function POST(req: NextRequest) {
  try {
    await initDb()
    const { text } = await req.json()
    if (!text?.trim()) return NextResponse.json({ error: "활동 내용을 입력하세요" }, { status: 400 })
    if (typeof text !== "string" || text.length > MAX_ACTIVITY_LENGTH) {
      return NextResponse.json(
        { error: `활동 내용은 ${MAX_ACTIVITY_LENGTH}자 이하로 입력하세요` },
        { status: 400 }
      )
    }

    const result = await judgeActivity(text)
    const levelResult = await gainExp(result.exp)
    await addActivityLog(text, "ai", result.exp, result.comment)

    return NextResponse.json({ ...result, ...levelResult })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
