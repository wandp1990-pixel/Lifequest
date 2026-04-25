import { getClient, now } from "../client"

export async function getGameConfig(): Promise<Record<string, string>> {
  const db = getClient()
  const res = await db.execute("SELECT config_key, config_value FROM game_config")
  return Object.fromEntries(res.rows.map((r) => [r.config_key, r.config_value]))
}

export async function getGameConfigFull() {
  const db = getClient()
  const res = await db.execute("SELECT config_key, config_value, description FROM game_config ORDER BY id")
  return res.rows
}

export async function updateGameConfigValue(key: string, value: string) {
  const db = getClient()
  await db.execute({
    sql: "UPDATE game_config SET config_value=?, updated_at=? WHERE config_key=?",
    args: [value, now(), key],
  })
}

export async function getBattleConfig(): Promise<Record<string, string>> {
  const db = getClient()
  const res = await db.execute("SELECT config_key, config_value FROM battle_config")
  return Object.fromEntries(res.rows.map((r) => [r.config_key, r.config_value]))
}
