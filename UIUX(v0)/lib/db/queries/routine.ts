import { getClient, now, todayKST } from "../client"

export interface RoutineItemRow {
  id: number
  routine_id: number
  name: string
  fixed_exp: number
  sort_order: number
}

export interface RoutineRow {
  id: number
  name: string
  sort_order: number
  deadline_time: string | null
  chapter_id: number | null
  items: RoutineItemRow[]
}

export interface RoutineCheckResult {
  exp: number
  bonusExp: number
  allDone: boolean
  routineName: string
  deadlineBonus: boolean
}

function currentTimeKST(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const h = kst.getUTCHours().toString().padStart(2, "0")
  const m = kst.getUTCMinutes().toString().padStart(2, "0")
  return `${h}:${m}`
}

export async function getRoutines(): Promise<{
  routines: RoutineRow[]
  checkedItemIds: number[]
  bonusRoutineIds: number[]
}> {
  const db = getClient()
  const today = todayKST()

  const rRes = await db.execute(
    "SELECT id, name, sort_order, deadline_time, chapter_id FROM routine WHERE is_active = 1 ORDER BY sort_order, id"
  )
  const iRes = await db.execute(
    "SELECT id, routine_id, name, fixed_exp, sort_order FROM routine_item WHERE is_active = 1 ORDER BY sort_order, id"
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
    }
    const arr = itemsByRoutine.get(item.routine_id) ?? []
    arr.push(item)
    itemsByRoutine.set(item.routine_id, arr)
  }

  const routines: RoutineRow[] = rRes.rows.map((r) => ({
    id: r.id as number,
    name: r.name as string,
    sort_order: r.sort_order as number,
    deadline_time: (r.deadline_time as string | null) ?? null,
    chapter_id: (r.chapter_id as number | null) ?? null,
    items: itemsByRoutine.get(r.id as number) ?? [],
  }))

  return {
    routines,
    checkedItemIds: lRes.rows.map((r) => r.item_id as number),
    bonusRoutineIds: bRes.rows.map((r) => r.routine_id as number),
  }
}

export async function addRoutine(name: string, chapterId?: number | null): Promise<number> {
  const db = getClient()
  const res = await db.execute({
    sql: "INSERT INTO routine (name, is_active, sort_order, chapter_id, created_at) VALUES (?,1,0,?,?)",
    args: [name, chapterId ?? null, now()],
  })
  return Number(res.lastInsertRowid)
}

export async function updateRoutineChapter(routineId: number, chapterId: number | null) {
  const db = getClient()
  await db.execute({
    sql: "UPDATE routine SET chapter_id=? WHERE id=?",
    args: [chapterId, routineId],
  })
}

export async function updateRoutineDeadline(routineId: number, deadlineTime: string | null) {
  const db = getClient()
  await db.execute({
    sql: "UPDATE routine SET deadline_time=? WHERE id=?",
    args: [deadlineTime, routineId],
  })
}

export async function updateRoutineName(routineId: number, name: string) {
  const db = getClient()
  await db.execute({ sql: "UPDATE routine SET name=? WHERE id=?", args: [name, routineId] })
}

export async function updateRoutineItemName(itemId: number, name: string, fixedExp?: number) {
  const db = getClient()
  if (fixedExp !== undefined) {
    await db.execute({ sql: "UPDATE routine_item SET name=?, fixed_exp=? WHERE id=?", args: [name, fixedExp, itemId] })
  } else {
    await db.execute({ sql: "UPDATE routine_item SET name=? WHERE id=?", args: [name, itemId] })
  }
}

export async function addRoutineItem(routineId: number, name: string, fixedExp: number) {
  const db = getClient()
  await db.execute({
    sql: "INSERT INTO routine_item (routine_id, name, fixed_exp, sort_order, is_active) VALUES (?,?,?,0,1)",
    args: [routineId, name, fixedExp],
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

// 자정 넘김 마감 처리: deadline이 새벽(< 06:00)이고 현재가 저녁 이후(>= 18:00)면
// "내일 새벽까지" 의미로 해석해 통과시킨다. 그 외에는 currentTime <= deadline.
function isWithinRoutineDeadline(currentTime: string, deadlineTime: string): boolean {
  if (currentTime <= deadlineTime) return true
  if (deadlineTime < "06:00" && currentTime >= "18:00") return true
  return false
}

export async function checkRoutineItem(itemId: number): Promise<RoutineCheckResult | null> {
  const db = getClient()
  const today = todayKST()

  const itemRes = await db.execute({
    sql: "SELECT id, routine_id, fixed_exp FROM routine_item WHERE id=? AND is_active=1",
    args: [itemId],
  })
  const item = itemRes.rows[0]
  if (!item) return null

  const exp = item.fixed_exp as number
  const routineId = item.routine_id as number

  // race 방어: 오늘 자리 atomic 선점. 이미 체크돼있으면 null.
  const claimRes = await db.execute({
    sql: "INSERT OR IGNORE INTO routine_log (item_id, exp_gained, checked_at) VALUES (?,?,?)",
    args: [itemId, exp, now()],
  })
  if (claimRes.rowsAffected === 0) return null

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
  let deadlineBonus = false

  if (allDone) {
    // bonus_exp 먼저 계산. 그 후 INSERT OR IGNORE로 race/중복 한 번에 차단.
    // (계산→INSERT 순서가 INSERT→UPDATE 보다 안전: 중간에 죽어도 0 적립이 영구화되지 않음.
    //  UNIQUE 인덱스 idx_routine_bonus_log_routine_date 가 동시 INSERT를 막아준다.)
    const rRes = await db.execute({
      sql: "SELECT deadline_time FROM routine WHERE id=?",
      args: [routineId],
    })
    const deadlineTime = rRes.rows[0]?.deadline_time as string | null
    const baseBonus = allItems.rows.reduce((sum, r) => sum + (r.fixed_exp as number), 0)

    if (deadlineTime && isWithinRoutineDeadline(currentTimeKST(), deadlineTime)) {
      bonusExp = baseBonus * 2
      deadlineBonus = true
    } else {
      bonusExp = baseBonus
    }

    const bonusClaimRes = await db.execute({
      sql: "INSERT OR IGNORE INTO routine_bonus_log (routine_id, bonus_exp, granted_at) VALUES (?,?,?)",
      args: [routineId, bonusExp, now()],
    })
    if (bonusClaimRes.rowsAffected === 0) {
      // 이미 오늘 보너스가 지급됨 (race로 다른 트랜잭션이 선점)
      bonusExp = 0
      deadlineBonus = false
    }
  }

  const rRes = await db.execute({
    sql: "SELECT name FROM routine WHERE id=?",
    args: [routineId],
  })
  const routineName = (rRes.rows[0]?.name as string) ?? ""

  return { exp, bonusExp, allDone, routineName, deadlineBonus }
}
