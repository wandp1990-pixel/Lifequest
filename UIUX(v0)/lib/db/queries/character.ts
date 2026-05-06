import { getClient, now } from "../client"
import type { Character } from "../types"

// 캐릭터 정보 조회 (id=1 고정, 싱글 플레이어)
export async function getCharacter(): Promise<Character> {
  const db = getClient()
  const res = await db.execute("SELECT * FROM character WHERE id = 1")
  return res.rows[0] as unknown as Character
}

// 캐릭터 필드 부분 업데이트 (updated_at 자동 추가)
export async function updateCharacter(fields: Partial<Character>) {
  const db = getClient()
  const updates = { ...fields, updated_at: now() }
  const sets = Object.keys(updates).map((k) => `${k} = ?`).join(", ")
  const vals = [...Object.values(updates), 1]
  await db.execute({ sql: `UPDATE character SET ${sets} WHERE id = ?`, args: vals })
}

// 일일 완료 작업 수 증가 (체크리스트/투두 완료 시 호출)
export async function incrementTaskCount() {
  const db = getClient()
  await db.execute("UPDATE character SET task_count = COALESCE(task_count,0) + 1 WHERE id = 1")
}
