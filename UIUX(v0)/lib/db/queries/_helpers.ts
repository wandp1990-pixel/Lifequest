/**
 * @module lib/db/queries/_helpers
 * @purpose db.execute() boilerplate 추상화. SQL 시맨틱 보존 + 자주 쓰는 race-guard 패턴 통일.
 * @add-here:
 *   - 새 query helper (예: bulkInsert) 추가
 * @do-not:
 *   - SQL 문자열 자체 변경 (이 모듈은 단지 호출 래퍼)
 *   - race-guard 사용 시 반드시 claimOnce(INSERT OR IGNORE) / claimUpdate(conditional UPDATE) 사용
 *     -- 기존 SQL 의 시맨틱(rowsAffected, lastInsertRowid 의미) 그대로 보존
 *   - 트랜잭션이 필요한 곳에서는 tx() 를 사용하고 직접 client.transaction() 호출 금지
 */

import type { ResultSet, InArgs, Transaction } from "@libsql/client"
import { getClient } from "../client"

/** 임의의 SQL 실행. ResultSet 반환. */
export async function exec(sql: string, args?: InArgs): Promise<ResultSet> {
  const db = getClient()
  return args === undefined ? db.execute(sql) : db.execute({ sql, args })
}

/** SELECT 한 row 가져오기. 결과 없으면 null. */
export async function execOne<T = Record<string, unknown>>(
  sql: string,
  args?: InArgs,
): Promise<T | null> {
  const res = await exec(sql, args)
  return (res.rows[0] as T | undefined) ?? null
}

/** SELECT 전체 row 가져오기. */
export async function execMany<T = Record<string, unknown>>(
  sql: string,
  args?: InArgs,
): Promise<T[]> {
  const res = await exec(sql, args)
  return res.rows as unknown as T[]
}

/**
 * INSERT OR IGNORE 패턴.
 * 새로 삽입됐으면 lastInsertRowid 반환. UNIQUE 충돌이면 null.
 *
 * race-guard 용도: "오늘 한 번만" 같은 자리 atomic 선점에 사용.
 * 출처 패턴: claimChecklistLog, checkRoutineItem 의 routine_log INSERT OR IGNORE 등.
 */
export async function claimOnce(sql: string, args: InArgs): Promise<number | null> {
  const res = await exec(sql, args)
  if (res.rowsAffected === 0) return null
  return Number(res.lastInsertRowid)
}

/**
 * conditional UPDATE 패턴.
 * UPDATE 가 실제로 row 를 바꿨으면 true, 아니면 false.
 *
 * race-guard 용도: "WHERE current_state = X" 같은 상태 전환의 atomic 보장.
 * 출처 패턴: 가챠의 draw_tickets 차감 UPDATE 등.
 */
export async function claimUpdate(sql: string, args: InArgs): Promise<boolean> {
  const res = await exec(sql, args)
  return res.rowsAffected > 0
}

/**
 * 쓰기 트랜잭션. fn 안에서 t.execute() 호출.
 * fn 이 throw 하면 자동 rollback, 정상 종료 시 commit.
 */
export async function tx<T>(fn: (t: Transaction) => Promise<T>): Promise<T> {
  const db = getClient()
  const t = await db.transaction("write")
  try {
    const result = await fn(t)
    await t.commit()
    return result
  } catch (e) {
    await t.rollback()
    throw e
  }
}
