/**
 * @module lib/constants/ai
 * @purpose Gemini 응답 클램핑 범위 및 폴백 EXP 값
 * @add-here:
 *   - 새 AI 판정 유형의 범위
 * @do-not:
 *   - 값 변경 (Phase 1 = 위치 이동만)
 */

/** judgeActivity 응답 EXP 범위 [min, max]. 출처: lib/ai.ts:17, 181 */
export const ACTIVITY_EXP_RANGE: readonly [number, number] = [0, 200]

/** judgeActivity 폴백 기본 EXP. 출처: lib/ai.ts:196, 199, 217, 223 */
export const ACTIVITY_DEFAULT_EXP = 50

/** judgeActivity comment 길이 제한. 출처: lib/ai.ts:182 */
export const ACTIVITY_COMMENT_MAX_LEN = 80

/** judgeProjectExp bonus_exp 범위. 출처: lib/ai.ts:26, 256 */
export const PROJECT_BONUS_RANGE: readonly [number, number] = [50, 500]

/** judgeProjectExp task_exp 범위. 출처: lib/ai.ts:27, 257 */
export const TASK_EXP_RANGE: readonly [number, number] = [10, 100]

/** judgeProjectExp 폴백 기본값. 출처: lib/ai.ts:235, 256-257, 265, 269 */
export const PROJECT_DEFAULT_BONUS_EXP = 100
export const PROJECT_DEFAULT_TASK_EXP = 20

/** Gemini API 재시도 대기 (ms). 출처: lib/ai.ts:67 */
export const AI_RETRY_DELAY_MS = 500

/** Gemini 재시도 최대 횟수. 출처: lib/ai.ts:59 (attempt < 2) */
export const AI_MAX_RETRIES = 2
