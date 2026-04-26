"use client"

import { useState, useEffect } from "react"
import { Sword, Heart, Wind, Brain, Star, Lock, ChevronUp, ChevronDown, Zap, Shield, Save, Loader2 } from "lucide-react"

// ─── 스탯 ────────────────────────────────────────────────────────────────────

const STATS = [
  { key: "str",      label: "STR",  desc: "힘",  icon: Sword,  color: "text-red-500",    bar: "bg-red-400",    bg: "bg-red-50",    border: "border-red-200" },
  { key: "vit",      label: "VIT",  desc: "체력", icon: Heart,  color: "text-emerald-500", bar: "bg-emerald-400", bg: "bg-emerald-50", border: "border-emerald-200" },
  { key: "dex",      label: "DEX",  desc: "민첩", icon: Wind,   color: "text-sky-500",    bar: "bg-sky-400",    bg: "bg-sky-50",    border: "border-sky-200" },
  { key: "int_stat", label: "INT",  desc: "지능", icon: Brain,  color: "text-violet-500", bar: "bg-violet-400", bg: "bg-violet-50", border: "border-violet-200" },
  { key: "luk",      label: "LUK",  desc: "운",  icon: Star,   color: "text-amber-500",  bar: "bg-amber-400",  bg: "bg-amber-50",  border: "border-amber-200" },
] as const

type StatKey = typeof STATS[number]["key"]

// ─── 스킬 ────────────────────────────────────────────────────────────────────

type SkillType = "passive" | "active"

interface Skill {
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

const MOCK_SKILLS: Skill[] = [
  { id: "ACTIVE_RAGE_01",         name: "분노",        type: "active",  unlock_level: 3,   base_effect_value: 30, effect_coeff: 6,    mp_cost: 20, mp_cost_coeff: 1,    trigger_condition: "전투 시작",    effect_code: "PATK_PCT",  description: "물리 ATK 증가",  invested: 5, max_skp: 20 },
  { id: "ACTIVE_CHAIN_01",        name: "연속공격",    type: "active",  unlock_level: 5,   base_effect_value: 20, effect_coeff: 2,    mp_cost: 10, mp_cost_coeff: 0.5,  trigger_condition: "명중 시",     effect_code: "EXTRA_HIT", description: "추가 타격 발동", invested: 0, max_skp: 20 },
  { id: "ACTIVE_FIRST_STRIKE_01", name: "선제 강타",   type: "active",  unlock_level: 9,   base_effect_value: 20, effect_coeff: 4,    mp_cost: 15, mp_cost_coeff: 0.75, trigger_condition: "선공 획득",   effect_code: "PATK_PCT",  description: "물리 ATK 증가",  invested: 0, max_skp: 20 },
  { id: "ACTIVE_AFTERIMAGE_01",   name: "잔상",        type: "active",  unlock_level: 14,  base_effect_value: 10, effect_coeff: 2.5,  mp_cost: 8,  mp_cost_coeff: 0.4,  trigger_condition: "회피 시",     effect_code: "EXTRA_HIT", description: "반격 추가 타격", invested: 0, max_skp: 20 },
  { id: "ACTIVE_REVERSAL_01",     name: "역전의 의지", type: "active",  unlock_level: 20,  base_effect_value: 5,  effect_coeff: 1.25, mp_cost: 20, mp_cost_coeff: 1,    trigger_condition: "HP 25% 이하", effect_code: "HP_HEAL",   description: "HP 회복",       invested: 0, max_skp: 20 },
  { id: "ACTIVE_MANA_BURST_01",   name: "마나 폭발",   type: "active",  unlock_level: 25,  base_effect_value: 50, effect_coeff: 7.5,  mp_cost: 25, mp_cost_coeff: 1.25, trigger_condition: "매 3턴",      effect_code: "MATK_PCT",  description: "마법 ATK 증가", invested: 0, max_skp: 20 },
  { id: "ACTIVE_SPARK_01",        name: "지식의 불꽃", type: "active",  unlock_level: 28,  base_effect_value: 10, effect_coeff: 3.5,  mp_cost: 10, mp_cost_coeff: 0.5,  trigger_condition: "치명타 시",   effect_code: "MATK_PCT",  description: "마법 ATK 증가", invested: 0, max_skp: 20 },
  { id: "ACTIVE_SURVIVE_01",      name: "기사회생",    type: "active",  unlock_level: 30,  base_effect_value: 5,  effect_coeff: 2.25, mp_cost: 0,  mp_cost_coeff: 0,    trigger_condition: "사망 시",     effect_code: "SURVIVE",   description: "사망 시 생존",  invested: 0, max_skp: 20 },
  { id: "PASSIVE_PATK_01",        name: "전사의 기백", type: "passive", unlock_level: 10,  base_effect_value: 2,  effect_coeff: 0.5,  mp_cost: 0,  mp_cost_coeff: 0,    trigger_condition: "",            effect_code: "PATK_PCT",  description: "물리 공격력 증가", invested: 3, max_skp: 20 },
  { id: "PASSIVE_HP_01",          name: "강철 피부",   type: "passive", unlock_level: 20,  base_effect_value: 2,  effect_coeff: 0.5,  mp_cost: 0,  mp_cost_coeff: 0,    trigger_condition: "",            effect_code: "HP_PCT",    description: "최대 HP 증가",   invested: 0, max_skp: 20 },
  { id: "PASSIVE_DEX_01",         name: "신속함",      type: "passive", unlock_level: 30,  base_effect_value: 1,  effect_coeff: 0.5,  mp_cost: 0,  mp_cost_coeff: 0,    trigger_condition: "",            effect_code: "DEX_FLAT",  description: "DEX 고정값 증가", invested: 0, max_skp: 20 },
  { id: "PASSIVE_MATK_01",        name: "마법 친화",   type: "passive", unlock_level: 40,  base_effect_value: 2,  effect_coeff: 0.5,  mp_cost: 0,  mp_cost_coeff: 0,    trigger_condition: "",            effect_code: "MATK_PCT",  description: "마법 공격력 증가", invested: 0, max_skp: 20 },
  { id: "PASSIVE_LUK_01",         name: "행운아",      type: "passive", unlock_level: 50,  base_effect_value: 1,  effect_coeff: 0.5,  mp_cost: 0,  mp_cost_coeff: 0,    trigger_condition: "",            effect_code: "LUK_FLAT",  description: "LUK 고정값 증가", invested: 0, max_skp: 20 },
  { id: "PASSIVE_PDEF_01",        name: "철벽",        type: "passive", unlock_level: 60,  base_effect_value: 5,  effect_coeff: 1,    mp_cost: 0,  mp_cost_coeff: 0,    trigger_condition: "",            effect_code: "PDEF_PCT",  description: "물리 방어력 증가", invested: 0, max_skp: 20 },
  { id: "PASSIVE_CRIT_RATE_01",   name: "예리한 눈",   type: "passive", unlock_level: 70,  base_effect_value: 0.5, effect_coeff: 0.25, mp_cost: 0, mp_cost_coeff: 0,    trigger_condition: "",            effect_code: "CRIT_RATE", description: "치명타율 증가",   invested: 0, max_skp: 20 },
  { id: "PASSIVE_CRIT_DMG_01",    name: "파열의 법칙", type: "passive", unlock_level: 80,  base_effect_value: 5,  effect_coeff: 1.5,  mp_cost: 0,  mp_cost_coeff: 0,    trigger_condition: "",            effect_code: "CRIT_DMG",  description: "치명타 피해 증가", invested: 0, max_skp: 20 },
  { id: "PASSIVE_MDEF_01",        name: "마법 저항",   type: "passive", unlock_level: 90,  base_effect_value: 5,  effect_coeff: 1,    mp_cost: 0,  mp_cost_coeff: 0,    trigger_condition: "",            effect_code: "MDEF_PCT",  description: "마법 방어력 증가", invested: 0, max_skp: 20 },
  { id: "PASSIVE_CRIT_RATE_02",   name: "신의 총애",   type: "passive", unlock_level: 100, base_effect_value: 1,  effect_coeff: 0.5,  mp_cost: 0,  mp_cost_coeff: 0,    trigger_condition: "",            effect_code: "CRIT_RATE", description: "치명타율 증가",   invested: 0, max_skp: 20 },
]

function effectLabel(skill: Skill) {
  const val = skill.base_effect_value + skill.effect_coeff * skill.invested
  const unit = skill.effect_code.endsWith("_FLAT") ? "" : "%"
  return `${val.toFixed(1)}${unit}`
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface CharacterTabProps {
  char: {
    str: number; vit: number; dex: number; int_stat: number; luk: number
    stat_points: number; skill_points: number; level: number
  } | null
  onCharUpdated: () => void
}

// ─── 스킬 카드 ───────────────────────────────────────────────────────────────

function SkillCard({
  skill, isUnlocked, availableSkp,
  onInvest,
}: {
  skill: Skill; isUnlocked: boolean; availableSkp: number
  onInvest: (id: string, delta: number) => void
}) {
  const pct = (skill.invested / skill.max_skp) * 100
  const isPassive = skill.type === "passive"
  const accentColor = isPassive ? "violet" : "purple"

  if (!isUnlocked) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 opacity-55">
        <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
          <Lock className="w-3.5 h-3.5 text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-400">{skill.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-400 rounded-full">Lv.{skill.unlock_level}</span>
          </div>
          <p className="text-xs text-gray-400">{skill.description}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`px-4 py-3 rounded-xl border ${
      skill.invested > 0
        ? `bg-${accentColor}-50 border-${accentColor}-200`
        : "bg-white border-gray-200"
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          skill.invested > 0 ? `bg-${accentColor}-500` : "bg-gray-200"
        }`}>
          {isPassive
            ? <Shield className={`w-3.5 h-3.5 ${skill.invested > 0 ? "text-white" : "text-gray-500"}`} />
            : <Zap    className={`w-3.5 h-3.5 ${skill.invested > 0 ? "text-white" : "text-gray-500"}`} />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span className={`text-sm font-bold ${skill.invested > 0 ? `text-${accentColor}-700` : "text-gray-700"}`}>
                {skill.name}
              </span>
              {skill.type === "active" && skill.trigger_condition && (
                <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded-full font-medium shrink-0">
                  {skill.trigger_condition}
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => onInvest(skill.id, -1)}
                disabled={skill.invested <= 0}
                className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 flex items-center justify-center"
              >
                <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
              </button>
              <span className={`text-xs font-bold w-9 text-center ${skill.invested > 0 ? `text-${accentColor}-600` : "text-gray-400"}`}>
                {skill.invested}/{skill.max_skp}
              </span>
              <button
                onClick={() => onInvest(skill.id, +1)}
                disabled={skill.invested >= skill.max_skp || availableSkp <= 0}
                className={`w-6 h-6 rounded-full flex items-center justify-center disabled:opacity-30 ${
                  isPassive ? "bg-violet-100 hover:bg-violet-200" : "bg-purple-100 hover:bg-purple-200"
                } disabled:bg-gray-100`}
              >
                <ChevronUp className={`w-3.5 h-3.5 ${isPassive ? "text-violet-600" : "text-purple-600"}`} />
              </button>
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isPassive ? "bg-violet-400" : "bg-purple-400"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`text-xs font-semibold shrink-0 ${skill.invested > 0 ? `text-${accentColor}-600` : "text-gray-400"}`}>
              {effectLabel(skill)}
            </span>
            {skill.type === "active" && skill.mp_cost > 0 && (
              <span className="text-[10px] text-blue-400 shrink-0">
                MP {Math.round(skill.mp_cost + skill.mp_cost_coeff * skill.invested)}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{skill.description}</p>
        </div>
      </div>
    </div>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function CharacterTab({ char, onCharUpdated }: CharacterTabProps) {
  const [view, setView] = useState<"stat" | "skill">("stat")

  // 스탯
  const baseStats: Record<StatKey, number> = {
    str: char?.str ?? 0, vit: char?.vit ?? 0,
    dex: char?.dex ?? 0, int_stat: char?.int_stat ?? 0, luk: char?.luk ?? 0,
  }
  const [statDelta, setStatDelta] = useState<Record<StatKey, number>>(
    { str: 0, vit: 0, dex: 0, int_stat: 0, luk: 0 }
  )
  const [statSaving, setStatSaving] = useState(false)

  const totalStatSpent = Object.values(statDelta).reduce((a, b) => a + b, 0)
  const remainingStatPts = (char?.stat_points ?? 0) - totalStatSpent

  const addStat = (key: StatKey, delta: number) => {
    if (delta > 0 && remainingStatPts <= 0) return
    if (delta < 0 && statDelta[key] <= 0) return
    setStatDelta((p) => ({ ...p, [key]: p[key] + delta }))
  }

  const saveStats = async () => {
    if (totalStatSpent === 0) return
    setStatSaving(true)
    try {
      const body: Record<string, string | number> = {
        stat_points: (char?.stat_points ?? 0) - totalStatSpent,
      }
      STATS.forEach(({ key }) => {
        body[key] = baseStats[key] + statDelta[key]
      })
      const res = await fetch("/api/character", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setStatDelta({ str: 0, vit: 0, dex: 0, int_stat: 0, luk: 0 })
        onCharUpdated()
      }
    } finally {
      setStatSaving(false)
    }
  }

  // 스킬
  const [skills, setSkills] = useState<Skill[]>(MOCK_SKILLS)
  const [skillFilter, setSkillFilter] = useState<"all" | "active" | "passive">("all")
  const [skillDelta, setSkillDelta] = useState(0)
  const [skillSaving, setSkillSaving] = useState(false)

  const availableSkp = (char?.skill_points ?? 0) - skillDelta

  const handleSkillInvest = (id: string, delta: number) => {
    setSkills((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s
        const next = Math.max(0, Math.min(s.max_skp, s.invested + delta))
        const diff = next - s.invested
        if (diff > 0 && availableSkp < diff) return s
        setSkillDelta((d) => d + diff)
        return { ...s, invested: next }
      })
    )
  }

  const saveSkills = async () => {
    if (skillDelta === 0) return
    setSkillSaving(true)
    try {
      // TODO: 실제 API 연동 시 skill_log upsert 호출
      await new Promise((r) => setTimeout(r, 600))
      setSkillDelta(0)
      onCharUpdated()
    } finally {
      setSkillSaving(false)
    }
  }

  const filteredSkills = skills.filter((s) => {
    if (skillFilter === "active") return s.type === "active"
    if (skillFilter === "passive") return s.type === "passive"
    return true
  })

  const totalSkillInvested = skills.reduce((a, s) => a + s.invested, 0)

  return (
    <div className="flex flex-col h-full">

      {/* 뷰 전환 탭 */}
      <div className="px-4 pt-3 pb-2 flex gap-2 shrink-0">
        <button
          onClick={() => setView("stat")}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
            view === "stat" ? "bg-amber-500 text-white shadow-sm" : "bg-gray-100 text-gray-500"
          }`}
        >
          스탯 배분
        </button>
        <button
          onClick={() => setView("skill")}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
            view === "skill" ? "bg-purple-500 text-white shadow-sm" : "bg-gray-100 text-gray-500"
          }`}
        >
          스킬 투자
        </button>
      </div>

      {/* ── 스탯 뷰 ── */}
      {view === "stat" && (
        <div className="flex-1 overflow-y-auto flex flex-col">

          {/* 스탯 포인트 헤더 */}
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl px-4 py-3 text-white shadow-sm">
              <div>
                <p className="text-xs opacity-80">배분 가능 스탯 포인트</p>
                <p className="text-2xl font-extrabold leading-none mt-0.5">
                  {remainingStatPts} <span className="text-sm font-medium opacity-70">SP</span>
                </p>
              </div>
              {totalStatSpent > 0 && (
                <div className="text-right">
                  <p className="text-xs opacity-80">이번에 배분</p>
                  <p className="text-lg font-bold">+{totalStatSpent}</p>
                </div>
              )}
            </div>
          </div>

          {/* 스탯 목록 */}
          <div className="px-4 flex flex-col gap-2.5 flex-1">
            {STATS.map(({ key, label, desc, icon: Icon, color, bar, bg, border }) => {
              const base = baseStats[key]
              const added = statDelta[key]
              const total = base + added
              return (
                <div key={key} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${added > 0 ? `${bg} ${border}` : "bg-white border-gray-200"}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${added > 0 ? `${bg}` : "bg-gray-100"}`}>
                    <Icon className={`w-5 h-5 ${added > 0 ? color : "text-gray-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-xs font-bold ${added > 0 ? color : "text-gray-500"}`}>{label}</span>
                      <span className="text-xs text-gray-400">{desc}</span>
                    </div>
                    <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${bar}`}
                        style={{ width: `${Math.min(100, (total / 100) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => addStat(key, -1)}
                      disabled={added <= 0}
                      className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 flex items-center justify-center"
                    >
                      <ChevronDown className="w-4 h-4 text-gray-600" />
                    </button>
                    <div className="w-10 text-center">
                      <span className={`text-base font-extrabold ${added > 0 ? color : "text-gray-700"}`}>{total}</span>
                      {added > 0 && (
                        <span className={`block text-[10px] font-bold ${color}`}>+{added}</span>
                      )}
                    </div>
                    <button
                      onClick={() => addStat(key, +1)}
                      disabled={remainingStatPts <= 0}
                      className={`w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-30 ${
                        remainingStatPts > 0 ? "bg-amber-100 hover:bg-amber-200" : "bg-gray-100"
                      }`}
                    >
                      <ChevronUp className="w-4 h-4 text-amber-600" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 저장 버튼 */}
          <div className="px-4 pt-4 pb-4 shrink-0">
            <button
              onClick={saveStats}
              disabled={statSaving || totalStatSpent === 0}
              className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 text-white rounded-xl text-sm font-bold disabled:opacity-40 active:scale-95 transition-all shadow-sm"
            >
              {statSaving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> 저장 중...</>
                : <><Save className="w-4 h-4" /> 스탯 적용</>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── 스킬 뷰 ── */}
      {view === "skill" && (
        <div className="flex-1 overflow-y-auto flex flex-col">

          {/* 스킬 포인트 헤더 */}
          <div className="px-4 pb-2">
            <div className="flex items-center justify-between bg-gradient-to-r from-purple-500 to-violet-500 rounded-2xl px-4 py-3 text-white shadow-sm">
              <div>
                <p className="text-xs opacity-80">보유 스킬 포인트</p>
                <p className="text-2xl font-extrabold leading-none mt-0.5">
                  {availableSkp} <span className="text-sm font-medium opacity-70">SKP</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-80">총 투자</p>
                <p className="text-lg font-bold">{totalSkillInvested}</p>
              </div>
            </div>
          </div>

          {/* 스킬 필터 */}
          <div className="px-4 pb-2 flex gap-2 shrink-0">
            {(["all", "active", "passive"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setSkillFilter(f)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  skillFilter === f ? "bg-purple-500 text-white shadow-sm" : "bg-gray-100 text-gray-500"
                }`}
              >
                {f === "all" ? "전체" : f === "active" ? "⚡ 액티브" : "🛡 패시브"}
              </button>
            ))}
          </div>

          {/* 스킬 목록 */}
          <div className="flex-1 px-4 flex flex-col gap-2">
            {filteredSkills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                isUnlocked={(char?.level ?? 1) >= skill.unlock_level}
                availableSkp={availableSkp}
                onInvest={handleSkillInvest}
              />
            ))}
          </div>

          {/* 스킬 저장 버튼 */}
          <div className="px-4 pt-4 pb-4 shrink-0">
            <button
              onClick={saveSkills}
              disabled={skillSaving || skillDelta === 0}
              className="w-full flex items-center justify-center gap-2 py-3 bg-purple-500 text-white rounded-xl text-sm font-bold disabled:opacity-40 active:scale-95 transition-all shadow-sm"
            >
              {skillSaving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> 저장 중...</>
                : <><Save className="w-4 h-4" /> 스킬 적용</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
