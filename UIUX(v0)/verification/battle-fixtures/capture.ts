// 배틀 시스템 리팩토링 회귀 검증용 fixture 캡처
//
// 사용:
//   npx -y tsx verification/battle-fixtures/capture.ts > verification/battle-fixtures/baseline.json
// 리팩토링 후:
//   npx -y tsx verification/battle-fixtures/capture.ts > verification/battle-fixtures/after.json
//   diff baseline.json after.json   # empty 면 통과
//
// Math.random 을 mulberry32 PRNG 로 치환하여 deterministic 출력 보장.

import { runBattle, type CombatStats, type Monster, type SkillData } from "../../lib/battle"

// ─── seeded PRNG ─────────────────────────────────────────────────────────────
function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6D2B79F5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── battle config (seed.ts 기본값과 동일 의미) ───────────────────────────────
const BATTLE_CFG: Record<string, string> = {
  base_accuracy: "0.9",
  accuracy_per_dex: "0.005",
  evasion_per_dex: "0.003",
  base_crit_multiplier: "1.5",
  crit_rate_per_luk: "0.005",
  crit_suppression_per_enemy_luk: "0.003",
  str_to_patk: "2.0",
  vit_to_max_hp: "10.0",
  int_to_matk: "2.0",
  int_to_max_mp: "5.0",
  damage_random_min: "0.9",
  damage_random_max: "1.1",
  min_damage_ratio_by_defense: "0.1",
  total_damage_mode: "add",
  first_strike_mode: "dex",
}

function makePlayer(overrides: Partial<CombatStats> = {}): CombatStats {
  return {
    patk: 60, matk: 40, pdef: 20, mdef: 15,
    dex: 30, luk: 20, int: 20,
    max_hp: 300, max_mp: 150,
    bonus_crit_rate: 0, bonus_crit_dmg: 0,
    double_attack_chance: 0, life_steal_ratio: 0,
    defense_ignore_ratio: 0, reflect_ratio: 0,
    bonus_accuracy: 0, bonus_evasion: 0,
    ...overrides,
  }
}

function makeMonster(overrides: Partial<Monster["stats"]> = {}, grade = "C"): Monster {
  return {
    full_name: "⚪ 졸린 슬라임",
    grade_code: grade, grade_name: "잡몹",
    race_name: "슬라임", race_emoji: "🟢",
    stats: { HP: 100, patk: 10, matk: 5, pdef: 5, mdef: 5, dex: 5, luk: 3, ...overrides },
    ticket_reward: 1,
    color: "#808080",
    total_coeff: 1.0,
  }
}

function skill(o: Partial<SkillData> & { id: string; name: string; effect_code: string; trigger_condition: string }): SkillData {
  return {
    type: "active",
    base_effect_value: 0, effect_coeff: 0,
    mp_cost: 0, mp_cost_coeff: 0,
    invested: 1, max_skp: 20,
    ...o,
  }
}

type Scenario = {
  name: string
  seed: number
  player: CombatStats
  monster: Monster
  activeSkills?: SkillData[]
  startHp?: number
  startMp?: number
  maxTurns?: number
}

const SCENARIOS: Scenario[] = [
  { name: "01-normal-hit-vs-slime", seed: 101,
    player: makePlayer(), monster: makeMonster() },

  { name: "02-monster-evades-high-dex", seed: 102,
    player: makePlayer({ dex: 5 }), monster: makeMonster({ dex: 40, HP: 200 }) },

  { name: "03-player-misses-low-dex", seed: 103,
    player: makePlayer({ dex: 5, patk: 30 }), monster: makeMonster({ dex: 50, HP: 200 }) },

  { name: "04-crit-burst-high-luk", seed: 104,
    player: makePlayer({ luk: 100, bonus_crit_rate: 0.3 }), monster: makeMonster({ HP: 200 }) },

  { name: "05-hp25-reversal", seed: 105,
    player: makePlayer({ max_hp: 200, patk: 30 }),
    monster: makeMonster({ HP: 500, patk: 80 }),
    activeSkills: [skill({ id: "ACTIVE_REVERSAL_01", name: "역전의 의지",
      effect_code: "HP_HEAL", trigger_condition: "HP 25% 이하",
      base_effect_value: 50, mp_cost: 10 })],
    startHp: 200 },

  { name: "06-mana-burst-every3", seed: 106,
    player: makePlayer({ matk: 80, max_mp: 300, patk: 20 }),
    monster: makeMonster({ HP: 600, pdef: 30 }),
    activeSkills: [skill({ id: "ACTIVE_MANA_BURST_01", name: "마나 폭발",
      effect_code: "MATK_PCT", trigger_condition: "매 3턴",
      base_effect_value: 60, mp_cost: 25 })],
    maxTurns: 30 },

  { name: "07-survive-on-death", seed: 107,
    player: makePlayer({ max_hp: 100, patk: 5 }),
    monster: makeMonster({ HP: 500, patk: 200 }),
    activeSkills: [skill({ id: "ACTIVE_SURVIVE_01", name: "기사회생",
      effect_code: "SURVIVE", trigger_condition: "사망 시" })] },

  { name: "08-chain-extra-hit", seed: 108,
    player: makePlayer(), monster: makeMonster({ HP: 200 }),
    activeSkills: [skill({ id: "ACTIVE_CHAIN_01", name: "연속공격",
      effect_code: "EXTRA_HIT", trigger_condition: "명중 시",
      base_effect_value: 60, mp_cost: 10 })] },

  { name: "09-first-strike-buff", seed: 109,
    player: makePlayer({ dex: 50 }), monster: makeMonster({ dex: 5, HP: 200 }),
    activeSkills: [skill({ id: "ACTIVE_FIRST_STRIKE_01", name: "선제 강타",
      effect_code: "PATK_PCT", trigger_condition: "선공 획득",
      base_effect_value: 30, mp_cost: 15 })] },

  { name: "10-rage-battle-start", seed: 110,
    player: makePlayer(), monster: makeMonster({ HP: 200 }),
    activeSkills: [skill({ id: "ACTIVE_RAGE_01", name: "분노",
      effect_code: "PATK_PCT", trigger_condition: "전투 시작",
      base_effect_value: 40, mp_cost: 20 })] },

  { name: "11-afterimage-on-evade", seed: 111,
    player: makePlayer({ dex: 60, bonus_evasion: 0.5 }),
    monster: makeMonster({ patk: 30, HP: 200 }),
    activeSkills: [skill({ id: "ACTIVE_AFTERIMAGE_01", name: "잔상",
      effect_code: "EXTRA_HIT", trigger_condition: "회피 시",
      base_effect_value: 80, mp_cost: 8 })] },

  { name: "12-spark-on-crit", seed: 112,
    player: makePlayer({ luk: 80, matk: 60, bonus_crit_rate: 0.3 }),
    monster: makeMonster({ HP: 300 }),
    activeSkills: [skill({ id: "ACTIVE_SPARK_01", name: "지식의 불꽃",
      effect_code: "MATK_PCT", trigger_condition: "치명타 시",
      base_effect_value: 50, mp_cost: 10 })] },

  { name: "13-timeout-tanky", seed: 113,
    player: makePlayer({ patk: 5 }), monster: makeMonster({ HP: 5000, pdef: 500 }),
    maxTurns: 30 },

  { name: "14-start-half-hp", seed: 114,
    player: makePlayer({ max_hp: 400 }), monster: makeMonster({ HP: 200 }),
    startHp: 200, startMp: 50 },

  { name: "15-multi-skill-combo", seed: 115,
    player: makePlayer({ dex: 40, luk: 60, matk: 80 }),
    monster: makeMonster({ HP: 600 }),
    activeSkills: [
      skill({ id: "ACTIVE_RAGE_01", name: "분노",
        effect_code: "PATK_PCT", trigger_condition: "전투 시작",
        base_effect_value: 30, mp_cost: 20 }),
      skill({ id: "ACTIVE_CHAIN_01", name: "연속공격",
        effect_code: "EXTRA_HIT", trigger_condition: "명중 시",
        base_effect_value: 50, mp_cost: 10 }),
      skill({ id: "ACTIVE_MANA_BURST_01", name: "마나 폭발",
        effect_code: "MATK_PCT", trigger_condition: "매 3턴",
        base_effect_value: 50, mp_cost: 20 }),
    ] },

  { name: "16-monster-first-strike", seed: 116,
    player: makePlayer({ dex: 5 }), monster: makeMonster({ dex: 60, patk: 40, HP: 200 }) },
]

function main() {
  const results: Record<string, unknown> = {}
  for (const sc of SCENARIOS) {
    const rng = mulberry32(sc.seed)
    const orig = Math.random
    Math.random = rng
    try {
      results[sc.name] = runBattle(
        sc.player, sc.monster, BATTLE_CFG,
        sc.activeSkills ?? [], sc.maxTurns ?? 30,
        sc.startHp, sc.startMp,
      )
    } finally {
      Math.random = orig
    }
  }
  process.stdout.write(JSON.stringify(results, null, 2) + "\n")
}

main()
