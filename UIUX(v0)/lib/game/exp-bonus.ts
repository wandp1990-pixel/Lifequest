/**
 * @module lib/game/exp-bonus
 * @purpose 체크리스트·투두·루틴 EXP 보너스·페널티 순수 계산 (DB·IO 없음)
 * @add-here:
 *   - 새 보너스 룰(예: 주말 2배, 연속 그룹 보너스): 이 파일에 함수 추가
 *   - 새 매직넘버: lib/constants/exp.ts 에 상수 추가 후 여기서 import
 *   - route 에서는 이 함수만 호출. EXP 계산을 route 에 인라인 금지
 * @do-not:
 *   - DB 호출 (이 모듈은 순수 함수)
 *   - 비동기 함수 (모두 sync)
 *   - 값 변경: 기존 streakBonusExp/penaltyExpForMissedDays/route 인라인 계산과
 *     같은 입력에는 같은 출력을 반환해야 한다.
 */

import {
  STREAK_THRESHOLDS,
  STREAK_BONUS_RATIOS,
  MISS_PENALTY_PER_DAY,
  MISS_PENALTY_CAP,
  DUE_BONUS_RATIO,
  DUE_PENALTY_RATIO,
  ROUTINE_DEADLINE_BONUS_MULT,
} from "@/lib/constants/exp"
import { isWithinRoutineDeadline } from "@/lib/time/kst"

/**
 * 연속(streak) 일수에 따른 보너스 EXP.
 * 출처: lib/db/queries/checklist.ts streakBonusExp() — 동작 보존.
 *
 * tier: 0 = 보너스 없음, 1..STREAK_THRESHOLDS.length = 적용된 등급(1-based)
 */
export function calcStreakBonus(streak: number, baseExp: number): { bonus: number; tier: number } {
  let pct = 0
  let tier = 0
  for (let i = STREAK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (streak >= STREAK_THRESHOLDS[i]) {
      pct = STREAK_BONUS_RATIOS[i]
      tier = i + 1
      break
    }
  }
  return { bonus: Math.floor(baseExp * pct), tier }
}

/**
 * 누락(missed) 일수에 따른 페널티 EXP.
 * 출처: lib/db/queries/checklist.ts penaltyExpForMissedDays() — 동작 보존.
 *
 * missedDays <= 0 → 0
 * 그 외: floor(baseExp * min(missedDays * MISS_PENALTY_PER_DAY, MISS_PENALTY_CAP))
 */
export function calcMissPenalty(missedDays: number, baseExp: number): number {
  if (missedDays <= 0) return 0
  const pct = Math.min(missedDays * MISS_PENALTY_PER_DAY, MISS_PENALTY_CAP)
  return Math.floor(baseExp * pct)
}

/**
 * 투두 due_time 기반 보너스/페널티.
 * 출처: app/api/todos/route.ts:57-69 — 동작 보존.
 *
 * - dueTime == null: 그대로 baseExp, 보너스/페널티 없음
 * - now <= dueTime: exp = baseExp + floor(baseExp * DUE_BONUS_RATIO), bonus > 0
 * - now > dueTime: exp = floor(baseExp * DUE_PENALTY_RATIO), penalty = true
 *
 * nowStr 과 dueTime 은 같은 포맷("YYYY-MM-DD HH:MM:SS") 이어야 한다.
 */
export function calcDueBonus(
  dueTime: string | null,
  nowStr: string,
  baseExp: number,
): { exp: number; bonus: number; penalty: boolean } {
  if (!dueTime) {
    return { exp: baseExp, bonus: 0, penalty: false }
  }
  if (nowStr <= dueTime) {
    const bonus = Math.floor(baseExp * DUE_BONUS_RATIO)
    return { exp: baseExp + bonus, bonus, penalty: false }
  }
  return { exp: Math.floor(baseExp * DUE_PENALTY_RATIO), bonus: 0, penalty: true }
}

/**
 * 루틴 마감 보너스: 모든 항목 완료(allDone) 시 baseBonus 에 곱해지는 배수.
 * 출처: lib/db/queries/routine.ts:215-220 — 동작 보존.
 *
 * - deadlineTime == null: exp = baseBonus, deadlineBonus = false
 * - currentTime 이 deadline 안: exp = baseBonus * ROUTINE_DEADLINE_BONUS_MULT, deadlineBonus = true
 * - 그 외: exp = baseBonus, deadlineBonus = false
 *
 * 자정 넘김 처리는 isWithinRoutineDeadline 이 담당.
 */
export function calcRoutineDeadlineBonus(
  nowHHMM: string,
  deadlineTime: string | null,
  baseBonus: number,
): { exp: number; deadlineBonus: boolean } {
  if (deadlineTime && isWithinRoutineDeadline(nowHHMM, deadlineTime)) {
    return { exp: baseBonus * ROUTINE_DEADLINE_BONUS_MULT, deadlineBonus: true }
  }
  return { exp: baseBonus, deadlineBonus: false }
}
