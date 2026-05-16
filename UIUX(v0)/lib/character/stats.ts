import type { Character } from "@/lib/db"
import {
  applyItemPassives,
  buildPlayerCombatStats,
  type SkillData,
  type CombatStats,
} from "@/lib/battle"

// effective 전투 스탯 계산을 단일 helper 로 통일.
// 각 라우트가 동일 패턴을 반복하던 중 character GET/PUT/gainExp 가 boostedSkills
// (`applyItemPassives` 거친 것) 를 사용하지 않아 장비 옵션의 `[스킬명]` 패시브가
// effective max/UI 표시에서 누락되던 버그 해결.
//
// equipment 는 `getEquipment()` 또는 tx.execute 결과 등 다양한 source 에서 들어와
// 타입이 일관되지 않아 unknown 으로 받은 뒤 호출자가 신뢰하는 shape 으로 cast 한다.
export function computeEffectiveStats(
  char: Character,
  equipment: unknown[],
  allSkills: SkillData[],
  battleCfg: Record<string, string>,
): { equippedOptions: string[]; boostedSkills: SkillData[]; combatStats: CombatStats } {
  const equippedOptions = (equipment as { is_equipped: number; options: string }[])
    .filter((e) => e.is_equipped === 1)
    .map((e) => e.options)
  const boostedSkills = applyItemPassives(allSkills, equippedOptions)
  const combatStats = buildPlayerCombatStats(char, equippedOptions, battleCfg, boostedSkills)
  return { equippedOptions, boostedSkills, combatStats }
}
