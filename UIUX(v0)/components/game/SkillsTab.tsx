"use client"

import { useState } from "react"
import { Lock, ChevronUp, ChevronDown, Zap, Shield } from "lucide-react"

type SkillType = "passive" | "active"

interface Skill {
  id: string
  name: string
  type: SkillType
  unlock_level: number
  base_effect_value: number
  effect_coeff: number
  mp_cost?: number
  mp_cost_coeff?: number
  trigger_condition?: string
  effect_code: string
  description: string
  invested: number
  max_skp: number
}

const MOCK_SKILLS: Skill[] = [
  // Active (낮은 레벨부터)
  { id: "ACTIVE_RAGE_01",         name: "분노",       type: "active",  unlock_level: 3,  base_effect_value: 30, effect_coeff: 6,    mp_cost: 20, mp_cost_coeff: 1,    trigger_condition: "전투 시작",   effect_code: "PATK_PCT", description: "물리 ATK 증가", invested: 5,  max_skp: 20 },
  { id: "ACTIVE_CHAIN_01",        name: "연속공격",   type: "active",  unlock_level: 5,  base_effect_value: 20, effect_coeff: 2,    mp_cost: 10, mp_cost_coeff: 0.5,  trigger_condition: "명중 시",    effect_code: "EXTRA_HIT", description: "추가 타격 발동", invested: 0,  max_skp: 20 },
  { id: "ACTIVE_FIRST_STRIKE_01", name: "선제 강타",  type: "active",  unlock_level: 9,  base_effect_value: 20, effect_coeff: 4,    mp_cost: 15, mp_cost_coeff: 0.75, trigger_condition: "선공 획득",  effect_code: "PATK_PCT", description: "물리 ATK 증가", invested: 0,  max_skp: 20 },
  { id: "ACTIVE_AFTERIMAGE_01",   name: "잔상",       type: "active",  unlock_level: 14, base_effect_value: 10, effect_coeff: 2.5,  mp_cost: 8,  mp_cost_coeff: 0.4,  trigger_condition: "회피 시",    effect_code: "EXTRA_HIT", description: "반격 추가 타격", invested: 0,  max_skp: 20 },
  { id: "ACTIVE_REVERSAL_01",     name: "역전의 의지", type: "active", unlock_level: 20, base_effect_value: 5,  effect_coeff: 1.25, mp_cost: 20, mp_cost_coeff: 1,    trigger_condition: "HP 25% 이하", effect_code: "HP_HEAL",  description: "HP 회복",       invested: 0,  max_skp: 20 },
  { id: "ACTIVE_MANA_BURST_01",   name: "마나 폭발",  type: "active",  unlock_level: 25, base_effect_value: 50, effect_coeff: 7.5,  mp_cost: 25, mp_cost_coeff: 1.25, trigger_condition: "매 3턴",     effect_code: "MATK_PCT", description: "마법 ATK 증가", invested: 0,  max_skp: 20 },
  { id: "ACTIVE_SPARK_01",        name: "지식의 불꽃", type: "active", unlock_level: 28, base_effect_value: 10, effect_coeff: 3.5,  mp_cost: 10, mp_cost_coeff: 0.5,  trigger_condition: "치명타 시",  effect_code: "MATK_PCT", description: "마법 ATK 증가", invested: 0,  max_skp: 20 },
  { id: "ACTIVE_SURVIVE_01",      name: "기사회생",   type: "active",  unlock_level: 30, base_effect_value: 5,  effect_coeff: 2.25, mp_cost: 0,  mp_cost_coeff: 0,    trigger_condition: "사망 시",    effect_code: "SURVIVE",  description: "사망 시 생존",  invested: 0,  max_skp: 20 },
  // Passive
  { id: "PASSIVE_PATK_01",      name: "전사의 기백", type: "passive", unlock_level: 10,  base_effect_value: 2,   effect_coeff: 0.5,  effect_code: "PATK_PCT",  description: "물리 공격력 증가",  invested: 3, max_skp: 20 },
  { id: "PASSIVE_HP_01",        name: "강철 피부",   type: "passive", unlock_level: 20,  base_effect_value: 2,   effect_coeff: 0.5,  effect_code: "HP_PCT",    description: "최대 HP 증가",      invested: 0, max_skp: 20 },
  { id: "PASSIVE_DEX_01",       name: "신속함",      type: "passive", unlock_level: 30,  base_effect_value: 1,   effect_coeff: 0.5,  effect_code: "DEX_FLAT",  description: "DEX 고정값 증가",   invested: 0, max_skp: 20 },
  { id: "PASSIVE_MATK_01",      name: "마법 친화",   type: "passive", unlock_level: 40,  base_effect_value: 2,   effect_coeff: 0.5,  effect_code: "MATK_PCT",  description: "마법 공격력 증가",  invested: 0, max_skp: 20 },
  { id: "PASSIVE_LUK_01",       name: "행운아",      type: "passive", unlock_level: 50,  base_effect_value: 1,   effect_coeff: 0.5,  effect_code: "LUK_FLAT",  description: "LUK 고정값 증가",   invested: 0, max_skp: 20 },
  { id: "PASSIVE_PDEF_01",      name: "철벽",        type: "passive", unlock_level: 60,  base_effect_value: 5,   effect_coeff: 1,    effect_code: "PDEF_PCT",  description: "물리 방어력 증가",  invested: 0, max_skp: 20 },
  { id: "PASSIVE_CRIT_RATE_01", name: "예리한 눈",   type: "passive", unlock_level: 70,  base_effect_value: 0.5, effect_coeff: 0.25, effect_code: "CRIT_RATE", description: "치명타율 증가",     invested: 0, max_skp: 20 },
  { id: "PASSIVE_CRIT_DMG_01",  name: "파열의 법칙", type: "passive", unlock_level: 80,  base_effect_value: 5,   effect_coeff: 1.5,  effect_code: "CRIT_DMG",  description: "치명타 피해 증가",  invested: 0, max_skp: 20 },
  { id: "PASSIVE_MDEF_01",      name: "마법 저항",   type: "passive", unlock_level: 90,  base_effect_value: 5,   effect_coeff: 1,    effect_code: "MDEF_PCT",  description: "마법 방어력 증가",  invested: 0, max_skp: 20 },
  { id: "PASSIVE_CRIT_RATE_02", name: "신의 총애",   type: "passive", unlock_level: 100, base_effect_value: 1,   effect_coeff: 0.5,  effect_code: "CRIT_RATE", description: "치명타율 증가",     invested: 0, max_skp: 20 },
]

function effectLabel(skill: Skill): string {
  const val = skill.base_effect_value + skill.effect_coeff * skill.invested
  const unit = skill.effect_code.endsWith("_FLAT") ? "" : "%"
  return `${val.toFixed(1)}${unit}`
}

function mpCostLabel(skill: Skill): string {
  if (!skill.mp_cost && !skill.mp_cost_coeff) return "MP 0"
  const cost = (skill.mp_cost ?? 0) + (skill.mp_cost_coeff ?? 0) * skill.invested
  return `MP ${Math.round(cost)}`
}

interface SkillCardProps {
  skill: Skill
  isUnlocked: boolean
  availablePoints: number
  onInvest: (id: string, delta: number) => void
}

function SkillCard({ skill, isUnlocked, availablePoints, onInvest }: SkillCardProps) {
  const pct = (skill.invested / skill.max_skp) * 100

  if (!isUnlocked) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-muted rounded-xl border border-border opacity-60">
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <Lock className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground">{skill.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded-full">Lv.{skill.unlock_level} 해금</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{skill.description}</p>
        </div>
      </div>
    )
  }

  const isPassive = skill.type === "passive"

  return (
    <div className={`px-4 py-3 rounded-xl border transition-all ${
      skill.invested > 0
        ? isPassive
          ? "bg-violet-50 border-violet-200"
          : "bg-purple-50 border-purple-200"
        : "bg-background border-border"
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
          skill.invested > 0
            ? isPassive ? "bg-violet-500" : "bg-purple-500"
            : "bg-muted"
        }`}>
          {isPassive
            ? <Shield className={`w-4 h-4 ${skill.invested > 0 ? "text-white" : "text-muted-foreground"}`} />
            : <Zap    className={`w-4 h-4 ${skill.invested > 0 ? "text-white" : "text-muted-foreground"}`} />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-sm font-bold ${skill.invested > 0 ? (isPassive ? "text-violet-700" : "text-purple-700") : "text-foreground"}`}>
                {skill.name}
              </span>
              {skill.type === "active" && skill.trigger_condition && (
                <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded-full font-medium">
                  {skill.trigger_condition}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onInvest(skill.id, -1)}
                disabled={skill.invested <= 0}
                className="w-6 h-6 rounded-full bg-muted hover:bg-muted disabled:opacity-30 flex items-center justify-center transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <span className={`text-xs font-bold w-8 text-center ${skill.invested > 0 ? (isPassive ? "text-violet-600" : "text-purple-600") : "text-muted-foreground"}`}>
                {skill.invested}/{skill.max_skp}
              </span>
              <button
                onClick={() => onInvest(skill.id, +1)}
                disabled={skill.invested >= skill.max_skp || availablePoints <= 0}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors disabled:opacity-30 ${
                  isPassive
                    ? "bg-violet-100 hover:bg-violet-200 disabled:bg-muted"
                    : "bg-purple-100 hover:bg-purple-200 disabled:bg-muted"
                }`}
              >
                <ChevronUp className={`w-3.5 h-3.5 ${isPassive ? "text-violet-600" : "text-purple-600"}`} />
              </button>
            </div>
          </div>

          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isPassive ? "bg-violet-400" : "bg-purple-400"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`text-xs font-semibold flex-shrink-0 ${skill.invested > 0 ? (isPassive ? "text-violet-600" : "text-purple-600") : "text-muted-foreground"}`}>
              {effectLabel(skill)}
            </span>
            {skill.type === "active" && (
              <span className="text-[10px] text-blue-400 flex-shrink-0">{mpCostLabel(skill)}</span>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-0.5">{skill.description}</p>
        </div>
      </div>
    </div>
  )
}

interface SkillsTabProps {
  skillPoints: number
  characterLevel: number
}

export default function SkillsTab({ skillPoints, characterLevel }: SkillsTabProps) {
  const [filter, setFilter] = useState<"all" | "active" | "passive">("all")
  const [skills, setSkills] = useState<Skill[]>(MOCK_SKILLS)
  const [availablePoints, setAvailablePoints] = useState(skillPoints)

  const handleInvest = (id: string, delta: number) => {
    setSkills((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s
        const next = Math.max(0, Math.min(s.max_skp, s.invested + delta))
        const diff = next - s.invested
        if (diff > 0 && availablePoints < diff) return s
        setAvailablePoints((p) => p - diff)
        return { ...s, invested: next }
      })
    )
  }

  const totalInvested = skills.reduce((acc, s) => acc + s.invested, 0)

  const filtered = skills.filter((s) => {
    if (filter === "active") return s.type === "active"
    if (filter === "passive") return s.type === "passive"
    return true
  })

  return (
    <div className="flex flex-col h-full">
      {/* 스킬 포인트 헤더 */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between bg-gradient-to-r from-purple-500 to-violet-500 rounded-2xl px-4 py-3 text-white shadow-sm">
          <div>
            <p className="text-xs opacity-80">보유 스킬 포인트</p>
            <p className="text-2xl font-extrabold leading-none mt-0.5">{availablePoints} <span className="text-sm font-medium opacity-70">SKP</span></p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-80">투자 합계</p>
            <p className="text-lg font-bold">{totalInvested} / {skills.length * 20}</p>
          </div>
        </div>
      </div>

      {/* 필터 탭 */}
      <div className="px-4 pb-2 flex gap-2">
        {(["all", "active", "passive"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === f
                ? "bg-purple-500 text-white shadow-sm"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {f === "all" ? "전체" : f === "active" ? "⚡ 액티브" : "🛡 패시브"}
          </button>
        ))}
      </div>

      {/* 스킬 목록 */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2">
        {filtered.map((skill) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            isUnlocked={characterLevel >= skill.unlock_level}
            availablePoints={availablePoints}
            onInvest={handleInvest}
          />
        ))}
      </div>
    </div>
  )
}
