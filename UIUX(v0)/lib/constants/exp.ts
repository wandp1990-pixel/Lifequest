/**
 * @module lib/constants/exp
 * @purpose 체크리스트·투두·루틴 EXP 보너스·페널티 수식의 단일 매개변수 출처
 * @add-here:
 *   - 새 보너스/페널티 구간(예: 200일 연속): STREAK_THRESHOLDS/RATIOS 동시 확장
 *   - 새 페널티 룰: 별도 상수로 추가 후 lib/game/exp-bonus.ts 에서 import
 * @do-not:
 *   - 값 변경 (Phase 1 = 위치 이동만, 값 보존)
 *   - DB cfg 와 중복되는 값을 여기에 박지 않는다 (cfg 읽기는 그대로 둠)
 */

/**
 * 연속 일수 보너스 임계값. 이 일수 이상이면 STREAK_BONUS_RATIOS의 같은 인덱스 보너스가 적용된다.
 * 출처: lib/db/queries/checklist.ts:85-93 streakBonusExp()
 */
export const STREAK_THRESHOLDS = [7, 14, 30, 60, 100] as const

/**
 * STREAK_THRESHOLDS 와 1:1 대응되는 보너스 비율(baseExp 대비).
 * 예: streak 7일 → +10%, 100일 → +100%.
 */
export const STREAK_BONUS_RATIOS = [0.1, 0.25, 0.5, 0.75, 1.0] as const

/** 빠진 하루당 페널티 비율 (baseExp 기준). 출처: queries/checklist.ts:75 */
export const MISS_PENALTY_PER_DAY = 0.1

/** 누락 페널티 최대 캡. 출처: queries/checklist.ts:75 */
export const MISS_PENALTY_CAP = 0.5

/** due_time 안에 완료했을 때 보너스 비율. 출처: app/api/todos/route.ts:61 */
export const DUE_BONUS_RATIO = 0.5

/** due_time 초과 시 EXP 비율 (절반만 지급). 출처: app/api/todos/route.ts:65 */
export const DUE_PENALTY_RATIO = 0.5

/** 루틴 마감 안에 완료한 경우 보너스 배수. 출처: queries/routine.ts:216 (baseBonus * 2) */
export const ROUTINE_DEADLINE_BONUS_MULT = 2

/** streak 최대치(상한). 출처: queries/checklist.ts:116 (Math.min(..., 100)) */
export const STREAK_MAX = 100

/** 항목 fixed_exp 기본 폴백값. 출처: route.ts 여러 곳 (?? 10) */
export const DEFAULT_ITEM_EXP = 10
