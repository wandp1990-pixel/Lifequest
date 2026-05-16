import { getClient } from "../client"

export async function getItemGrades() {
  const db = getClient()
  const res = await db.execute("SELECT * FROM item_grade_table ORDER BY weight DESC")
  return res.rows
}

export async function updateItemGradeWeight(grade: string, weight: number) {
  const db = getClient()
  await db.execute({
    sql: "UPDATE item_grade_table SET weight = ? WHERE grade = ?",
    args: [weight, grade],
  })
}

export async function getItemSlots() {
  const db = getClient()
  const res = await db.execute("SELECT * FROM item_slot_table")
  return res.rows
}

export async function getAbilityPool(category?: string) {
  const db = getClient()
  if (category) {
    const res = await db.execute({
      sql: "SELECT * FROM item_ability_pool WHERE is_active = 1 AND category = ?",
      args: [category],
    })
    return res.rows
  }
  const res = await db.execute("SELECT * FROM item_ability_pool WHERE is_active = 1")
  return res.rows
}

// skill_table 에서 read — 가챠 패시브 = 보유 스킬 강화 (장비 옵션 [스킬명] → invested 가산).
// SoT: skill_table (item_passive_pool 테이블은 사용 안 함, 옵션 A 확정).
export async function getGachaPassiveSource() {
  const db = getClient()
  const res = await db.execute(
    "SELECT id, name, description FROM skill_table WHERE is_active = 1"
  )
  return res.rows
}
