import { getClient } from "../client"

export async function getItemGrades() {
  const db = getClient()
  const res = await db.execute("SELECT * FROM item_grade_table ORDER BY weight DESC")
  return res.rows
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

export async function getPassivePool() {
  const db = getClient()
  const res = await db.execute("SELECT * FROM item_passive_pool WHERE is_active = 1")
  return res.rows
}
