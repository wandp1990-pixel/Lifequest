/**
 * @module lib/constants/battle
 * @purpose 전투 계산에서 cfg 미설정 시 사용되는 폴백 매직넘버
 * @add-here:
 *   - 새 전투 매커닉의 폴백값
 * @do-not:
 *   - 값 변경 (Phase 1 = 위치 이동만)
 *   - DB battle_config 의 사용자 설정값과 충돌시키지 말 것 (이 상수는 폴백 전용)
 */

/** 기본 명중률. 출처: lib/battle.ts:445 (cfg.base_accuracy ?? "0.9") */
export const BASE_ACCURACY = 0.9

/** DEX 1당 명중률 증가. 출처: lib/battle.ts:446 */
export const ACCURACY_PER_DEX = 0.005

/** DEX 1당 회피율 증가. 출처: lib/battle.ts:447 */
export const EVASION_PER_DEX = 0.003

/** 명중률 하한 (5%). 출처: lib/battle.ts:449 clamp */
export const ACCURACY_MIN = 0.05

/** 명중률 상한 (99%). 출처: lib/battle.ts:449 clamp */
export const ACCURACY_MAX = 0.99

/** 회피율 상한 (90%). 출처: lib/battle.ts:451 clamp */
export const EVADE_MAX = 0.9

/** 데미지 난수 하한. 출처: lib/battle.ts:459 */
export const DAMAGE_RANDOM_MIN = 0.9

/** 데미지 난수 상한. 출처: lib/battle.ts:460 */
export const DAMAGE_RANDOM_MAX = 1.1

/** 방어력에 의한 최소 데미지 비율. 출처: lib/battle.ts:462 */
export const MIN_DAMAGE_RATIO_BY_DEFENSE = 0.1

/** LUK 1당 치명타 확률. 출처: lib/battle.ts:472 */
export const CRIT_RATE_PER_LUK = 0.005

/** 적 LUK 1당 치명타 억제. 출처: lib/battle.ts:473 */
export const CRIT_SUPPRESSION_PER_ENEMY_LUK = 0.003

/** 치명타 기본 배수. 출처: lib/battle.ts:474 (base_crit_multiplier ?? 1.5) */
export const BASE_CRIT_MULTIPLIER = 1.5

/** 치명타 확률 상한 (75%). 출처: lib/battle.ts:476 */
export const CRIT_RATE_MAX = 0.75

/** 더블어택 발동 확률 (옵션 [더블어택]). 출처: lib/battle.ts:312 */
export const DOUBLE_ATK_CHANCE = 0.25

/** 생명흡수 비율 (옵션 [생명흡수]). 출처: lib/battle.ts:313 */
export const LIFE_STEAL_RATIO = 0.05

/** 방어무시 비율 (옵션 [방어무시]). 출처: lib/battle.ts:314 */
export const DEF_IGNORE_RATIO = 0.1

/** 반사 비율 (옵션 [반사]). 출처: lib/battle.ts:315 */
export const REFLECT_RATIO = 0.05

/** 도전 횟수 1당 몬스터 스탯 배수 증가. 출처: lib/battle.ts:233 */
export const MONSTER_CLEAR_SCALE = 0.03

/** 플레이어 레벨 1당 몬스터 스탯 배수 증가. 출처: lib/battle.ts:234 */
export const MONSTER_LEVEL_SCALE = 0.04

/** 최대 전투 턴 수. 출처: lib/battle.ts:527 */
export const MAX_BATTLE_TURNS = 30

/** HP 25% 이하 트리거 조건의 비율. 출처: lib/battle.ts:640 */
export const HP_LOW_TRIGGER_RATIO = 0.25

/** STR → patk 변환 폴백. 출처: lib/battle.ts:285 */
export const STR_TO_PATK = 2.0

/** INT → matk 변환 폴백. 출처: lib/battle.ts:286 */
export const INT_TO_MATK = 2.0

/** VIT → max_hp 변환 폴백. 출처: lib/battle.ts:287 */
export const VIT_TO_MAX_HP = 10.0

/** INT → max_mp 변환 폴백. 출처: lib/battle.ts:288 */
export const INT_TO_MAX_MP = 5.0
