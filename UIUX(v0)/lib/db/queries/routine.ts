import { getClient, now, todayKST } from "../client"

export interface RoutineItemRow {
  id: number
  routine_id: number
  name: string
  fixed_exp: number
  sort_order: number
  time_limit_minutes: number | null
}

export interface RoutineRow {
  id: number
  name: string
  sort_order: number
  items: RoutineItemRow[]
}

export interface RoutineCheckResult {
  exp: number
  bonusExp: number
  allDone: boolean
  routineName: string
  timeBonus: boolean
}


export async function getRoutines(): Promise<{
  routines: RoutineRow[]
  checkedItemIds: number[]
  bonusRoutineIds: number[]
}> {
  const db = getClient()
  const today = todayKST()

  const rRes = await db.execute(
    "SELECT id, name, sort_order FROM routine WHERE is_active = 1 ORDER BY sort_order, id"
  )
  const iRes = await db.execute(
    "SELECT id, routine_id, name, fixed_exp, sort_order, time_limit_minutes FROM routine_item WHERE is_active = 1 ORDER BY sort_order, id"
  )
  const lRes = await db.execute({
    sql: "SELECT item_id FROM routine_log WHERE checked_at LIKE ?",
    args: [`${today}%`],
  })
  const bRes = await db.execute({
    sql: "SELECT routine_id FROM routine_bonus_log WHERE granted_at LIKE ?",
    args: [`${today}%`],
  })

  const itemsByRoutine = new Map<number, RoutineItemRow[]>()
  for (const r of iRes.rows) {
    const item = {
      id: r.id as number,
      routine_id: r.routine_id as number,
      name: r.name as string,
      fixed_exp: r.fixed_exp as number,
      sort_order: r.sort_order as number,
      time_limit_minutes: (r.time_limit_minutes as number | null) ?? null,
    }
    const arr = itemsByRoutine.get(item.routine_id) ?? []
    arr.push(item)
    itemsByRoutine.set(item.routine_id, arr)
  }

  const routines: RoutineRow[] = rRes.rows.map((r) => ({
    id: r.id as number,
    name: r.name as string,
    sort_order: r.sort_order as number,
    items: itemsByRoutine.get(r.id as number) ?? [],
  }))

  return {
    routines,
    checkedItemIds: lRes.rows.map((r) => r.item_id as number),
    bonusRoutineIds: bRes.rows.map((r) => r.routine_id as number),
  }
}

export async function addRoutine(name: string): Promise<number> {
  const db = getClient()
  const res = await db.execute({
    sql: "INSERT INTO routine (name, is_active, sort_order, created_at) VALUES (?,1,0,?)",
    args: [name, now()],
  })
  return Number(res.lastInsertRowid)
}

export async function addRoutineItem(routineId: number, name: string, fixedExp: number, timeLimitMinutes?: number | null) {
  const db = getClient()
  await db.execute({
    sql: "INSERT INTO routine_item (routine_id, name, fixed_exp, sort_order, is_active, time_limit_minutes) VALUES (?,?,?,0,1,?)",
    args: [routineId, name, fixedExp, timeLimitMinutes ?? null],
  })
}

export async function deleteRoutine(id: number) {
  const db = getClient()
  await db.execute({ sql: "UPDATE routine SET is_active=0 WHERE id=?", args: [id] })
  await db.execute({ sql: "UPDATE routine_item SET is_active=0 WHERE routine_id=?", args: [id] })
}

export async function deleteRoutineItem(id: number) {
  const db = getClient()
  await db.execute({ sql: "UPDATE routine_item SET is_active=0 WHERE id=?", args: [id] })
}

export async function reorderRoutineItems(orderedItemIds: number[]) {
  const db = getClient()
  for (let i = 0; i < orderedItemIds.length; i++) {
    await db.execute({
      sql: "UPDATE routine_item SET sort_order=? WHERE id=?",
      args: [i, orderedItemIds[i]],
    })
  }
}

export async function checkRoutineItem(itemId: number, startedAt?: string): Promise<RoutineCheckResult | null> {
  const db = getClient()
  const today = todayKST()

  const itemRes = await db.execute({
    sql: "SELECT id, routine_id, name, fixed_exp, time_limit_minutes FROM routine_item WHERE id=? AND is_active=1",
    args: [itemId],
  })
  const item = itemRes.rows[0]
  if (!item) return null

  const dupRes = await db.execute({
    sql: "SELECT COUNT(*) AS cnt FROM routine_log WHERE item_id=? AND checked_at LIKE ?",
    args: [itemId, `${today}%`],
  })
  if ((dupRes.rows[0].cnt as number) > 0) return null

  const timeLimitMinutes = item.time_limit_minutes as number | null
  let exp = item.fixed_exp as number
  let timeBonus = false
  if (timeLimitMinutes && startedAt) {
    const elapsedMs = Date.now() - new Date(startedAt).getTime()
    if (elapsedMs >= 0 && elapsedMs <= timeLimitMinutes * 60 * 1000) {
      exp = exp * 2
      timeBonus = true
    }
  }

  const routineId = item.routine_id as number
  await db.execute({
    sql: "INSERT INTO routine_log (item_id, exp_gained, checked_at) VALUES (?,?,?)",
    args: [itemId, exp, now()],
  })

  const allItems = await db.execute({
    sql: "SELECT id, fixed_exp FROM routine_item WHERE routine_id=? AND is_active=1",
    args: [routineId],
  })
  const checkedToday = await db.execute({
    sql: `SELECT DISTINCT item_id FROM routine_log
          WHERE checked_at LIKE ? AND item_id IN (
            SELECT id FROM routine_item WHERE routine_id=? AND is_active=1
          )`,
    args: [`${today}%`, routineId],
  })

  const total = allItems.rows.length
  const checked = checkedToday.rows.length
  const allDone = total > 0 && checked >= total

  let bonusExp = 0
  if (allDone) {
    const bonusDup = await db.execute({
      sql: "SELECT COUNT(*) AS cnt FROM routine_bonus_log WHERE routine_id=? AND granted_at LIKE ?",
      args: [routineId, `${today}%`],
    })
    if ((bonusDup.rows[0].cnt as number) === 0) {
      bonusExp = allItems.rows.reduce((sum, r) => sum + (r.fixed_exp as number), 0)
      await db.execute({
        sql: "INSERT INTO routine_bonus_log (routine_id, bonus_exp, granted_at) VALUES (?,?,?)",
        args: [routineId, bonusExp, now()],
      })
    }
  }

  const rRes = await db.execute({
    sql: "SELECT name FROM routine WHERE id=?",
    args: [routineId],
  })
  const routineName = (rRes.rows[0]?.name as string) ?? ""

  return { exp, bonusExp, allDone, routineName, timeBonus }
}
