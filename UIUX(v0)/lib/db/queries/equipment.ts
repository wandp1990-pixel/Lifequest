import { getClient, now } from "../client"

export async function getEquipment() {
  const db = getClient()
  const res = await db.execute("SELECT * FROM equipment ORDER BY is_equipped DESC, id DESC")
  return res.rows
}

export async function addEquipment(slot: string, name: string, grade: string, baseStat: number, options: string[], rollLevel = 1) {
  const db = getClient()
  await db.execute({
    sql: "INSERT INTO equipment (slot,name,grade,base_stat,options,roll_level,is_equipped,created_at) VALUES (?,?,?,?,?,?,0,?)",
    args: [slot, name, grade, baseStat, JSON.stringify(options), rollLevel, now()],
  })
  const res = await db.execute("SELECT last_insert_rowid() AS id")
  return res.rows[0].id as number
}

export async function equipItem(itemId: number) {
  const db = getClient()
  const res = await db.execute({ sql: "SELECT slot FROM equipment WHERE id = ?", args: [itemId] })
  if (!res.rows[0]) return
  const slot = res.rows[0].slot
  await db.execute({ sql: "UPDATE equipment SET is_equipped = 0 WHERE slot = ?", args: [slot] })
  await db.execute({ sql: "UPDATE equipment SET is_equipped = 1 WHERE id = ?", args: [itemId] })
}

export async function unequipItem(itemId: number) {
  const db = getClient()
  await db.execute({ sql: "UPDATE equipment SET is_equipped = 0 WHERE id = ?", args: [itemId] })
}

export async function deleteEquipment(itemId: number) {
  const db = getClient()
  await db.execute({ sql: "DELETE FROM equipment WHERE id = ?", args: [itemId] })
}
