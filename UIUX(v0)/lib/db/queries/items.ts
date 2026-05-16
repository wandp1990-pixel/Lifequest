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

// 주의: 함수명과 다르게 skill_table에서 read한다. 가챠 패시브 풀은
//       item_passive_pool seed가 dead 상태(매칭되는 skill_table.name 없음)라
//       skill_table을 사용하도록 의도된 것. SoT 정책 결정 후 별도 작업으로
//       함수명 정리 또는 동작 변경 필요. (검증 보고서 HIGH 1 참조)
export async function getPassivePool() {
  const db = getClient()
  const res = await db.execute(
    "SELECT id, name, description FROM skill_table WHERE is_active = 1"
  )
  return res.rows
}
