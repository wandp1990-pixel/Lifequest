// 스킬 트리거 조건 — DB 값 (skill_table.trigger_condition) 의 SoT.
//
// `lib/battle.ts` 의 dispatcher 와 `lib/db/seed.ts` 의 seed row 가
// 같은 문자열을 참조하도록 상수화. 한 글자 오타로 인한 silent fail 방지.
//
// 값은 prod DB 와 일치해야 한다 — 변경 시 마이그레이션 필요.
export const SKILL_TRIGGERS = {
  BATTLE_START:  "전투 시작",
  FIRST_STRIKE:  "선공 획득",
  HP_BELOW_25:   "HP 25% 이하",
  EVERY_3_TURNS: "매 3턴",
  ON_HIT:        "명중 시",
  ON_CRIT:       "치명타 시",
  ON_EVADE:      "회피 시",
  ON_DEATH:      "사망 시",
} as const

export type SkillTrigger = (typeof SKILL_TRIGGERS)[keyof typeof SKILL_TRIGGERS]
