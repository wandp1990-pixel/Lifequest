/**
 * @module components/game/battle/types
 * @purpose BattleTab 전투 응답/UI 공유 타입.
 */

export type TurnLog = {
  turn: number
  attacker: "플레이어" | "몬스터"
  attack_type: "normal" | "skill"
  result: string
  damage: number
  crit: boolean
  double: boolean
  life_steal: number
  mp_cost: number
  player_hp: number
  player_mp: number
  monster_hp: number
}

export type Monster = {
  full_name: string
  grade_code: string
  grade_name: string
  race_name: string
  race_emoji: string
  stats: { HP: number; patk: number; matk: number; pdef: number; mdef: number; dex: number; luk: number }
  ticket_reward: number
  color: string
  total_coeff: number
}

export type BattleResultData = {
  monster: Monster
  logs: TurnLog[]
  winner: "플레이어" | "몬스터" | "시간초과"
  turns: number
  ticket_reward: number
  exp_gained: number
  leveled_up: boolean
  first_strike: string
  player_start_hp: number
  player_start_mp: number
  player_max_hp: number
  player_max_mp: number
  monster_max_hp: number
  player_stats: {
    patk: number; matk: number; pdef: number; mdef: number
    dex: number; luk: number; max_hp: number; max_mp: number
  }
  char_after: {
    level: number
    draw_tickets: number
    clear_count: number
  }
}

export type CharData = {
  name?: string
  level: number
  max_hp: number
  max_mp: number
  str: number
  vit: number
  dex: number
  int_stat: number
  luk: number
  draw_tickets: number
  clear_count?: number
  max_cleared_grade?: string | null
  pending_battle_monster?: string | null
  effective?: {
    patk: number; matk: number; pdef: number; mdef: number
    dex: number; luk: number; vit: number; int: number
    max_hp: number; max_mp: number
  }
  item_stat_bonuses?: { str: number; vit: number; dex: number; int_stat: number; luk: number }
}

export type RestoreMode = "full" | "none" | "half"

export const GRADE_KEYS = ["C", "B", "A", "S", "SR", "SSR", "UR"]
export const GRADE_META: Record<string, { name: string; color: string }> = {
  C:   { name: "잡몹",     color: "#808080" },
  B:   { name: "정예",     color: "#2E8B57" },
  A:   { name: "희귀",     color: "#1E90FF" },
  S:   { name: "네임드",   color: "#DC143C" },
  SR:  { name: "필드보스", color: "#8A2BE2" },
  SSR: { name: "재앙",     color: "#DAA520" },
  UR:  { name: "종말",     color: "#FF8C00" },
}
