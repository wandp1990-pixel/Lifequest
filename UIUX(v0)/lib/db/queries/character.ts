import { getClient, now } from "../client"
import type { Character } from "../types"

export async function getCharacter(): Promise<Character> {
  const db = getClient()
  const res = await db.execute("SELECT * FROM character WHERE id = 1")
  return res.rows[0] as unknown as Character
}

export async function updateCharacter(fields: Partial<Character>) {
  const db = getClient()
  const updates = { ...fields, updated_at: now() }
  const sets = Object.keys(updates).map((k) => `${k} = ?`).join(", ")
  const vals = [...Object.values(updates), 1]
  await db.execute({ sql: `UPDATE character SET ${sets} WHERE id = ?`, args: vals })
}

export async function incrementTaskCount() {
  const db = getClient()
  await db.execute("UPDATE character SET task_count = COALESCE(task_count,0) + 1 WHERE id = 1")
}
