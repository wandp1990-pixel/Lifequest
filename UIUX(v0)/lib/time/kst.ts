/**
 * @module lib/time/kst
 * @purpose KST 시간 함수의 단일 출처. queries 와 route 가 모두 여기서 import 한다.
 * @add-here:
 *   - 새 시간 헬퍼(예: weekStartKST, hourBucketKST)는 이 파일에 추가
 *   - 시간 관련 매직넘버는 lib/constants/time.ts 에 두고 여기서 import
 * @do-not:
 *   - KST_OFFSET_MS 값을 변경하지 말 것. 모든 query 가 +9h 가정에 의존
 *   - 다른 곳에서 `new Date(Date.now() + 9*60*60*1000)` 패턴을 다시 인라인하지 말 것
 */

import { KST_OFFSET_MS, ROUTINE_DEADLINE_OVERNIGHT_CUTOFF, ROUTINE_OVERNIGHT_START } from "@/lib/constants/time"

/** UTC 기준 Date 객체를 KST 시점으로 보정해서 반환. (UTC + 9h) */
export function kstDate(): Date {
  return new Date(Date.now() + KST_OFFSET_MS)
}

/** 현재 시각을 "YYYY-MM-DD HH:MM:SS" KST 문자열로 반환. DB checked_at/created_at 표준 포맷. */
export function now(): string {
  return kstDate().toISOString().replace("T", " ").slice(0, 19)
}

/** 오늘 날짜를 "YYYY-MM-DD" KST 문자열로 반환. */
export function todayKST(): string {
  return kstDate().toISOString().slice(0, 10)
}

/** 어제 날짜를 "YYYY-MM-DD" KST 문자열로 반환. */
export function yesterdayKST(): string {
  const d = kstDate()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

/** 현재 시각을 "HH:MM" KST 문자열로 반환. 루틴 마감 비교용. */
export function currentTimeKST(): string {
  const d = kstDate()
  const h = d.getUTCHours().toString().padStart(2, "0")
  const m = d.getUTCMinutes().toString().padStart(2, "0")
  return `${h}:${m}`
}

/**
 * 루틴 마감 시각 내인지 판정.
 * - 일반 케이스: currentTime <= deadlineTime
 * - 자정 넘김: deadline 이 새벽(< 06:00) 이고 현재가 저녁(>= 18:00) 이면 "내일 새벽까지" 의미로 해석
 *
 * 출처: lib/db/queries/routine.ts:158-162 isWithinRoutineDeadline()
 */
export function isWithinRoutineDeadline(currentTime: string, deadlineTime: string): boolean {
  if (currentTime <= deadlineTime) return true
  if (deadlineTime < ROUTINE_DEADLINE_OVERNIGHT_CUTOFF && currentTime >= ROUTINE_OVERNIGHT_START) return true
  return false
}
