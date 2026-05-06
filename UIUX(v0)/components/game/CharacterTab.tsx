"use client"

import { useState, useEffect, useCallback } from "react"
import { Sword, Heart, Wind, Brain, Star, Lock, ChevronUp, ChevronDown, Zap, Save, Loader2 } from "lucide-react"

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


function skillPreviewLabel(skill: Skill): string {
  const nextVal = skill.base_effect_value + skill.effect_coeff * (skill.invested + 1)
  const unit = skill.effect_code.endsWith("_FLAT") ? "" : "%"
  return `+1 → ${nextVal.toFixed(1)}${unit}`
}

// ─── 전투 스탯 요약 헬퍼 ─────────────────────────────────────────────────────

function CombatStatRow({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="flex items-center justify-between gap-1 min-w-0">
      <span className="text-[10px] text-muted-foreground truncate">{label}</span>
      <span className={`text-[11px] font-bold shrink-0 ${color}`}>{value}</span>
    </div>
  )
}

function PassiveBadge({ label }: { label: string }) {
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700/50">
      ✦ {label}
    </span>
  )
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface CharacterTabProps {
  char: {
    str: number; vit: number; dex: number; int_stat: number; luk: number
    stat_points: number; skill_points: number; level: number
  } | null
  onCharUpdated: () => void
  itemStatBonuses?: { str: number; vit: number; dex: number; int_stat: number; luk: number }
  effectiveStats?: {
    patk: number; matk: number; pdef: number; mdef: number
    dex: number; luk: number; max_hp: number; max_mp: number
    crit_rate: number; accuracy_bonus: number; evasion_bonus: number
    double_attack: boolean; life_steal: boolean; def_ignore: boolean; reflect: boolean
  }
}

// ─── 스킬 카드 ───────────────────────────────────────────────────────────────
// 스탯 배분 카드와 동일한 레이아웃:
//   [원형 아이콘] [스킬명 + 라벨/미리보기]         [▽] [숫자] [△]
//               [컬러 점 + 슬라이더        ]

function SkillCard({
  skill, isUnlocked, availableSkp,
  onInvest,
}: {
  skill: Skill; isUnlocked: boolean; availableSkp: number
  onInvest: (id: string, delta: number) => void
}) {
  const pct = (skill.invested / skill.max_skp) * 100
  const isPassive = skill.type === "passive"
  const isHighlighted = skill.invested > 0
  const labelText = skill.trigger_condition || skill.description

  if (!isUnlocked) {
    return (
      <div className="flex items-center gap-3 px-3.5 py-3.5 rounded-2xl border border-[#f1ece4] bg-white opacity-55">
        <div className="w-9 h-9 rounded-full bg-white border border-[#ececec] flex items-center justify-center flex-shrink-0">
          <Lock className="w-3.5 h-3.5 text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 mb-1.5 whitespace-nowrap overflow-hidden">
            <span className="text-sm font-bold text-gray-400 flex-shrink-0">{skill.name}</span>
            <span className="text-[11px] text-gray-300 font-medium overflow-hidden text-ellipsis flex-1 min-w-0">{labelText}</span>
            <span className="text-[11px] font-semibold text-gray-400 flex-shrink-0">Lv.{skill.unlock_level}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-[5px] h-[5px] rounded-full bg-[#cbd5e0] flex-shrink-0" />
            <div className="flex-1 h-[3px] bg-[#f3f0ea] rounded-full" />
          </div>
        </div>
        <button disabled className="w-7 h-7 flex items-center justify-center opacity-30 text-gray-400">
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <div className="w-5 text-center flex-shrink-0">
          <span className="text-[17px] font-extrabold text-[#cbd5e0]">0</span>
        </div>
        <button disabled className="w-7 h-7 flex items-center justify-center opacity-30 text-gray-400">
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div
      className={`flex items-center gap-3 px-3.5 py-3.5 rounded-2xl ${
        isHighlighted ? "bg-[#faf5ff] border-[#ddd6fe]" : "bg-white border-[#f1ece4]"
      }`}
      style={{ border: isHighlighted ? "1.5px solid #ddd6fe" : "1px solid #f1ece4" }}
    >
      {/* 원형 아이콘 */}
      <div className="w-9 h-9 rounded-full bg-white border border-[#ececec] flex items-center justify-center flex-shrink-0 text-gray-500">
        {isPassive ? <Heart className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
      </div>

      {/* 가운데: 첫 줄 = 스킬명 + 라벨/미리보기, 둘째 줄 = 점 + 슬라이더 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 mb-1.5 whitespace-nowrap overflow-hidden">
          <span className="text-sm font-bold text-gray-900 flex-shrink-0">{skill.name}</span>
          {!isHighlighted && (
            <span className="text-[11px] text-gray-500 font-medium overflow-hidden text-ellipsis flex-1 min-w-0">{labelText}</span>
          )}
          {isHighlighted && skill.invested < skill.max_skp && (
            <span className="text-[11px] font-bold text-purple-700 ml-auto flex-shrink-0">
              ↘ {skillPreviewLabel(skill)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-[5px] h-[5px] rounded-full flex-shrink-0 ${isPassive ? "bg-emerald-400" : "bg-purple-500"}`} />
          <div className="flex-1 h-[3px] bg-[#f3f0ea] rounded-full relative overflow-hidden">
            <div
              className={`absolute left-0 top-0 h-full rounded-full transition-all ${isPassive ? "bg-emerald-400" : "bg-purple-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ▽ 숫자 △ */}
      <button
        onClick={() => onInvest(skill.id, -1)}
        disabled={skill.invested <= 0}
        className="w-7 h-7 flex items-center justify-center disabled:opacity-30 text-gray-400"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      <div className="w-5 text-center flex-shrink-0">
        <span className="text-[17px] font-extrabold text-gray-900">{skill.invested}</span>
      </div>
      <button
        onClick={() => onInvest(skill.id, +1)}
        disabled={skill.invested >= skill.max_skp || availableSkp <= 0}
        className="w-7 h-7 flex items-center justify-center disabled:opacity-30 text-gray-400"
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function CharacterTab({ char, onCharUpdated, itemStatBonuses, effectiveStats }: CharacterTabProps) {
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
  const [skills, setSkills] = useState<Skill[]>([])
  const [skillsLoaded, setSkillsLoaded] = useState(false)
  const [skillFilter, setSkillFilter] = useState<"all" | "active" | "passive">("all")
  const [pendingInvest, setPendingInvest] = useState<Record<string, number>>({})
  const [skillSaving, setSkillSaving] = useState(false)

  const fetchSkills = useCallback(async () => {
    try {
      const res = await fetch("/api/skills")
      if (!res.ok) return
      const data = await res.json()
      setSkills(data.skills)
      setSkillsLoaded(true)
    } catch {}
  }, [])

  useEffect(() => { fetchSkills() }, [fetchSkills])

  // pendingInvest에 쌓인 변화량을 skills에 반영한 뷰
  const skillsView: Skill[] = skills.map((s) => ({
    ...s,
    invested: s.invested + (pendingInvest[s.id] ?? 0),
  }))

  const skpSpent = Object.values(pendingInvest).reduce((a, b) => a + b, 0)
  const availableSkp = (char?.skill_points ?? 0) - skpSpent
  const skillDelta = skpSpent  // 저장 버튼 활성화 조건용

  const handleSkillInvest = (id: string, delta: number) => {
    const skill = skillsView.find((s) => s.id === id)
    if (!skill) return
    const curInvested = skill.invested
    const next = Math.max(0, Math.min(skill.max_skp, curInvested + delta))
    const diff = next - curInvested
    if (diff > 0 && availableSkp < diff) return
    setPendingInvest((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + diff }))
  }

  const saveSkills = async () => {
    if (skpSpent === 0) return
    setSkillSaving(true)
    try {
      const investments: Record<string, number> = {}
      for (const s of skillsView) {
        if ((pendingInvest[s.id] ?? 0) !== 0) {
          investments[s.id] = s.invested
        }
      }
      const res = await fetch("/api/skills", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investments }),
      })
      if (res.ok) {
        const data = await res.json()
        setSkills(data.skills)
        setPendingInvest({})
        onCharUpdated()
      }
    } finally {
      setSkillSaving(false)
    }
  }

  const filteredSkills = skillsView.filter((s) => {
    if (skillFilter === "active") return s.type === "active"
    if (skillFilter === "passive") return s.type === "passive"
    return true
  })



  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* 뷰 전환 탭 */}
      <div className="px-4 pt-3 pb-2 flex gap-2 shrink-0">
        <button
          onClick={() => setView("stat")}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
            view === "stat" ? "bg-amber-500 text-white shadow-sm" : "bg-muted text-muted-foreground"
          }`}
        >
          스탯 배분
        </button>
        <button
          onClick={() => setView("skill")}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
            view === "skill" ? "bg-purple-500 text-white shadow-sm" : "bg-muted text-muted-foreground"
          }`}
        >
          스킬 투자
        </button>
      </div>

      {/* ── 스탯 뷰 ── */}
      {view === "stat" && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

          {/* 스탯 포인트 헤더 */}
          <div className="px-4 pb-3 shrink-0">
            <div className="flex items-center justify-between rounded-2xl px-4 py-3 border border-dashed border-amber-300 bg-amber-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-500 text-sm">✦</span>
                </div>
                <div>
                  <p className="text-xs text-amber-600 font-medium">배분 가능 스탯 포인트</p>
                  <p className="text-xl font-extrabold leading-none mt-0.5 text-amber-500">
                    {remainingStatPts} <span className="text-sm font-medium">SP</span>
                  </p>
                </div>
              </div>
              {totalStatSpent > 0 && (
                <div className="text-right">
                  <p className="text-xs text-amber-500 opacity-80">이번에 배분</p>
                  <p className="text-lg font-bold text-amber-600">+{totalStatSpent}</p>
                </div>
              )}
            </div>
          </div>

          {/* 스탯 목록 */}
          <div className="px-4 flex flex-col gap-2.5 flex-1 overflow-y-auto pb-2">
            {STATS.map(({ key, label, desc, icon: Icon, color, bar, bg, border }) => {
              const base = baseStats[key]
              const added = statDelta[key]
              const itemBonus = itemStatBonuses?.[key] ?? 0
              const total = base + added
              const hasItemBonus = itemBonus > 0
              const isHighlighted = added > 0 || hasItemBonus
              return (
                <div key={key} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${isHighlighted ? `${bg} ${border}` : "bg-background border-border"}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isHighlighted ? `${bg}` : "bg-muted"}`}>
                    <Icon className={`w-5 h-5 ${isHighlighted ? color : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className={`text-xs font-bold ${isHighlighted ? color : "text-muted-foreground"}`}>{label}</span>
                      <span className="text-xs text-muted-foreground">{desc}</span>
                      {hasItemBonus && (
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">
                          🗡+{itemBonus} → {total + itemBonus}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${bar}`}
                        style={{ width: `${Math.min(100, ((total + itemBonus) / 100) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => addStat(key, -1)}
                      disabled={added <= 0}
                      className="w-7 h-7 rounded-full bg-muted hover:bg-muted disabled:opacity-30 flex items-center justify-center"
                    >
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <div className="w-10 text-center">
                      <span className={`text-base font-extrabold ${isHighlighted ? color : "text-foreground"}`}>{total}</span>
                      {added > 0 && (
                        <span className={`block text-[10px] font-bold ${color}`}>+{added}</span>
                      )}
                    </div>
                    <button
                      onClick={() => addStat(key, +1)}
                      disabled={remainingStatPts <= 0}
                      className={`w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-30 ${
                        remainingStatPts > 0 ? "bg-amber-100 hover:bg-amber-200" : "bg-muted"
                      }`}
                    >
                      <ChevronUp className="w-4 h-4 text-amber-600" />
                    </button>
                  </div>
                </div>
              )
            })}

            {/* 전투 스탯 요약 */}
            {effectiveStats && (
              <div className="mt-1 rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5">⚔ 전투 스탯</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <CombatStatRow label="물리 공격력" value={effectiveStats.patk} color="text-red-500" />
                  <CombatStatRow label="마법 공격력" value={effectiveStats.matk} color="text-violet-500" />
                  <CombatStatRow label="물리 방어력" value={effectiveStats.pdef} color="text-emerald-500" />
                  <CombatStatRow label="마법 방어력" value={effectiveStats.mdef} color="text-sky-500" />
                  <CombatStatRow label="최대 HP" value={effectiveStats.max_hp} color="text-red-400" />
                  <CombatStatRow label="최대 MP" value={effectiveStats.max_mp} color="text-blue-400" />
                  <CombatStatRow label="DEX" value={effectiveStats.dex} color="text-cyan-500" />
                  <CombatStatRow label="LUK" value={effectiveStats.luk} color="text-amber-500" />
                  {effectiveStats.crit_rate > 0 && (
                    <CombatStatRow label="치명타율" value={`+${effectiveStats.crit_rate}%`} color="text-orange-500" />
                  )}
                  {effectiveStats.accuracy_bonus > 0 && (
                    <CombatStatRow label="명중 보너스" value={`+${effectiveStats.accuracy_bonus}%`} color="text-teal-500" />
                  )}
                  {effectiveStats.evasion_bonus > 0 && (
                    <CombatStatRow label="회피 보너스" value={`+${effectiveStats.evasion_bonus}%`} color="text-lime-500" />
                  )}
                </div>
                {(effectiveStats.double_attack || effectiveStats.life_steal || effectiveStats.def_ignore || effectiveStats.reflect) && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {effectiveStats.double_attack && <PassiveBadge label="더블어택" />}
                    {effectiveStats.life_steal    && <PassiveBadge label="생명흡수" />}
                    {effectiveStats.def_ignore    && <PassiveBadge label="방어무시" />}
                    {effectiveStats.reflect       && <PassiveBadge label="반사" />}
                  </div>
                )}
              </div>
            )}
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
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

          {/* 스킬 포인트 헤더 — 스탯 배분의 SP 박스와 동일 스타일, 보라 컬러 */}
          <div className="px-4 pb-3 shrink-0">
            <div className="flex items-center gap-3 rounded-2xl px-4 py-3 border border-dashed border-purple-300 bg-[#faf5ff]">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-purple-500 font-semibold">투자 가능 스킬 포인트</p>
                <p className="text-xl font-extrabold leading-none mt-0.5 text-purple-900">
                  {availableSkp} <span className="text-xs font-bold text-purple-600">SKP</span>
                </p>
              </div>
              {skpSpent > 0 && (
                <div className="text-right">
                  <p className="text-xs text-purple-400">이번에 투자</p>
                  <p className="text-lg font-bold text-purple-600">+{skpSpent}</p>
                </div>
              )}
            </div>
          </div>

          {/* 스킬 필터 */}
          <div className="px-4 pb-3 flex gap-2 shrink-0">
            {(["all", "active", "passive"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setSkillFilter(f)}
                className={`flex-1 py-2 rounded-full text-xs font-bold transition-all border ${
                  skillFilter === f ? "bg-purple-500 text-white border-transparent" : "bg-white text-gray-500 border-[#f1ece4]"
                }`}
              >
                {f === "all" ? "전체" : f === "active" ? "⚡ 액티브" : "🛡 패시브"}
              </button>
            ))}
          </div>

          {/* 스킬 목록 */}
          <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-2.5 pb-2">
            {!skillsLoaded ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> 스킬 로딩 중...
              </div>
            ) : filteredSkills.map((skill) => (
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
          <div className="px-4 pt-2 pb-4 shrink-0">
            <button
              onClick={saveSkills}
              disabled={skillSaving || skillDelta === 0}
              className="w-full flex items-center justify-center gap-2 py-3 bg-purple-100 text-purple-700 rounded-xl text-sm font-bold active:scale-95 transition-all"
              style={{ opacity: skillDelta === 0 && !skillSaving ? 0.7 : 1 }}
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
