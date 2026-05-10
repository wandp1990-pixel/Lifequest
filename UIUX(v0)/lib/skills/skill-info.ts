// 스킬 도감 — 사용자에게 노출할 풍부한 설명 텍스트 모음.
// DB(skill_table)는 효과 계산용 수치 데이터를 담고, 이 모듈은 컨셉/발동/효과 서술만 담당.
// id 는 skill_table.id 와 1:1 매칭.

export interface SkillInfo {
  concept: string             // 컨셉/세계관 한 줄
  trigger_explanation: string // 언제/어떻게 발동되는지 (패시브는 "상시 적용")
  effect_explanation: string  // 실제 무엇을 하는지 — effect_code 별 정확한 동작
}

export const SKILL_INFO: Record<string, SkillInfo> = {
  // ── 액티브 ────────────────────────────────────────────────────────────────
  ACTIVE_RAGE_01: {
    concept: "전투의 광기를 끌어내는 전사의 본능",
    trigger_explanation: "전투 개시와 동시에 자동 발동",
    effect_explanation: "한 전투 동안 물리 공격력이 % 단위로 증가. 선공 여부와 무관하게 항상 적용되며, 일반 공격에 모두 반영된다.",
  },
  ACTIVE_CHAIN_01: {
    concept: "적의 빈틈을 파고드는 추격 본능",
    trigger_explanation: "일반 공격이 명중한 직후 확률 판정",
    effect_explanation: "발동 시 즉시 한 번 더 공격. 추가 타격도 명중·회피·치명타·생명흡수 판정을 독립적으로 수행한다.",
  },
  ACTIVE_FIRST_STRIKE_01: {
    concept: "기선을 제압하는 칼날의 첫 호흡",
    trigger_explanation: "DEX 기반 선공 판정에서 플레이어가 선공을 잡았을 때만 발동",
    effect_explanation: "전투 시작 시 물리 공격력이 % 단위로 추가 증가. 선공을 못 잡으면 미발동.",
  },
  ACTIVE_AFTERIMAGE_01: {
    concept: "본체를 대신 무는 환영",
    trigger_explanation: "적의 공격을 회피했을 때 즉시 발동",
    effect_explanation: "회피 직후 적에게 추가 반격을 가한다. 적 턴 도중 끼어드는 카운터 형식이며 명중·치명타 판정은 독립적이다.",
  },
  ACTIVE_REVERSAL_01: {
    concept: "쓰러지기 직전 끌어올리는 마지막 의지",
    trigger_explanation: "플레이어 턴 시작 시 HP가 최대치의 25% 이하일 때 발동 (전투당 1회)",
    effect_explanation: "최대 HP의 % 만큼 즉시 회복. MP를 소비하며, 한 전투에서 한 번만 발동된다.",
  },
  ACTIVE_MANA_BURST_01: {
    concept: "응축된 마나를 한순간에 방출하는 폭발",
    trigger_explanation: "플레이어의 3·6·9턴마다 발동 (3턴 주기)",
    effect_explanation: "마법 공격력에 비례한 추가 피해를 적에게 가한다. 일반 공격 피해와 별개로 가산되며 MP가 부족하면 미발동.",
  },
  ACTIVE_SPARK_01: {
    concept: "치명적 일격에 깨어나는 마력의 불꽃",
    trigger_explanation: "일반 공격이 치명타로 적중했을 때 발동",
    effect_explanation: "치명타 직후 마법 공격력 기반 추가 피해를 가한다. 치명타가 안 터지면 발동되지 않는다.",
  },
  ACTIVE_SURVIVE_01: {
    concept: "죽음의 문턱에서 한 번만 허락되는 기적",
    trigger_explanation: "치명상으로 HP가 0이 되는 순간 발동 (전투당 1회)",
    effect_explanation: "죽음을 거부하고 HP 1로 생존한다. MP 비용이 없으며, 한 전투에서 한 번만 발동된다.",
  },

  // ── 패시브 ────────────────────────────────────────────────────────────────
  PASSIVE_PATK_01: {
    concept: "단련된 근육과 흔들리지 않는 기개",
    trigger_explanation: "상시 적용 (패시브)",
    effect_explanation: "기초 물리 공격력에 % 가산. 전투 진입 시점에 일괄 계산되어 모든 일반 공격에 반영된다.",
  },
  PASSIVE_HP_01: {
    concept: "창과 이빨을 튕겨내는 단단한 피부",
    trigger_explanation: "상시 적용 (패시브)",
    effect_explanation: "최대 HP가 % 단위로 영구 증가. 전투 시작 시점의 체력 풀과 회복량 계산에 모두 반영된다.",
  },
  PASSIVE_DEX_01: {
    concept: "바람을 가르는 가벼운 발놀림",
    trigger_explanation: "상시 적용 (패시브)",
    effect_explanation: "DEX 능력치에 고정값 가산. 명중률·회피율·선공 판정이 모두 유리해진다.",
  },
  PASSIVE_MATK_01: {
    concept: "마나의 흐름을 자연스레 다루는 감각",
    trigger_explanation: "상시 적용 (패시브)",
    effect_explanation: "기초 마법 공격력에 % 가산. 마법 기반 액티브 스킬 피해도 함께 강화된다.",
  },
  PASSIVE_LUK_01: {
    concept: "운명이 슬쩍 미소짓는 자",
    trigger_explanation: "상시 적용 (패시브)",
    effect_explanation: "LUK 능력치에 고정값 가산. 치명타 확률·회피·보상 판정에 유리해진다.",
  },
  PASSIVE_PDEF_01: {
    concept: "어떤 일격에도 흔들리지 않는 철벽",
    trigger_explanation: "상시 적용 (패시브)",
    effect_explanation: "물리 방어력이 % 단위로 영구 증가. 받는 물리 피해가 줄어든다.",
  },
  PASSIVE_CRIT_RATE_01: {
    concept: "적의 약점을 꿰뚫어보는 시선",
    trigger_explanation: "상시 적용 (패시브)",
    effect_explanation: "치명타 확률에 % 가산. LUK 기반 기본 치명타율에 더해져 누적 적용된다.",
  },
  PASSIVE_CRIT_DMG_01: {
    concept: "치명적 타격을 더 깊게 새기는 파괴의 법칙",
    trigger_explanation: "상시 적용 (패시브)",
    effect_explanation: "치명타가 터졌을 때의 피해 배율이 추가로 증가. 기본 2배 배수 위에 가산된다.",
  },
  PASSIVE_MDEF_01: {
    concept: "마력의 격류를 흘려보내는 결계",
    trigger_explanation: "상시 적용 (패시브)",
    effect_explanation: "마법 방어력이 % 단위로 영구 증가. 받는 마법 피해가 줄어든다.",
  },
  PASSIVE_CRIT_RATE_02: {
    concept: "신의 총애가 깃든 자에게 따르는 행운",
    trigger_explanation: "상시 적용 (패시브)",
    effect_explanation: "치명타 확률에 추가 % 가산. 다른 치명타 확률 보너스와 누적된다.",
  },
}
