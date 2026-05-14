/**
 * @module components/game/character/constants
 * @purpose CharacterTab 내부에서 공유하는 STATS 배열 + 스킬/캐릭터 타입.
 */

import { Sword, Heart, Wind, Brain, Star } from "lucide-react"

export const STATS = [
  { key: "str",      label: "STR",  desc: "힘",  icon: Sword,  color: "text-red-500",    bar: "bg-red-400",    bg: "bg-red-50",    border: "border-red-200" },
  { key: "vit",      label: "VIT",  desc: "체력", icon: Heart,  color: "text-emerald-500", bar: "bg-emerald-400", bg: "bg-emerald-50", border: "border-emerald-200" },
  { key: "dex",      label: "DEX",  desc: "민첩", icon: Wind,   color: "text-sky-500",    bar: "bg-sky-400",    bg: "bg-sky-50",    border: "border-sky-200" },
  { key: "int_stat", label: "INT",  desc: "지능", icon: Brain,  color: "text-violet-500", bar: "bg-violet-400", bg: "bg-violet-50", border: "border-violet-200" },
  { key: "luk",      label: "LUK",  desc: "운",  icon: Star,   color: "text-amber-500",  bar: "bg-amber-400",  bg: "bg-amber-50",  border: "border-amber-200" },
] as const

export type StatKey = typeof STATS[number]["key"]

export type SkillType = "passive" | "active"

export interface Skill {
  id: string
  name: string
  type: SkillType
  unlock_level: number
  base_effect_value: number
  effect_coeff: number
  mp_cost: number
  mp_cost_coeff: number
  trigger_condition: string
  effect_code: string
  description: string
  invested: number
  max_skp: number
}

export interface CharBasics {
  str: number; vit: number; dex: number; int_stat: number; luk: number
  stat_points: number; skill_points: number; level: number
}

export interface EffectiveStats {
  patk: number; matk: number; pdef: number; mdef: number
  dex: number; luk: number; max_hp: number; max_mp: number
  crit_rate: number; crit_dmg: number
  accuracy_bonus: number; evasion_bonus: number
  double_attack: number; life_steal: number; def_ignore: number; reflect: number
}

export interface ItemStatBonuses {
  str: number; vit: number; dex: number; int_stat: number; luk: number
}
