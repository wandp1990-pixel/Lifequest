import type { Character } from "./db"

// ─── Skill types ──────────────────────────────────────────────────────────────

export type SkillData = {
  id: string
  name: string
  type: string
  effect_code: string
  base_effect_value: number
  effect_coeff: number
  trigger_condition: string
  mp_cost: number
  mp_cost_coeff: number
  invested: number
}

// 패시브 스킬 보너스를 CombatStats에 적용
export function computePassiveBonuses(skills: SkillData[]): {
  patk_pct: number; matk_pct: number; hp_pct: number
  dex_flat: number; luk_flat: number; pdef_pct: number
  mdef_pct: number; crit_rate: number; crit_dmg: number
} {
  const b = { patk_pct: 0, matk_pct: 0, hp_pct: 0, dex_flat: 0, luk_flat: 0, pdef_pct: 0, mdef_pct: 0, crit_rate: 0, crit_dmg: 0 }
  for (const s of skills) {
    if (s.type !== "passive" || s.invested <= 0) continue
    const val = s.base_effect_value + s.effect_coeff * s.invested
    if      (s.effect_code === "PATK_PCT")  b.patk_pct  += val
    else if (s.effect_code === "MATK_PCT")  b.matk_pct  += val
    else if (s.effect_code === "HP_PCT")    b.hp_pct    += val
    else if (s.effect_code === "DEX_FLAT")  b.dex_flat  += val
    else if (s.effect_code === "LUK_FLAT")  b.luk_flat  += val
    else if (s.effect_code === "PDEF_PCT")  b.pdef_pct  += val
    else if (s.effect_code === "MDEF_PCT")  b.mdef_pct  += val
    else if (s.effect_code === "CRIT_RATE") b.crit_rate += val
    else if (s.effect_code === "CRIT_DMG")  b.crit_dmg  += val
  }
  return b
}

// 투자된 액티브 스킬만 추출
export function getActiveSkills(skills: SkillData[]): SkillData[] {
  return skills.filter((s) => s.type === "active" && s.invested > 0)
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type MonsterStats = {
  HP: number
  patk: number
  matk: number
  pdef: number
  mdef: number
  dex: number
  luk: number
}

export type Monster = {
  full_name: string
  grade_code: string
  grade_name: string
  race_name: string
  race_emoji: string
  stats: MonsterStats
  ticket_reward: number
  color: string
  total_coeff: number
}

export type CombatStats = {
  patk: number
  matk: number
  pdef: number
  mdef: number
  dex: number
  luk: number
  int: number
  max_hp: number
  max_mp: number
  bonus_crit_rate: number
  bonus_crit_dmg: number
  double_attack_chance: number
  life_steal_ratio: number
  defense_ignore_ratio: number
  reflect_ratio: number
  bonus_accuracy: number
  bonus_evasion: number
}

export type TurnLog = {
  turn: number
  attacker: "플레이어" | "몬스터"
  attack_type: "normal" | "skill"
  result: "hit" | "crit" | "double" | "crit_double" | "accuracy_fail" | "evaded"
  damage: number
  crit: boolean
  double: boolean
  life_steal: number
  mp_cost: number
  player_hp: number
  player_mp: number
  monster_hp: number
  active_skill: string | null
}

export type BattleResult = {
  monster: Monster
  logs: TurnLog[]
  winner: "플레이어" | "몬스터" | "시간초과"
  turns: number
  ticket_reward: number
  first_strike: "플레이어" | "몬스터"
  player_max_hp: number
  player_max_mp: number
  player_final_hp: number
  player_final_mp: number
  monster_max_hp: number
  player_stats: {
    patk: number; matk: number; pdef: number; mdef: number
    dex: number; luk: number; max_hp: number; max_mp: number
  }
}

// ─── Embedded monster data (from questmaster/data/) ──────────────────────────

const GRADE_META: Record<string, { name: string; emoji: string; color: string }> = {
  C:   { name: "잡몹",     emoji: "⚪", color: "#808080" },
  B:   { name: "정예",     emoji: "🟢", color: "#2E8B57" },
  A:   { name: "희귀",     emoji: "🔵", color: "#1E90FF" },
  S:   { name: "네임드",   emoji: "🔴", color: "#DC143C" },
  SR:  { name: "필드보스", emoji: "🟣", color: "#8A2BE2" },
  SSR: { name: "재앙",     emoji: "🟡", color: "#DAA520" },
  UR:  { name: "종말",     emoji: "✨", color: "#FF8C00" },
}

type StatKey = "HP" | "patk" | "matk" | "pdef" | "mdef" | "dex" | "luk"

const STAT_GROWTH: { key: StatKey; iMin: number; iMax: number; gMin: number; gMax: number }[] = [
  { key: "HP",   iMin: 30, iMax: 60, gMin: 10,  gMax: 20  },
  { key: "patk", iMin: 3,  iMax: 8,  gMin: 1.5, gMax: 3   },
  { key: "matk", iMin: 3,  iMax: 8,  gMin: 1.5, gMax: 3   },
  { key: "pdef", iMin: 2,  iMax: 5,  gMin: 1,   gMax: 2   },
  { key: "mdef", iMin: 2,  iMax: 5,  gMin: 1,   gMax: 2   },
  { key: "dex",  iMin: 2,  iMax: 5,  gMin: 0.8, gMax: 1.5 },
  { key: "luk",  iMin: 1,  iMax: 3,  gMin: 0.3, gMax: 0.8 },
]

type RaceMeta = {
  emoji: string
  specialStat: StatKey | "all" | null
  specialWeight: number
  weakStat: StatKey | null
  weakWeight: number
  spawnRate: number
}

const RACES: Record<string, RaceMeta> = {
  "슬라임": { emoji: "🟢", specialStat: "HP",   specialWeight: 1.5, weakStat: "patk", weakWeight: 0.7, spawnRate: 20 },
  "고블린": { emoji: "👺", specialStat: "patk", specialWeight: 1.5, weakStat: "mdef", weakWeight: 0.7, spawnRate: 20 },
  "골렘":   { emoji: "🪨", specialStat: "pdef", specialWeight: 1.5, weakStat: "dex",  weakWeight: 0.7, spawnRate: 15 },
  "언데드": { emoji: "💀", specialStat: "mdef", specialWeight: 1.5, weakStat: "luk",  weakWeight: 0.7, spawnRate: 15 },
  "위습":   { emoji: "👻", specialStat: "matk", specialWeight: 1.5, weakStat: "pdef", weakWeight: 0.7, spawnRate: 12 },
  "늑대":   { emoji: "🐺", specialStat: "dex",  specialWeight: 1.5, weakStat: "HP",   weakWeight: 0.7, spawnRate: 13 },
  "드래곤": { emoji: "🐉", specialStat: "all",  specialWeight: 1.2, weakStat: null,   weakWeight: 1.0, spawnRate: 5  },
}

const RACE_NAMES: Record<string, string[]> = {
  "슬라임": ["슬라임", "젤리", "점액괴물", "물방울", "젤라틴"],
  "고블린": ["고블린", "오크", "트롤", "코볼트", "오우거"],
  "골렘":   ["골렘", "석상", "가고일", "바위거인", "철거인"],
  "언데드": ["스켈레톤", "리치", "레이스", "구울", "데스나이트"],
  "위습":   ["위습", "팬텀", "셰이드", "스펙터", "밤그림자"],
  "늑대":   ["늑대", "와이번", "표범", "독수리", "그리폰"],
  "드래곤": ["드래곤", "고대룡", "화염룡", "빙룡", "뇌룡"],
}

const GRADE_MODIFIERS: Record<string, string[]> = {
  C:   ["허약한", "졸린", "어린", "겁먹은", "작은"],
  B:   ["사나운", "굶주린", "날카로운", "민첩한", "단련된"],
  A:   ["저주받은", "광폭한", "강인한", "교활한", "맹독의"],
  S:   ["피에 물든", "암흑의", "불꽃의", "폭풍의", "대지의"],
  SR:  ["고대의", "심연의", "망각의", "혼돈의", "파멸의"],
  SSR: ["천벌의", "종말의", "시간을 삼킨", "별을 먹은", "세계를 깨운"],
  UR:  ["신을 죽인", "차원을 찢은", "영겁의", "멸망을 부르는", "만물의"],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, mn: number, mx: number) { return Math.max(mn, Math.min(mx, v)) }
function randInt(mn: number, mx: number) { return Math.floor(Math.random() * (mx - mn + 1)) + mn }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function weightedPick<T>(pool: T[], weight: (t: T) => number): T {
  const total = pool.reduce((s, t) => s + weight(t), 0)
  let r = Math.random() * total
  for (const t of pool) {
    r -= weight(t)
    if (r <= 0) return t
  }
  return pool[pool.length - 1]
}

// ─── Monster generation ───────────────────────────────────────────────────────

export function generateMonster(
  clearCount: number,
  playerLevel: number,
  gameCfg: Record<string, string>,
  maxClearedGrade: string | null = null
): Monster {
  const GRADE_KEYS = ["C", "B", "A", "S", "SR", "SSR", "UR"]
  // 클리어한 최고 등급의 다음 등급까지 해금 (null이면 C만)
  const maxClearedIdx = maxClearedGrade ? GRADE_KEYS.indexOf(maxClearedGrade) : -1
  type GradeEntry = { grade: string; prob: number; coeff: number; tickets: number }
  const gradePool: GradeEntry[] = GRADE_KEYS
    .filter((_, i) => i <= maxClearedIdx + 1)
    .map((g) => ({
      grade: g,
      prob:    parseFloat(gameCfg[`monster_grade_${g}_prob`]    ?? "0"),
      coeff:   parseFloat(gameCfg[`monster_grade_${g}_mult`]    ?? "1"),
      tickets: parseInt(gameCfg[`monster_grade_${g}_tickets`]   ?? "1"),
    }))
  const picked = weightedPick(gradePool, (g) => g.prob)

  type RaceEntry = { name: string } & RaceMeta
  const racePool: RaceEntry[] = Object.entries(RACES).map(([name, meta]) => ({ name, ...meta }))
  const race = weightedPick(racePool, (r) => r.spawnRate)

  const clearScale = parseFloat(gameCfg.monster_clear_scale ?? "0.03")
  const levelScale = parseFloat(gameCfg.monster_level_scale ?? "0.04")
  const clearCoeff = 1 + clearCount * clearScale
  const levelCoeff = 1 + Math.max(0, playerLevel - 1) * levelScale
  const totalCoeff = clearCoeff * levelCoeff

  const stats = { HP: 0, patk: 0, matk: 0, pdef: 0, mdef: 0, dex: 0, luk: 0 } as MonsterStats
  for (const sg of STAT_GROWTH) {
    const rawMin = Math.floor(sg.iMin + clearCount * sg.gMin)
    const rawMax = Math.max(rawMin, Math.floor(sg.iMax + clearCount * sg.gMax))
    let val = randInt(rawMin, rawMax) * picked.coeff

    const sp = race.specialStat
    if (sp === "all") {
      val *= race.specialWeight
    } else if (sp === sg.key) {
      val *= race.specialWeight
    } else if (race.weakStat === sg.key) {
      val *= race.weakWeight
    }

    stats[sg.key] = Math.ceil(val * totalCoeff)
  }

  const modifier = pick(GRADE_MODIFIERS[picked.grade] ?? ["???"])
  const baseName = pick(RACE_NAMES[race.name] ?? [race.name])
  const meta = GRADE_META[picked.grade]

  return {
    full_name:    `${meta.emoji} ${modifier} ${baseName}`,
    grade_code:   picked.grade,
    grade_name:   meta.name,
    race_name:    race.name,
    race_emoji:   race.emoji,
    stats,
    ticket_reward: picked.tickets,
    color:         meta.color,
    total_coeff:   totalCoeff,
  }
}

// ─── Player combat stats (equipment bonus parsing) ────────────────────────────

export function buildPlayerCombatStats(
  char: Character,
  equippedOptions: string[],
  battleCfg: Record<string, string>,
  skills: SkillData[] = []
): CombatStats {
  const strToPatk = parseFloat(battleCfg.str_to_patk   ?? "2.0")
  const intToMatk = parseFloat(battleCfg.int_to_matk   ?? "2.0")
  const vitToHp   = parseFloat(battleCfg.vit_to_max_hp ?? "10.0")
  const intToMp   = parseFloat(battleCfg.int_to_max_mp ?? "5.0")

  let ePatk = 0, eMatk = 0, ePdef = 0, eMdef = 0
  let eDex = 0, eLuk = 0, eHp = 0, eMp = 0
  let eStr = 0, eInt = 0, eVit = 0
  let bonusCritRate = 0, bonusCritDmg = 0
  let doubleAtkChance = 0, lifeStealRatio = 0, defIgnoreRatio = 0, reflectRatio = 0
  let bonusAccuracy = 0, bonusEvasion = 0

  for (const raw of equippedOptions) {
    let lines: string[] = []
    try {
      const parsed = JSON.parse(raw ?? "[]")
      if (Array.isArray(parsed)) lines = parsed as string[]
    } catch {}

    for (const line of lines) {
      if (typeof line !== "string") continue

      // 패시브: "[더블어택]" 형식
      if (line.startsWith("[") && line.endsWith("]")) {
        const name = line.slice(1, -1)
        if (name === "더블어택")  doubleAtkChance = Math.max(doubleAtkChance, 0.5)
        else if (name === "생명흡수") lifeStealRatio  = Math.max(lifeStealRatio,  0.05)
        else if (name === "방어무시") defIgnoreRatio  = Math.max(defIgnoreRatio,  0.1)
        else if (name === "반사")     reflectRatio    = Math.max(reflectRatio,    0.1)
        continue
      }

      // 능력치: "물리 공격력 +10" 또는 "치명타확률 +1.2%" 형식
      const isPct = line.endsWith("%")
      const noUnit = isPct ? line.slice(0, -1) : line
      const plusIdx = noUnit.lastIndexOf(" +")
      if (plusIdx < 0) continue
      const k = noUnit.slice(0, plusIdx).trim()
      const v = parseFloat(noUnit.slice(plusIdx + 2))
      if (isNaN(v)) continue

      if (k === "물리 공격력")                      ePatk += v
      else if (k === "마법 공격력")                 eMatk += v
      else if (k === "방어력" || k === "물리방어력") ePdef += v
      else if (k === "마법방어력")                  eMdef += v
      else if (k === "DEX(민첩)")                   eDex  += v
      else if (k === "LUK(운)")                     eLuk  += v
      else if (k === "STR(힘)")                     eStr  += v
      else if (k === "INT(지능)")                   eInt  += v
      else if (k === "VIT(체력)")                   eVit  += v
      else if (k === "HP증가")                      eHp   += v
      else if (k === "MP증가")                      eMp   += v
      else if (k === "치명타확률")                  bonusCritRate += v / 100
      else if (k === "치명타피해")                  bonusCritDmg  += v
      else if (k === "명중률")                      bonusAccuracy += v / 100
      else if (k === "회피율")                      bonusEvasion  += v / 100
    }
  }

  const strTotal = char.str + eStr
  const intTotal = char.int_stat + eInt
  const vitTotal = char.vit + eVit

  // 패시브 스킬 보너스 적용
  const pb = computePassiveBonuses(skills)

  const basePatk = strTotal * strToPatk + ePatk
  const baseMatk = intTotal * intToMatk + eMatk
  const basePdef = ePdef
  const baseMdef = eMdef
  const baseHp   = char.base_hp + vitTotal * vitToHp + eHp

  return {
    patk:   basePatk * (1 + pb.patk_pct / 100),
    matk:   baseMatk * (1 + pb.matk_pct / 100),
    pdef:   basePdef * (1 + pb.pdef_pct / 100),
    mdef:   baseMdef * (1 + pb.mdef_pct / 100),
    dex:    char.dex + eDex + pb.dex_flat,
    luk:    char.luk + eLuk + pb.luk_flat,
    int:    intTotal,
    max_hp: baseHp * (1 + pb.hp_pct / 100),
    max_mp: char.base_mp + intTotal * intToMp + eMp,
    bonus_crit_rate:      bonusCritRate + pb.crit_rate / 100,
    bonus_crit_dmg:       bonusCritDmg  + pb.crit_dmg,
    double_attack_chance: doubleAtkChance,
    life_steal_ratio:     lifeStealRatio,
    defense_ignore_ratio: defIgnoreRatio,
    reflect_ratio:        reflectRatio,
    bonus_accuracy:       bonusAccuracy,
    bonus_evasion:        bonusEvasion,
  }
}

export function parseEquippedStatBonuses(
  equippedOptions: string[]
): { str: number; vit: number; dex: number; int_stat: number; luk: number } {
  const b = { str: 0, vit: 0, dex: 0, int_stat: 0, luk: 0 }
  for (const raw of equippedOptions) {
    let lines: string[] = []
    try {
      const parsed = JSON.parse(raw ?? "[]")
      if (Array.isArray(parsed)) lines = parsed as string[]
    } catch {}
    for (const line of lines) {
      if (typeof line !== "string" || line.startsWith("[")) continue
      const isPct = line.endsWith("%")
      const noUnit = isPct ? line.slice(0, -1) : line
      const plusIdx = noUnit.lastIndexOf(" +")
      if (plusIdx < 0) continue
      const k = noUnit.slice(0, plusIdx).trim()
      const v = parseFloat(noUnit.slice(plusIdx + 2))
      if (isNaN(v)) continue
      if      (k === "STR(힘)")    b.str      += v
      else if (k === "VIT(체력)")  b.vit      += v
      else if (k === "DEX(민첩)")  b.dex      += v
      else if (k === "INT(지능)")  b.int_stat += v
      else if (k === "LUK(운)")    b.luk      += v
    }
  }
  return {
    str: Math.round(b.str), vit: Math.round(b.vit),
    dex: Math.round(b.dex), int_stat: Math.round(b.int_stat), luk: Math.round(b.luk),
  }
}

// ─── Battle engine ────────────────────────────────────────────────────────────

function calcDmg(atk: number, def_: number, ignoreRatio: number, minRatio: number): number {
  if (atk <= 0) return 0
  const effDef = Math.max(0, def_ * (1 - ignoreRatio))
  const denom  = atk + effDef
  const raw    = denom > 0 ? (atk * atk) / denom : atk
  // 방어 ≫ 공격일 때 최소 데미지 보장 (무한 턴 방지)
  return Math.max(atk * minRatio, raw)
}

type Combatant = {
  patk: number; matk: number; pdef: number; mdef: number
  dex: number; luk: number; int: number; max_hp: number
  bonus_crit_rate: number; bonus_crit_dmg: number
  double_attack_chance: number; life_steal_ratio: number
  defense_ignore_ratio: number; reflect_ratio: number
  bonus_accuracy: number; bonus_evasion: number
}

function attack(cfg: Record<string, string>, atk: Combatant, def: Combatant, kind: "normal" | "skill") {
  const baseAcc    = parseFloat(cfg.base_accuracy    ?? "0.9")
  const accPerDex  = parseFloat(cfg.accuracy_per_dex ?? "0.005")
  const evPerDex   = parseFloat(cfg.evasion_per_dex  ?? "0.003")
  const hitRate    = clamp(baseAcc + (atk.dex - def.dex) * accPerDex + atk.bonus_accuracy, 0.05, 0.99)
  const evRate     = clamp((def.dex - atk.dex) * evPerDex + def.bonus_evasion, 0, 0.9)

  if (Math.random() > hitRate) return { hit: false as const, reason: "accuracy_fail" as const, total_damage: 0, critical: false, double_attack: false, life_steal: 0 }
  if (Math.random() < evRate)  return { hit: false as const, reason: "evaded"        as const, total_damage: 0, critical: false, double_attack: false, life_steal: 0 }

  // 방어무시: 공격자 본인의 장비/스킬 효과만 적용 (몬스터는 0)
  const ignoreRatio = atk.defense_ignore_ratio
  const dmgMin      = parseFloat(cfg.damage_random_min ?? "0.9")
  const dmgMax      = parseFloat(cfg.damage_random_max ?? "1.1")
  const dmgRand     = dmgMin + Math.random() * (dmgMax - dmgMin)
  const minRatio    = parseFloat(cfg.min_damage_ratio_by_defense ?? "0.1")
  const skillMult   = parseFloat(cfg.active_skill_damage_mult    ?? "1.4")

  let base: number
  if (kind === "skill") {
    base = calcDmg(atk.matk, def.mdef, ignoreRatio, minRatio) * dmgRand * skillMult
  } else {
    base = calcDmg(atk.patk, def.pdef, ignoreRatio, minRatio) * dmgRand
  }

  const critPerLuk    = parseFloat(cfg.crit_rate_per_luk              ?? "0.005")
  const critSuppress  = parseFloat(cfg.crit_suppression_per_enemy_luk ?? "0.003")
  const baseCritMult  = parseFloat(cfg.base_crit_multiplier           ?? "1.5")
  const critMultPerInt= parseFloat(cfg.crit_multiplier_per_int        ?? "0.01")

  const critRate = clamp(atk.luk * critPerLuk - def.luk * critSuppress + atk.bonus_crit_rate, 0, 0.75)
  const isCrit   = Math.random() < critRate
  if (isCrit) {
    const mult = baseCritMult + atk.int * critMultPerInt + atk.bonus_crit_dmg / 100
    base *= mult
  }

  // 더블어택: 공격자 본인의 장비/스킬 효과만 적용 (몬스터는 0)
  const doubleChance = atk.double_attack_chance
  const isDouble     = Math.random() < doubleChance
  const doubleMode   = (cfg.total_damage_mode ?? "add").toLowerCase()
  const doubleMult   = !isDouble ? 1 : doubleMode === "multiply" ? 1.5 : 2
  const total        = base * doubleMult

  // 생명흡수: 공격자 본인의 장비/스킬 효과만 적용 (몬스터는 0)
  const lifeStealRate = atk.life_steal_ratio

  return {
    hit: true as const,
    reason: "hit" as const,
    total_damage:   Math.round(total),
    critical:       isCrit,
    double_attack:  isDouble,
    life_steal:     Math.round(total * lifeStealRate),
  }
}

// ─── Main battle simulation ────────────────────────────────────────────────────

export function runBattle(
  playerCombat: CombatStats,
  monster: Monster,
  battleCfg: Record<string, string>,
  activeSkills: SkillData[] = [],
  maxTurns = 30
): BattleResult {
  const monCombat: Combatant = {
    patk: monster.stats.patk, matk: monster.stats.matk,
    pdef: monster.stats.pdef, mdef: monster.stats.mdef,
    dex:  monster.stats.dex,  luk:  monster.stats.luk,
    int:  0, max_hp: monster.stats.HP,
    bonus_crit_rate: 0, bonus_crit_dmg: 0,
    double_attack_chance: 0, life_steal_ratio: 0,
    defense_ignore_ratio: 0, reflect_ratio: 0,
    bonus_accuracy: 0, bonus_evasion: 0,
  }
  const plyCombat: Combatant = playerCombat

  let playerHp  = playerCombat.max_hp
  let playerMp  = playerCombat.max_mp
  let monsterHp = monster.stats.HP

  const skillMpCost = parseFloat(battleCfg.active_skill_mp_cost ?? "10")

  const firstMode = (battleCfg.first_strike_mode ?? "dex").toLowerCase()
  let first: "플레이어" | "몬스터"
  if (firstMode === "player") {
    first = "플레이어"
  } else if (firstMode === "monster") {
    first = "몬스터"
  } else if (firstMode === "random") {
    first = Math.random() < 0.5 ? "플레이어" : "몬스터"
  } else {
    // dex 비교 (기본값)
    first = playerCombat.dex > monCombat.dex ? "플레이어"
          : monCombat.dex > playerCombat.dex ? "몬스터"
          : Math.random() < 0.5 ? "플레이어" : "몬스터"
  }

  // ── 액티브 스킬 상태 추적 ──
  const skillUsed = new Set<string>()  // 1회성 스킬 사용 여부
  let playerTurnCount = 0

  // "전투 시작" / "선공 획득" 스킬 → patk 보정값 미리 계산
  let battleStartPatkBonus = 1.0
  let battleStartMatkBonus = 1.0
  for (const s of activeSkills) {
    if (s.invested <= 0) continue
    const val = s.base_effect_value + s.effect_coeff * s.invested
    if (s.trigger_condition === "전투 시작") {
      if (s.effect_code === "PATK_PCT") battleStartPatkBonus *= 1 + val / 100
      if (s.effect_code === "MATK_PCT") battleStartMatkBonus *= 1 + val / 100
    }
    if (s.trigger_condition === "선공 획득" && first === "플레이어") {
      if (s.effect_code === "PATK_PCT") battleStartPatkBonus *= 1 + val / 100
      if (s.effect_code === "MATK_PCT") battleStartMatkBonus *= 1 + val / 100
    }
  }

  const logs: TurnLog[] = []
  let winner: "플레이어" | "몬스터" | "시간초과" | null = null

  for (let turn = 1; turn <= maxTurns; turn++) {
    const attLabel: "플레이어" | "몬스터" =
      (turn % 2 === 1) === (first === "플레이어") ? "플레이어" : "몬스터"
    const atk = attLabel === "플레이어" ? plyCombat : monCombat
    const def = attLabel === "플레이어" ? monCombat : plyCombat

    let kind: "normal" | "skill" = "normal"
    let mpCost = 0
    let activeSkillName: string | null = null

    if (attLabel === "플레이어") {
      playerTurnCount++

      // "HP 25% 이하" 스킬 처리 (선공격 전 회복)
      const hpRatio = playerHp / playerCombat.max_hp
      if (hpRatio <= 0.25) {
        for (const s of activeSkills) {
          if (s.trigger_condition !== "HP 25% 이하" || s.effect_code !== "HP_HEAL") continue
          if (skillUsed.has(s.id)) continue
          if (s.invested <= 0) continue
          const healPct = s.base_effect_value + s.effect_coeff * s.invested
          const healAmt = Math.round(playerCombat.max_hp * healPct / 100)
          playerHp = Math.min(playerHp + healAmt, playerCombat.max_hp)
          skillUsed.add(s.id)
          logs.push({ turn, attacker: "플레이어", attack_type: "skill", result: "hit",
            damage: 0, crit: false, double: false, life_steal: healAmt, mp_cost: 0,
            player_hp: playerHp, player_mp: playerMp, monster_hp: monsterHp,
            active_skill: s.name })
          break
        }
      }

      // 공격 종류 결정
      const canSkill = atk.matk > 0 && playerMp >= skillMpCost
      if (canSkill && Math.random() < 0.5) {
        kind = "skill"; mpCost = skillMpCost
      }
    } else {
      if (atk.matk > 0 && Math.random() < 0.4) kind = "skill"
    }

    const res = attack(battleCfg, atk, def, kind)
    let dmg = res.total_damage

    // 플레이어 공격 시 액티브 스킬 보정
    if (attLabel === "플레이어" && res.hit) {
      // 전투 시작 / 선공 획득 배율
      if (kind === "skill") dmg = Math.round(dmg * battleStartMatkBonus)
      else                  dmg = Math.round(dmg * battleStartPatkBonus)

      // "매 3턴" 스킬
      for (const s of activeSkills) {
        if (s.trigger_condition !== "매 3턴") continue
        if (s.invested <= 0 || playerTurnCount % 3 !== 0) continue
        const val = s.base_effect_value + s.effect_coeff * s.invested
        if (s.effect_code === "MATK_PCT") {
          dmg = Math.round(dmg * (1 + val / 100))
          activeSkillName = s.name
        }
      }

      // "치명타 시" 스킬
      if (res.critical) {
        for (const s of activeSkills) {
          if (s.trigger_condition !== "치명타 시") continue
          if (s.invested <= 0) continue
          const val = s.base_effect_value + s.effect_coeff * s.invested
          if (s.effect_code === "MATK_PCT") {
            dmg = Math.round(dmg * (1 + val / 100))
            activeSkillName = s.name
          }
        }
      }

      // "명중 시" 추가 타격
      for (const s of activeSkills) {
        if (s.trigger_condition !== "명중 시" || s.effect_code !== "EXTRA_HIT") continue
        if (s.invested <= 0) continue
        const extraChance = (s.base_effect_value + s.effect_coeff * s.invested) / 100
        if (Math.random() < extraChance) {
          const extraRes = attack(battleCfg, atk, def, kind)
          dmg += extraRes.total_damage
          activeSkillName = s.name
        }
        break
      }
    }

    if (attLabel === "플레이어") {
      monsterHp = Math.max(0, monsterHp - dmg)
      playerHp  = Math.min(playerHp + res.life_steal, playerCombat.max_hp)
      playerMp  = Math.max(0, playerMp - mpCost)
    } else {
      playerHp  = Math.max(0, playerHp - dmg)
      monsterHp = Math.min(monsterHp + res.life_steal, monCombat.max_hp)
      if (plyCombat.reflect_ratio > 0 && dmg > 0) {
        monsterHp = Math.max(0, monsterHp - Math.round(dmg * plyCombat.reflect_ratio))
      }

      // "사망 시" 기사회생
      if (playerHp <= 0) {
        for (const s of activeSkills) {
          if (s.trigger_condition !== "사망 시" || s.effect_code !== "SURVIVE") continue
          if (skillUsed.has(s.id) || s.invested <= 0) continue
          playerHp = 1
          skillUsed.add(s.id)
          activeSkillName = s.name
          break
        }
      }
    }

    let result: TurnLog["result"]
    if (!res.hit) { result = res.reason }
    else if (res.critical && res.double_attack) { result = "crit_double" }
    else if (res.critical)   { result = "crit" }
    else if (res.double_attack) { result = "double" }
    else { result = "hit" }

    logs.push({ turn, attacker: attLabel, attack_type: kind, result, damage: dmg,
      crit: res.critical, double: res.double_attack, life_steal: res.life_steal,
      mp_cost: mpCost, player_hp: playerHp, player_mp: playerMp, monster_hp: monsterHp,
      active_skill: activeSkillName })

    if (monsterHp <= 0) { winner = "플레이어"; break }
    if (playerHp  <= 0) { winner = "몬스터";   break }
  }

  return {
    monster,
    logs,
    winner: winner ?? "시간초과",
    turns:  logs.length,
    ticket_reward: winner === "플레이어" ? monster.ticket_reward : 0,
    first_strike:  first,
    player_max_hp:   Math.round(playerCombat.max_hp),
    player_max_mp:   Math.round(playerCombat.max_mp),
    player_final_hp: Math.max(0, Math.round(playerHp)),
    player_final_mp: Math.max(0, Math.round(playerMp)),
    monster_max_hp: monster.stats.HP,
    player_stats: {
      patk:   Math.round(playerCombat.patk),
      matk:   Math.round(playerCombat.matk),
      pdef:   Math.round(playerCombat.pdef),
      mdef:   Math.round(playerCombat.mdef),
      dex:    Math.round(playerCombat.dex),
      luk:    Math.round(playerCombat.luk),
      max_hp: Math.round(playerCombat.max_hp),
      max_mp: Math.round(playerCombat.max_mp),
    },
  }
}
