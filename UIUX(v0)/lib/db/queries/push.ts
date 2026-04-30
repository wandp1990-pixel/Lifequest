import { getClient, now } from "../client"

export async function savePushSubscription(endpoint: string, p256dh: string, auth: string) {
  const db = getClient()
  await db.execute({
    sql: `INSERT INTO push_subscription (endpoint, p256dh, auth, created_at)
          VALUES (?,?,?,?)
          ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh, auth=excluded.auth, created_at=excluded.created_at`,
    args: [endpoint, p256dh, auth, now()],
  })
}

export async function deletePushSubscription(endpoint: string) {
  const db = getClient()
  await db.execute({ sql: "DELETE FROM push_subscription WHERE endpoint=?", args: [endpoint] })
}

export async function getAllPushSubscriptions() {
  const db = getClient()
  const res = await db.execute("SELECT endpoint, p256dh, auth FROM push_subscription")
  return res.rows as { endpoint: string; p256dh: string; auth: string }[]
}

export async function updateChecklistNotifyTime(id: number, notifyTime: string | null) {
  const db = getClient()
  await db.execute({ sql: "UPDATE checklist_item SET notify_time=? WHERE id=?", args: [notifyTime, id] })
}

export async function updateTodoNotifyTime(id: number, notifyTime: string | null) {
  const db = getClient()
  await db.execute({ sql: "UPDATE todo_item SET notify_time=? WHERE id=?", args: [notifyTime, id] })
}

export async function getPendingHabitNotifications(timeKST: string, dateKST: string) {
  const db = getClient()
  const res = await db.execute({
    sql: `SELECT ci.id, ci.name FROM checklist_item ci
          WHERE ci.is_active = 1 AND ci.notify_time = ?
            AND NOT EXISTS (
              SELECT 1 FROM checklist_log cl
              WHERE cl.item_id = ci.id AND cl.checked_at LIKE ?
            )`,
    args: [timeKST, `${dateKST}%`],
  })
  return res.rows as { id: number; name: string }[]
}

export async function getPendingTodoNotifications(timeKST: string) {
  const db = getClient()
  const res = await db.execute({
    sql: "SELECT id, name FROM todo_item WHERE is_completed = 0 AND notify_time = ?",
    args: [timeKST],
  })
  return res.rows as { id: number; name: string }[]
}
