import { addActivityLog, getGameConfig } from "@/lib/db"
import { todayKST, now } from "@/lib/time/kst"
import { exec, execOne } from "@/lib/db/queries/_helpers"
import { gainExp } from "@/lib/game"
import { ok, badRequest, withInit } from "@/lib/api/respond"
import { QUEST_REWARD_MIN, QUEST_REWARD_MAX } from "@/lib/constants/quest"

const DEDUP_KEY = "_last_quest_reward_date"

export const POST = withInit(async () => {
  const today = todayKST()

  const dup = await execOne<{ config_value: string }>(
    "SELECT config_value FROM game_config WHERE config_key=?",
    [DEDUP_KEY],
  )
  if (dup?.config_value === today) return badRequest("오늘 이미 보상을 받았습니다")

  const cfg = await getGameConfig()
  const expMin = parseInt(cfg.daily_quest_exp_min ?? String(QUEST_REWARD_MIN))
  const expMax = parseInt(cfg.daily_quest_exp_max ?? String(QUEST_REWARD_MAX))
  const exp = Math.floor(Math.random() * (expMax - expMin + 1)) + expMin
  const levelResult = await gainExp(exp)
  await addActivityLog("데일리 퀘스트 완료", "daily", exp, "퀘스트 달성!")

  await exec(
    `INSERT INTO game_config (config_key, config_value, description, updated_at)
     VALUES (?, ?, '데일리 퀘스트 마지막 보상 수령일 (서버 dedup 용)', ?)
     ON CONFLICT(config_key) DO UPDATE SET config_value=excluded.config_value, updated_at=excluded.updated_at`,
    [DEDUP_KEY, today, now()],
  )

  return ok({ exp, ...levelResult })
})
