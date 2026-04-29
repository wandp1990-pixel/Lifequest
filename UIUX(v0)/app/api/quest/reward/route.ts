import { NextResponse } from "next/server"
import { initDb, addActivityLog, getGameConfig } from "@/lib/db"
import { gainExp } from "@/lib/game"

export async function POST() {
  try {
    await initDb()
    const cfg = await getGameConfig()
    const expMin = parseInt(cfg.daily_quest_exp_min ?? "10")
    const expMax = parseInt(cfg.daily_quest_exp_max ?? "50")
    const exp = Math.floor(Math.random() * (expMax - expMin + 1)) + expMin
    const levelResult = await gainExp(exp)
    await addActivityLog("데일리 퀘스트 완료", "daily", exp, "퀘스트 달성!")
    return NextResponse.json({ exp, ...levelResult })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
