import { NextRequest, NextResponse } from "next/server"
import { judgeProjectExp } from "@/lib/ai"

export async function POST(req: NextRequest) {
  try {
    const { name, description = "", priority = "medium" } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: "이름 필수" }, { status: 400 })
    const result = await judgeProjectExp(name.trim(), description, priority)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
