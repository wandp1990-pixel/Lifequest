"use client"

import { X, Lock, Zap, Heart } from "lucide-react"
import { SKILL_INFO } from "@/lib/skills/skill-info"

interface SkillDetailData {
  id: string
  name: string
  type: "passive" | "active"
  unlock_level: number
  base_effect_value: number
  effect_coeff: number
  mp_cost: number
  mp_cost_coeff: number
  trigger_condition: string
  effect_code: string
  invested: number
  max_skp: number
}

interface SkillDetailSheetProps {
  skill: SkillDetailData
  isUnlocked: boolean
  onClose: () => void
}

function effectValueLabel(skill: SkillDetailData, atInvested: number): string {
  const val = skill.base_effect_value + skill.effect_coeff * atInvested
  const unit = skill.effect_code.endsWith("_FLAT") ? "" : "%"
  return `${val.toFixed(1)}${unit}`
}

function mpValueLabel(skill: SkillDetailData, atInvested: number): number {
  return Math.round(skill.mp_cost + skill.mp_cost_coeff * atInvested)
}

export default function SkillDetailSheet({ skill, isUnlocked, onClose }: SkillDetailSheetProps) {
  const info = SKILL_INFO[skill.id]
  const isPassive = skill.type === "passive"
  const isMaxed = skill.invested >= skill.max_skp
  const hasMpCost = skill.mp_cost > 0 || skill.mp_cost_coeff > 0

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-50 pointer-events-none">
        <div
          className="pointer-events-auto bg-white w-full max-w-sm mx-auto rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[85dvh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#f1ece4]">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              isUnlocked
                ? isPassive ? "bg-emerald-50 text-emerald-500" : "bg-purple-50 text-purple-500"
                : "bg-gray-100 text-gray-400"
            }`}>
              {!isUnlocked
                ? <Lock className="w-4 h-4" />
                : isPassive
                  ? <Heart className="w-4 h-4" />
                  : <Zap className="w-4 h-4" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-gray-900 truncate">{skill.name}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isPassive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-purple-100 text-purple-700"
                }`}>
                  {isPassive ? "🛡 패시브" : "⚡ 액티브"}
                </span>
              </div>
              {info && (
                <p className="text-[11px] italic text-gray-500 mt-0.5 leading-snug">
                  {info.concept}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"
              aria-label="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 본문 */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
            {!isUnlocked && (
              <div className="rounded-xl bg-gray-50 border border-gray-200 px-3.5 py-3 text-sm text-gray-500">
                <span className="font-bold text-gray-700">Lv.{skill.unlock_level}</span> 에 해금되는 스킬입니다.
                효과치와 다음 레벨 정보는 해금 후 확인할 수 있어요.
              </div>
            )}

            {info && (
              <>
                {/* 발동 조건 */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">발동</p>
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {info.trigger_explanation}
                  </p>
                </div>

                {/* 효과 설명 */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">효과</p>
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {info.effect_explanation}
                  </p>
                </div>
              </>
            )}

            {!info && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3 text-xs text-amber-700">
                이 스킬의 도감 설명이 아직 작성되지 않았습니다.
              </div>
            )}

            {/* 효과치/다음 레벨 (해금 시만) */}
            {isUnlocked && (
              <div className="rounded-xl border border-[#f1ece4] bg-[#fafaf7] p-3.5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">현재 효과치</span>
                  <span className={`text-sm font-extrabold ${isPassive ? "text-emerald-600" : "text-purple-700"}`}>
                    {effectValueLabel(skill, skill.invested)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">다음 레벨 ({skill.invested}/{skill.max_skp})</span>
                  {isMaxed ? (
                    <span className="text-sm font-bold text-amber-600">최대치 도달 ✦</span>
                  ) : (
                    <span className="text-sm font-bold text-gray-700">
                      {effectValueLabel(skill, skill.invested + 1)}
                    </span>
                  )}
                </div>

                {!isPassive && hasMpCost && (
                  <>
                    <div className="h-px bg-[#f1ece4]" />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-500">현재 MP 비용</span>
                      <span className="text-sm font-bold text-blue-500">
                        MP {mpValueLabel(skill, skill.invested)}
                      </span>
                    </div>
                    {!isMaxed && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-500">다음 레벨 MP</span>
                        <span className="text-sm font-bold text-gray-600">
                          MP {mpValueLabel(skill, skill.invested + 1)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
