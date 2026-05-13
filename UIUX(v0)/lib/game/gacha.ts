/**
 * @module lib/game/gacha
 * @purpose 가챠 등급/슬롯/스탯 롤링의 순수 함수. DB·IO 없음.
 * @add-here:
 *   - 새 등급/슬롯 분기 룰
 *   - 새 옵션 카테고리 (가챠 비율은 lib/constants/gacha.ts 에 상수로)
 *   - route 인라인 가챠 로직을 발견하면 이 모듈로 이동
 * @do-not:
 *   - DB 호출. pools(grades/slots/abilities/passives) 은 호출자가 미리 read 해서 넘김
 *   - SQL 호출. 가챠 결과 INSERT 는 route 가 트랜잭션 안에서 수행
 *   - 값/비율 변경. inventory/route.ts:29-83, 156-223 과 같은 입력에 같은 출력 보장
 */

import {
  SUB_RATIOS,
  COMBAT_RATIOS,
  SUB_RATIO_FALLBACK,
  COMBAT_RATIO_FALLBACK,
  STAT_MIN_RATIO,
  STAT_MAX_RATIO,
  LEVEL_BONUS_PER_LEVEL,
  PARSE_COUNT_PROB,
} from "@/lib/constants/gacha"

export interface GradeRow {
  grade: string; name: string; weight: number
  stat_min: number; stat_max: number
  sub_count: string; combat_count: string; passive_count: string
}
export interface SlotRow { slot: string; name: string; main_ability: string; excluded: string }
export interface AbilityRow { name: string; base_value: number; unit: string; category: string }
export interface PassiveRow { name: string; description: string }

export interface GachaPools {
  grades: GradeRow[]
  slots: SlotRow[]
  abilities: AbilityRow[]
  passives: PassiveRow[]
}

export interface RolledItem {
  slot: string
  name: string
  grade: string
  mainValue: number
  options: string[]
}

/**
 * 가중치 기반 등급 선택. weight 합이 0 이하면 균등 폴백.
 * 출처: app/api/inventory/route.ts:31-40
 */
export function pickGrade(grades: GradeRow[]): GradeRow {
  const total = grades.reduce((s, g) => s + Math.max(0, g.weight), 0)
  if (total <= 0) return grades[Math.floor(Math.random() * grades.length)]
  let r = Math.random() * total
  for (const g of grades) {
    r -= Math.max(0, g.weight)
    if (r <= 0) return g
  }
  return grades[grades.length - 1]
}

/** 슬롯 균등 랜덤. 출처: app/api/inventory/route.ts:43-45 */
export function pickSlot(slots: SlotRow[]): SlotRow {
  return slots[Math.floor(Math.random() * slots.length)]
}

/** min~max 정수 inclusive 랜덤. 출처: app/api/inventory/route.ts:48-51 */
export function randBetween(min: number, max: number): number {
  if (max <= min) return min
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 옵션 개수 문자열("0", "1", "2", "0~1", "1~2") → 정수.
 * "0~1" / "1~2" 는 PARSE_COUNT_PROB 확률로 둘 중 하나.
 * 출처: app/api/inventory/route.ts:56-64
 */
export function parseCount(raw: unknown): number {
  const s = String(raw ?? "0").trim()
  if (s === "" || s === "0") return 0
  if (s === "1") return 1
  if (s === "2") return 2
  if (s === "0~1") return Math.random() < PARSE_COUNT_PROB ? 0 : 1
  if (s === "1~2") return Math.random() < PARSE_COUNT_PROB ? 1 : 2
  return 0
}

/** "이름 +값" 또는 "이름 +값%" 포맷. 출처: app/api/inventory/route.ts:67-70 */
export function formatOpt(name: string, value: number, unit: string): string {
  if (unit === "%") return `${name} +${value.toFixed(1)}%`
  return `${name} +${Math.round(value)}`
}

/**
 * 능력치 값 롤링.
 * - % 단위: base_value * ratio * (1 + random) (즉 ratio ~ 2*ratio)
 * - Pt 단위: [floor(stat_min * STAT_MIN_RATIO * ratio), floor(stat_max * STAT_MAX_RATIO * ratio)] 중 정수 랜덤
 *
 * 출처: app/api/inventory/route.ts:75-83
 */
export function rollAbilityValue(ability: AbilityRow, grade: GradeRow, ratio: number): string {
  if (ability.unit === "%") {
    const value = ability.base_value * ratio * (1 + Math.random())
    return formatOpt(ability.name, value, "%")
  }
  const low = Math.max(0, Math.floor(grade.stat_min * STAT_MIN_RATIO * ratio))
  const high = Math.max(low, Math.floor(grade.stat_max * STAT_MAX_RATIO * ratio))
  return formatOpt(ability.name, randBetween(low, high), "Pt")
}

/**
 * 가챠 N개 결과 결정 (DB read 없이 pools 만으로).
 *
 * 1. 등급(가중치) → 슬롯(균등) 결정
 * 2. 메인 능력치(슬롯 main_ability): stat_min~stat_max 롤 * 레벨 보정(1 + (level-1)*LEVEL_BONUS_PER_LEVEL)
 * 3. 서브 BaseStat: parseCount(grade.sub_count) 개, SUB_RATIOS 적용
 * 4. 전투 Combat: parseCount(grade.combat_count) 개, COMBAT_RATIOS 적용
 * 5. 패시브: parseCount(grade.passive_count) 개 (실제로는 break 로 항상 0 or 1)
 *
 * 출처: app/api/inventory/route.ts:156-223 — 동작 보존.
 */
export function rollGachaItems(count: number, charLevel: number, pools: GachaPools): RolledItem[] {
  const { grades, slots, abilities, passives } = pools
  const rolled: RolledItem[] = []

  for (let i = 0; i < count; i++) {
    const grade = pickGrade(grades)
    const slot = pickSlot(slots)

    const excluded = new Set<string>((() => {
      try { return JSON.parse(slot.excluded) as string[] } catch { return [] }
    })())
    const used = new Set<string>()
    const optionLines: string[] = []

    // 메인 능력치
    const mainAbility = abilities.find(a => a.name === slot.main_ability)
    const rawMainValue = randBetween(grade.stat_min, grade.stat_max)
    const levelMultiplier = 1 + (charLevel - 1) * LEVEL_BONUS_PER_LEVEL
    const mainValue = Math.round(rawMainValue * levelMultiplier)
    if (mainAbility) {
      optionLines.push(formatOpt(mainAbility.name, mainValue, mainAbility.unit || "Pt"))
      used.add(mainAbility.name)
    }

    // 서브 BaseStat
    const subCount = parseCount(grade.sub_count)
    for (let j = 0; j < subCount; j++) {
      const pool = abilities.filter(
        a => a.category === "BaseStat" && !excluded.has(a.name) && !used.has(a.name)
      )
      if (!pool.length) break
      const ability = pool[Math.floor(Math.random() * pool.length)]
      used.add(ability.name)
      optionLines.push(rollAbilityValue(ability, grade, SUB_RATIOS[j] ?? SUB_RATIO_FALLBACK))
    }

    // 전투 Combat
    const combatCount = parseCount(grade.combat_count)
    for (let j = 0; j < combatCount; j++) {
      const pool = abilities.filter(
        a => a.category === "Combat" && !excluded.has(a.name) && !used.has(a.name) && a.name !== slot.main_ability
      )
      if (!pool.length) break
      const ability = pool[Math.floor(Math.random() * pool.length)]
      used.add(ability.name)
      optionLines.push(rollAbilityValue(ability, grade, COMBAT_RATIOS[j] ?? COMBAT_RATIO_FALLBACK))
    }

    // 패시브 (기존 코드는 첫 반복에서 break — 사실상 0 or 1)
    const passiveCount = parseCount(grade.passive_count)
    for (let j = 0; j < passiveCount; j++) {
      if (!passives.length) break
      const passive = passives[Math.floor(Math.random() * passives.length)]
      optionLines.push(`[${passive.name}]`)
      break
    }

    rolled.push({
      slot: slot.slot,
      name: `${grade.name} ${slot.name}`,
      grade: grade.grade,
      mainValue,
      options: optionLines,
    })
  }

  return rolled
}
