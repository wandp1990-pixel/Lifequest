import { NextResponse } from "next/server"
import { initDb, addActivityLog, getGameConfig, getClient } from "@/lib/db"
import { todayKST, now } from "@/lib/db/client"
import { gainExp } from "@/lib/game"

const DEDUP_KEY = "_last_quest_reward_date"

export async function POST() {
  try {
    await initDb()
    const db = getClient()
    const today = todayKST()

    const dupRes = await db.execute({
      sql: "SELECT config_value FROM game_config WHERE config_key=?",
      args: [DEDUP_KEY],
    })
    if ((dupRes.rows[0]?.config_value as string | undefined) === today) {
      return NextResponse.json({ error: "오늘 이미 보상을 받았습니다" }, { status: 400 })
    }

    const cfg = await getGameConfig()
    const expMin = parseInt(cfg.daily_quest_exp_min ?? "50")
    const expMax = parseInt(cfg.daily_quest_exp_max ?? "100")
    const exp = Math.floor(Math.random() * (expMax - expMin + 1)) + expMin
    const levelResult = await gainExp(exp)
    await addActivityLog("데일리 퀘스트 완료", "daily", exp, "퀘스트 달성!")

    await db.execute({
      sql: `INSERT INTO game_config (config_key, config_value, description, updated_at)
            VALUES (?, ?, '데일리 퀘스트 마지막 보상 수령일 (서버 dedup 용)', ?)
            ON CONFLICT(config_key) DO UPDATE SET config_value=excluded.config_value, updated_at=excluded.updated_at`,
      args: [DEDUP_KEY, today, now()],
    })

    return NextResponse.json({ exp, ...levelResult })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
