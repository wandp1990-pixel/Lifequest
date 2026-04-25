import { getClient, now } from "../client"

export async function addActivityLog(text: string, type: string, exp: number, comment: string) {
  const db = getClient()
  await db.execute({
    sql: "INSERT INTO activity_log (input_text,input_type,exp_gained,ai_comment,created_at) VALUES (?,?,?,?,?)",
    args: [text, type, exp, comment, now()],
  })
  await db.execute(
    "DELETE FROM activity_log WHERE id NOT IN (SELECT id FROM activity_log ORDER BY id DESC LIMIT 30)"
  )
}

export async function getRecentActivities(type?: string, limit = 5) {
  const db = getClient()
  if (type) {
    const res = await db.execute({
      sql: "SELECT * FROM activity_log WHERE input_type=? ORDER BY id DESC LIMIT ?",
      args: [type, limit],
    })
    return res.rows
  }
  const res = await db.execute({
    sql: "SELECT * FROM activity_log ORDER BY id DESC LIMIT ?",
    args: [limit],
  })
  return res.rows
}
