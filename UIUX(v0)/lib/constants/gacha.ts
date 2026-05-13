/**
 * @module lib/constants/gacha
 * @purpose 가챠 등급/스탯 롤링 비율
 * @add-here:
 *   - 새 옵션 카테고리(예: 신화 슬롯)의 ratio 배열
 * @do-not:
 *   - 값 변경 (Phase 1 = 위치 이동만)
 */

/**
 * 서브 능력치 (BaseStat: STR/VIT/DEX/INT/LUK)의 등장 순서별 비율.
 * 첫 번째 슬롯이 두 번째 슬롯보다 강하다.
 * 출처: app/api/inventory/route.ts:181
 */
export const SUB_RATIOS = [0.5, 0.4] as const

/**
 * 전투 능력치 (Combat) 의 등장 순서별 비율.
 * 출처: app/api/inventory/route.ts:195
 */
export const COMBAT_RATIOS = [1.0, 0.8] as const

/** 비율 배열에서 인덱스 초과 시 사용되는 폴백. 출처: route.ts:189, :203 (subRatios[j] ?? 0.4 / combatRatios[j] ?? 0.8) */
export const SUB_RATIO_FALLBACK = 0.4
export const COMBAT_RATIO_FALLBACK = 0.8

/** Pt 단위 스탯의 하한 배수. 출처: app/api/inventory/route.ts:80 */
export const STAT_MIN_RATIO = 0.3

/** Pt 단위 스탯의 상한 배수. 출처: app/api/inventory/route.ts:81 */
export const STAT_MAX_RATIO = 0.5

/** 캐릭터 레벨 1당 메인 능력치 가산 비율. 출처: app/api/inventory/route.ts:171 (1 + (level - 1) * 0.02) */
export const LEVEL_BONUS_PER_LEVEL = 0.02

/** 1회 가챠 최대 횟수(POST 요청 한도). 출처: app/api/inventory/route.ts:140 */
export const MAX_GACHA_COUNT = 100

/** 옵션 개수 "0~1" / "1~2" 표기의 확률 분기점 (균등 50%). 출처: route.ts:61-62 */
export const PARSE_COUNT_PROB = 0.5
