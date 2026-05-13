/**
 * @module lib/constants/time
 * @purpose KST 오프셋·루틴 마감 컷오프·UI 타이머 등 시간 관련 매직넘버
 * @add-here:
 *   - 새 컷오프 시각, 디바운스 ms, refresh 인터벌 등
 * @do-not:
 *   - 값 변경. 특히 KST_OFFSET_MS 는 모든 query 가 이 가정에 의존
 */

/** KST = UTC + 9h. 모든 query 가 이 값에 의존. 출처: lib/db/client.ts:16 */
export const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/**
 * 루틴 마감이 새벽(< 06:00) 인 경우, 현재 시각이 18:00 이후면
 * "내일 새벽까지" 마감으로 해석한다.
 * 출처: lib/db/queries/routine.ts:160
 */
export const ROUTINE_DEADLINE_OVERNIGHT_CUTOFF = "06:00"
export const ROUTINE_OVERNIGHT_START = "18:00"

/**
 * 루틴 마감 grace period(분). Phase 2 에서 사용 예정 (현재 코드엔 미적용).
 * 추후 ±30분 허용 룰을 둘 때 사용한다. 미적용 시 효과 없음.
 */
export const ROUTINE_GRACE_MIN = 30

/** streak 가 stale 로 간주되는 일수. 출처: queries/checklist.ts:26 (7 * 24 * 60 * 60 * 1000) */
export const STALE_STREAK_DAYS = 7

/** 토스트 자동 닫힘(ms). 출처: 다수 컴포넌트 setTimeout(...,3000) */
export const TOAST_AUTO_DISMISS_MS = 3000

/** 마감 임박 강조 표시 임계값(일). 출처: components/game/ProjectsTab.tsx:76, TasksTab.tsx 107 */
export const DEADLINE_IMMINENT_DAYS = 3

/** 하루의 ms (자정 타이머 계산용). 출처: TasksTab.tsx:104 */
export const ONE_DAY_MS = 24 * 60 * 60 * 1000
