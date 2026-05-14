/**
 * @module components/game/character/SkillCard
 * @purpose 단일 스킬 카드. 잠금/투자 진척률/▽△ 버튼.
 *          잠금 분기는 비활성 회색 카드 + onSelect로 상세 시트 열기.
 */

"use client"

import { Heart, Zap, Lock, ChevronUp, ChevronDown } from "lucide-react"
import type { Skill } from "./constants"

function previewLabel(skill: Skill): string {
  const nextVal = skill.base_effect_value + skill.effect_coeff * (skill.invested + 1)
  const unit = skill.effect_code.endsWith("_FLAT") ? "" : "%"
  return `+1 → ${nextVal.toFixed(1)}${unit}`
}

interface Props {
  skill: Skill
  isUnlocked: boolean
  availableSkp: number
  onInvest: (id: string, delta: number) => void
  onSelect: (id: string) => void
}

export default function SkillCard({ skill, isUnlocked, availableSkp, onInvest, onSelect }: Props) {
  const pct = (skill.invested / skill.max_skp) * 100
  const isPassive = skill.type === "passive"
  const isHighlighted = skill.invested > 0
  const labelText = skill.trigger_condition || skill.description

  if (!isUnlocked) {
    return (
      <button
        type="button"
        onClick={() => onSelect(skill.id)}
        className="flex items-center gap-3 px-3.5 py-3.5 rounded-2xl border border-[#f1ece4] bg-white opacity-55 text-left active:opacity-70 transition-opacity"
      >
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
        <span className="w-7 h-7 flex items-center justify-center opacity-30 text-gray-400"><ChevronDown className="w-3.5 h-3.5" /></span>
        <div className="w-5 text-center flex-shrink-0"><span className="text-[17px] font-extrabold text-[#cbd5e0]">0</span></div>
        <span className="w-7 h-7 flex items-center justify-center opacity-30 text-gray-400"><ChevronUp className="w-3.5 h-3.5" /></span>
      </button>
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(skill.id)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(skill.id) }}
      className={`flex items-center gap-3 px-3.5 py-3.5 rounded-2xl cursor-pointer active:scale-[0.99] transition-transform ${
        isHighlighted ? "bg-[#faf5ff] border-[#ddd6fe]" : "bg-white border-[#f1ece4]"
      }`}
      style={{ border: isHighlighted ? "1.5px solid #ddd6fe" : "1px solid #f1ece4" }}
    >
      <div className="w-9 h-9 rounded-full bg-white border border-[#ececec] flex items-center justify-center flex-shrink-0 text-gray-500">
        {isPassive ? <Heart className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 mb-1.5 whitespace-nowrap overflow-hidden">
          <span className="text-sm font-bold text-gray-900 flex-shrink-0">{skill.name}</span>
          {!isHighlighted && (
            <span className="text-[11px] text-gray-500 font-medium overflow-hidden text-ellipsis flex-1 min-w-0">{labelText}</span>
          )}
          {isHighlighted && skill.invested < skill.max_skp && (
            <span className="text-[11px] font-bold text-purple-700 ml-auto flex-shrink-0">↘ {previewLabel(skill)}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-[5px] h-[5px] rounded-full flex-shrink-0 ${isPassive ? "bg-emerald-400" : "bg-purple-500"}`} />
          <div className="flex-1 h-[3px] bg-[#f3f0ea] rounded-full relative overflow-hidden">
            <div className={`absolute left-0 top-0 h-full rounded-full transition-all ${isPassive ? "bg-emerald-400" : "bg-purple-500"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onInvest(skill.id, -1) }}
        disabled={skill.invested <= 0}
        className="w-7 h-7 flex items-center justify-center disabled:opacity-30 text-gray-400"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      <div className="w-5 text-center flex-shrink-0"><span className="text-[17px] font-extrabold text-gray-900">{skill.invested}</span></div>
      <button
        onClick={(e) => { e.stopPropagation(); onInvest(skill.id, +1) }}
        disabled={skill.invested >= skill.max_skp || availableSkp <= 0}
        className="w-7 h-7 flex items-center justify-center disabled:opacity-30 text-gray-400"
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
