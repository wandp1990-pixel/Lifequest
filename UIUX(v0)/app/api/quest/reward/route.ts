import { NextResponse } from "next/server"
import { initDb, addActivityLog } from "@/lib/db"
import { gainExp } from "@/lib/game"

export async function POST() {
  try {
    await initDb()
    const exp = Math.floor(Math.random() * 41) + 10  // 10~50 랜덤
    const levelResult = await gainExp(exp)
    await addActivityLog("데일리 퀘스트 완료", "daily", exp, "퀘스트 달성!")
    return NextResponse.json({ exp, ...levelResult })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
