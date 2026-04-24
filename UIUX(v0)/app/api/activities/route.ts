import { NextRequest, NextResponse } from "next/server"
import { initDb, addActivityLog, getRecentActivities } from "@/lib/db"
import { gainExp } from "@/lib/game"
import { judgeActivity } from "@/lib/ai"

export async function GET() {
  try {
    await initDb()
    const logs = await getRecentActivities()
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
    if (result.error === "rate_limit") {
      return NextResponse.json({ error: "API 한도 초과. 잠시 후 다시 시도하세요." }, { status: 429 })
    }

    const levelResult = await gainExp(result.exp)
    await addActivityLog(text, "ai", result.exp, result.comment)

    return NextResponse.json({ ...result, ...levelResult })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
