import type { Character } from "./db"

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
  exp_reward: number
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
  gameCfg: Record<string, string>
): Monster {
  const GRADE_KEYS = ["C", "B", "A", "S", "SR", "SSR", "UR"]
  type GradeEntry = { grade: string; prob: number; coeff: number; tickets: number; exp: number }
  const gradePool: GradeEntry[] = GRADE_KEYS.map((g) => ({
    grade: g,
    prob:    parseFloat(gameCfg[`monster_grade_${g}_prob`]    ?? "0"),
    coeff:   parseFloat(gameCfg[`monster_grade_${g}_mult`]    ?? "1"),
    tickets: parseInt(gameCfg[`monster_grade_${g}_tickets`]   ?? "1"),
    exp:     parseInt(gameCfg[`monster_grade_${g}_exp`]       ?? "50"),
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
    exp_reward:    picked.exp,
    color:         meta.color,
    total_coeff:   totalCoeff,
  }
}

// ─── Player combat stats (equipment bonus parsing) ────────────────────────────

export function buildPlayerCombatStats(
  char: Character,
  equippedOptions: string[],
  battleCfg: Record<string, string>
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
    }
  }

  const strTotal = char.str + eStr
  const intTotal = char.int_stat + eInt
  const vitTotal = char.vit + eVit

  return {
    patk: strTotal * strToPatk + ePatk,
    matk: intTotal * intToMatk + eMatk,
    pdef: ePdef,
    mdef: eMdef,
    dex:  char.dex + eDex,
    luk:  char.luk + eLuk,
    int:  intTotal,
    max_hp: char.base_hp + vitTotal * vitToHp + eHp,
    max_mp: char.base_mp + intTotal * intToMp + eMp,
    bonus_crit_rate:      bonusCritRate,
    bonus_crit_dmg:       bonusCritDmg,
    double_attack_chance: doubleAtkChance,
    life_steal_ratio:     lifeStealRatio,
    defense_ignore_ratio: defIgnoreRatio,
    reflect_ratio:        reflectRatio,
  }
}

// ─── Battle engine ────────────────────────────────────────────────────────────

function calcDmg(atk: number, def_: number, ignoreRatio: number): number {
  const effDef = Math.max(0, def_ * (1 - ignoreRatio))
  const denom  = atk + effDef
  return denom > 0 ? (atk * atk) / denom : 0
}

type Combatant = {
  patk: number; matk: number; pdef: number; mdef: number
  dex: number; luk: number; int: number; max_hp: number
  bonus_crit_rate: number; bonus_crit_dmg: number
  double_attack_chance: number; life_steal_ratio: number
  defense_ignore_ratio: number; reflect_ratio: number
}

const SKILL_MP_COST = 10
const SKILL_DAMAGE_BONUS = 1.4

function attack(cfg: Record<string, string>, atk: Combatant, def: Combatant, kind: "normal" | "skill") {
  const baseAcc    = parseFloat(cfg.base_accuracy    ?? "0.9")
  const accPerDex  = parseFloat(cfg.accuracy_per_dex ?? "0.005")
  const evPerDex   = parseFloat(cfg.evasion_per_dex  ?? "0.003")
  const hitRate    = clamp(baseAcc + (atk.dex - def.dex) * accPerDex, 0.05, 0.99)
  const evRate     = clamp((def.dex - atk.dex) * evPerDex, 0, 0.9)

  if (Math.random() > hitRate) return { hit: false as const, reason: "accuracy_fail" as const, total_damage: 0, critical: false, double_attack: false, life_steal: 0 }
  if (Math.random() < evRate)  return { hit: false as const, reason: "evaded"        as const, total_damage: 0, critical: false, double_attack: false, life_steal: 0 }

  // 방어무시: 장비 패시브 + 전역 설정 합산
  const ignoreRatio = atk.defense_ignore_ratio + parseFloat(cfg.defense_ignore_ratio ?? "0.0")
  const dmgMin      = parseFloat(cfg.damage_random_min ?? "0.9")
  const dmgMax      = parseFloat(cfg.damage_random_max ?? "1.1")
  const dmgRand     = dmgMin + Math.random() * (dmgMax - dmgMin)

  let base: number
  if (kind === "skill") {
    base = calcDmg(atk.matk, def.mdef, ignoreRatio) * dmgRand * SKILL_DAMAGE_BONUS
  } else {
    base = calcDmg(atk.patk, def.pdef, ignoreRatio) * dmgRand
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

  // 더블어택: 장비 패시브 + 전역 설정 합산
  const doubleChance = atk.double_attack_chance + parseFloat(cfg.double_attack_chance ?? "0.0")
  const isDouble     = Math.random() < doubleChance
  const total        = base * (isDouble ? 2 : 1)

  // 생명흡수: 장비 패시브 + 전역 설정 합산
  const lifeStealRate = atk.life_steal_ratio + parseFloat(cfg.life_steal_ratio ?? "0.0")

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
  }
  const plyCombat: Combatant = playerCombat

  let playerHp  = playerCombat.max_hp
  let playerMp  = playerCombat.max_mp
  let monsterHp = monster.stats.HP

  const first: "플레이어" | "몬스터" =
    playerCombat.dex > monCombat.dex ? "플레이어"
    : monCombat.dex > playerCombat.dex ? "몬스터"
    : Math.random() < 0.5 ? "플레이어" : "몬스터"

  const logs: TurnLog[] = []
  let winner: "플레이어" | "몬스터" | "시간초과" | null = null

  for (let turn = 1; turn <= maxTurns; turn++) {
    const attLabel: "플레이어" | "몬스터" =
      (turn % 2 === 1) === (first === "플레이어") ? "플레이어" : "몬스터"
    const atk = attLabel === "플레이어" ? plyCombat : monCombat
    const def = attLabel === "플레이어" ? monCombat : plyCombat

    let kind: "normal" | "skill" = "normal"
    let mpCost = 0
    if (attLabel === "플레이어") {
      const canSkill = atk.matk > 0 && playerMp >= SKILL_MP_COST
      if (canSkill && Math.random() < 0.5) {
        kind = "skill"; mpCost = SKILL_MP_COST
      }
    } else {
      if (atk.matk > 0 && Math.random() < 0.4) kind = "skill"
    }

    const res = attack(battleCfg, atk, def, kind)
    const dmg = res.total_damage

    if (attLabel === "플레이어") {
      monsterHp = Math.max(0, monsterHp - dmg)
      playerHp  = Math.min(playerHp + res.life_steal, playerCombat.max_hp)
      playerMp  = Math.max(0, playerMp - mpCost)
    } else {
      playerHp  = Math.max(0, playerHp - dmg)
      monsterHp = Math.min(monsterHp + res.life_steal, monCombat.max_hp)
      // 반사 패시브: 플레이어가 받은 피해의 일부를 몬스터에게 반사
      if (plyCombat.reflect_ratio > 0 && dmg > 0) {
        monsterHp = Math.max(0, monsterHp - Math.round(dmg * plyCombat.reflect_ratio))
      }
    }

    let result: TurnLog["result"]
    if (!res.hit) { result = res.reason }
    else if (res.critical && res.double_attack) { result = "crit_double" }
    else if (res.critical)  { result = "crit" }
    else if (res.double_attack) { result = "double" }
    else { result = "hit" }

    logs.push({ turn, attacker: attLabel, attack_type: kind, result, damage: dmg, crit: res.critical, double: res.double_attack, life_steal: res.life_steal, mp_cost: mpCost, player_hp: playerHp, player_mp: playerMp, monster_hp: monsterHp })

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
    player_max_hp: Math.round(playerCombat.max_hp),
    player_max_mp: Math.round(playerCombat.max_mp),
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
