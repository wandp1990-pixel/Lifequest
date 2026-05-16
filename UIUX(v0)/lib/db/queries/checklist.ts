import type { Transaction } from "@libsql/client"
import { getClient } from "../client"
import { now, todayKST, yesterdayKST } from "@/lib/time/kst"
import { calcStreakBonus } from "@/lib/game/exp-bonus"

type Exec = Pick<Transaction, "execute">
const runner = (t?: Exec): Exec => t ?? getClient()

export interface HabitGroup {
  id: number
  name: string
  sort_order: number
  items: Array<{
    id: number
    name: string
    fixed_exp: number
    streak: number
    best_streak: number
    notify_time: string | null
    days_since_last: number | null
    group_id: number
  }>
}

export async function getChecklistItems() {
  const db = getClient()
  const res = await db.execute("SELECT * FROM checklist_item WHERE is_active = 1 ORDER BY id")

  if (res.rows.length === 0) return res.rows

  const today = todayKST()
  const sevenDaysAgo = new Date(new Date(today + "T00:00:00Z").getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10)

  const itemIds = res.rows.map((r) => r.id as number)
  const placeholders = itemIds.map(() => "?").join(",")
  const lastLogRes = await db.execute({
    sql: `SELECT item_id, MAX(checked_at) as last_checked FROM checklist_log WHERE item_id IN (${placeholders}) GROUP BY item_id`,
    args: itemIds,
  })

  const lastCheckMap = new Map<number, string>()
  for (const row of lastLogRes.rows) {
    lastCheckMap.set(row.item_id as number, row.last_checked as string)
  }

  const staleIds: number[] = []

  for (const item of res.rows) {
    const itemId = item.id as number
    const lastCheckedDate = lastCheckMap.get(itemId)

    if (!lastCheckedDate || lastCheckedDate.slice(0, 10) < sevenDaysAgo) {
      staleIds.push(itemId)
      item.streak = 0
    }

    if (lastCheckedDate) {
      const lastDate = lastCheckedDate.slice(0, 10)
      const diffMs = new Date(today + "T00:00:00Z").getTime() - new Date(lastDate + "T00:00:00Z").getTime()
      item.days_since_last = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    } else {
      item.days_since_last = null
    }
  }

  if (staleIds.length > 0) {
    const stalePlaceholders = staleIds.map(() => "?").join(",")
    await db.execute({
      sql: `UPDATE checklist_item SET streak=0 WHERE id IN (${stalePlaceholders})`,
      args: staleIds,
    })
  }

  return res.rows
}

// t 가 주어지면 트랜잭션 안에서 실행 (route 가 보상 시퀀스를 한 묶음으로 묶을 때).
// libsql write transaction 은 직렬이라 SELECT 두 번을 Promise.all 로 못 묶고 await 직렬로 처리.
export async function updateChecklistStreak(itemId: number, t?: Exec): Promise<{ streak: number; bonusExp: number; isReturn: boolean }> {
  const r = runner(t)
  const yesterday = yesterdayKST()

  const yesterdayRes = await r.execute({
    sql: "SELECT 1 FROM checklist_log WHERE item_id=? AND checked_at LIKE ? LIMIT 1",
    args: [itemId, `${yesterday}%`],
  })
  const itemRes = await r.execute({
    sql: "SELECT streak, best_streak, fixed_exp FROM checklist_item WHERE id=?",
    args: [itemId],
  })

  const item = itemRes.rows[0]
  const currentStreak = (item?.streak as number) ?? 0
  const bestStreak = (item?.best_streak as number) ?? 0
  const baseExp = (item?.fixed_exp as number) ?? 10

  const hadYesterday = yesterdayRes.rows.length > 0
  const newStreak = Math.min(hadYesterday ? currentStreak + 1 : 1, 100)
  const newBest = Math.max(bestStreak, newStreak)
  const isReturn = !hadYesterday && currentStreak > 0

  await r.execute({
    sql: "UPDATE checklist_item SET streak=?, best_streak=? WHERE id=?",
    args: [newStreak, newBest, itemId],
  })

  return { streak: newStreak, bonusExp: calcStreakBonus(newStreak, baseExp).bonus, isReturn }
}

// 오늘 자리 선점 (race 방어). 이미 있으면 null 반환.
// 트랜잭션 안에서 호출되면 그룹 보너스 카운트 검사가 같은 시점 스냅샷을 보장 (libsql write tx 직렬 격리).
export async function claimChecklistLog(itemId: number, t?: Exec): Promise<number | null> {
  const res = await runner(t).execute({
    sql: "INSERT OR IGNORE INTO checklist_log (item_id,exp_gained,checked_at) VALUES (?,0,?)",
    args: [itemId, now()],
  })
  if (res.rowsAffected === 0) return null
  return Number(res.lastInsertRowid)
}

export async function setChecklistLogExp(logId: number, exp: number, t?: Exec) {
  await runner(t).execute({
    sql: "UPDATE checklist_log SET exp_gained=? WHERE id=?",
    args: [exp, logId],
  })
}

export async function addChecklistLog(itemId: number, exp: number) {
  const db = getClient()
  await db.execute({
    sql: "INSERT INTO checklist_log (item_id,exp_gained,checked_at) VALUES (?,?,?)",
    args: [itemId, exp, now()],
  })
}

export async function addChecklistItem(name: string, fixedExp: number): Promise<number> {
  const db = getClient()
  const res = await db.execute({
    sql: "INSERT INTO checklist_item (name, fixed_exp, is_active) VALUES (?,?,1)",
    args: [name, fixedExp],
  })
  return Number(res.lastInsertRowid)
}

export async function deleteChecklistItem(id: number) {
  const db = getClient()
  await db.execute({ sql: "UPDATE checklist_item SET is_active=0 WHERE id=?", args: [id] })
}

export async function updateChecklistItemName(id: number, name: string, fixedExp?: number) {
  const db = getClient()
  if (fixedExp !== undefined) {
    await db.execute({ sql: "UPDATE checklist_item SET name=?, fixed_exp=? WHERE id=?", args: [name, fixedExp, id] })
  } else {
    await db.execute({ sql: "UPDATE checklist_item SET name=? WHERE id=?", args: [name, id] })
  }
}

export async function getTodayCheckedItemIds(): Promise<Set<number>> {
  const db = getClient()
  const today = todayKST()
  const res = await db.execute({
    sql: "SELECT item_id FROM checklist_log WHERE checked_at LIKE ?",
    args: [`${today}%`],
  })
  return new Set(res.rows.map((r) => r.item_id as number))
}

export async function getHabitGroups(): Promise<HabitGroup[]> {
  const db = getClient()
  const today = todayKST()

  const groupRes = await db.execute(
    "SELECT id, name, sort_order FROM habit_group WHERE is_active=1 ORDER BY sort_order, id"
  )
  if (groupRes.rows.length === 0) return []

  const groupIds = groupRes.rows.map((r) => r.id as number)
  const placeholders = groupIds.map(() => "?").join(",")

  const itemRes = await db.execute({
    sql: `SELECT * FROM checklist_item WHERE is_active=1 AND group_id IN (${placeholders}) ORDER BY id`,
    args: groupIds,
  })

  const itemIds = itemRes.rows.map((r) => r.id as number)
  let lastCheckMap = new Map<number, string>()
  if (itemIds.length > 0) {
    const ip = itemIds.map(() => "?").join(",")
    const lastLogRes = await db.execute({
      sql: `SELECT item_id, MAX(checked_at) as last_checked FROM checklist_log WHERE item_id IN (${ip}) GROUP BY item_id`,
      args: itemIds,
    })
    for (const row of lastLogRes.rows) {
      lastCheckMap.set(row.item_id as number, row.last_checked as string)
    }
  }

  const sevenDaysAgo = new Date(new Date(today + "T00:00:00Z").getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10)

  const groupMap = new Map<number, HabitGroup>()
  for (const g of groupRes.rows) {
    groupMap.set(g.id as number, { id: g.id as number, name: g.name as string, sort_order: g.sort_order as number, items: [] })
  }

  const staleIds: number[] = []
  for (const item of itemRes.rows) {
    const itemId = item.id as number
    const lastChecked = lastCheckMap.get(itemId)
    let daysSinceLast: number | null = null
    if (lastChecked) {
      const lastDate = lastChecked.slice(0, 10)
      const diffMs = new Date(today + "T00:00:00Z").getTime() - new Date(lastDate + "T00:00:00Z").getTime()
      daysSinceLast = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    }
    const isStale = !lastChecked || lastChecked.slice(0, 10) < sevenDaysAgo
    if (isStale && ((item.streak as number) ?? 0) > 0) staleIds.push(itemId)
    const streak = isStale ? 0 : (item.streak as number) ?? 0
    const group = groupMap.get(item.group_id as number)
    if (group) {
      group.items.push({
        id: itemId,
        name: item.name as string,
        fixed_exp: item.fixed_exp as number,
        streak,
        best_streak: item.best_streak as number ?? 0,
        notify_time: item.notify_time as string | null,
        days_since_last: daysSinceLast,
        group_id: item.group_id as number,
      })
    }
  }

  // getChecklistItems 와 동일하게 stale streak 는 DB 도 0 으로 동기화.
  // 두 함수가 다른 결과를 주지 않도록 일관성 유지.
  if (staleIds.length > 0) {
    const stalePlaceholders = staleIds.map(() => "?").join(",")
    await db.execute({
      sql: `UPDATE checklist_item SET streak=0 WHERE id IN (${stalePlaceholders})`,
      args: staleIds,
    })
  }

  return [...groupMap.values()]
}

export async function getTodayBonusGroupIds(): Promise<Set<number>> {
  const db = getClient()
  const today = todayKST()
  const res = await db.execute({
    sql: "SELECT group_id FROM habit_group_bonus_log WHERE granted_at LIKE ?",
    args: [`${today}%`],
  })
  return new Set(res.rows.map((r) => r.group_id as number))
}

// 트랜잭션 안에서 호출 권장 — 같은 그룹의 다른 항목이 claim 한 직후 시점에서도
// SELECT count 가 그 변경을 봐 "다 끝났는데 보너스 미적립" race 가 해소된다 (libsql 직렬 격리).
export async function claimHabitGroupBonus(groupId: number, t?: Exec): Promise<number | null> {
  const r = runner(t)
  const today = todayKST()

  const allItems = await r.execute({
    sql: "SELECT id, fixed_exp FROM checklist_item WHERE is_active=1 AND group_id=?",
    args: [groupId],
  })
  if (allItems.rows.length === 0) return null

  const ids = allItems.rows.map((row) => row.id as number)
  const ip = ids.map(() => "?").join(",")
  const checkedRes = await r.execute({
    sql: `SELECT COUNT(*) as cnt FROM checklist_log WHERE item_id IN (${ip}) AND checked_at LIKE ?`,
    args: [...ids, `${today}%`],
  })
  const checkedCount = checkedRes.rows[0]?.cnt as number ?? 0
  if (checkedCount < allItems.rows.length) return null

  const bonusExp = allItems.rows.reduce((sum, row) => sum + (row.fixed_exp as number), 0)

  const claimRes = await r.execute({
    sql: "INSERT OR IGNORE INTO habit_group_bonus_log (group_id, bonus_exp, granted_at) VALUES (?,?,?)",
    args: [groupId, bonusExp, now()],
  })
  if (claimRes.rowsAffected === 0) return null

  return bonusExp
}

export async function addHabitGroup(name: string): Promise<number> {
  const db = getClient()
  const orderRes = await db.execute("SELECT COALESCE(MAX(sort_order),0)+1 AS next FROM habit_group")
  const nextOrder = orderRes.rows[0]?.next as number ?? 1
  const res = await db.execute({
    sql: "INSERT INTO habit_group (name, sort_order, is_active, created_at) VALUES (?,?,1,?)",
    args: [name, nextOrder, now()],
  })
  return Number(res.lastInsertRowid)
}

export async function updateHabitGroupName(groupId: number, name: string): Promise<void> {
  const db = getClient()
  await db.execute({ sql: "UPDATE habit_group SET name=? WHERE id=?", args: [name, groupId] })
}

export async function deleteHabitGroup(groupId: number): Promise<void> {
  const db = getClient()
  await db.execute({ sql: "UPDATE checklist_item SET group_id=NULL WHERE group_id=?", args: [groupId] })
  await db.execute({ sql: "UPDATE habit_group SET is_active=0 WHERE id=?", args: [groupId] })
}

export async function setItemGroup(itemId: number, groupId: number | null): Promise<void> {
  const db = getClient()
  await db.execute({ sql: "UPDATE checklist_item SET group_id=? WHERE id=?", args: [groupId, itemId] })
}

export async function reorderHabitGroups(orderedIds: number[]): Promise<void> {
  const db = getClient()
  await Promise.all(
    orderedIds.map((id, i) => db.execute({ sql: "UPDATE habit_group SET sort_order=? WHERE id=?", args: [i, id] }))
  )
}
