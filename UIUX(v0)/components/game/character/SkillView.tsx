/**
 * @module components/game/character/SkillView
 * @purpose 스킬 투자 뷰. 필터(전체/액티브/패시브) + SkillCard 리스트 + 누적 투자량 저장.
 *          pendingInvest map으로 미저장 변경을 누적. 저장 시 PUT /api/skills { investments }.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { Zap, Save, Loader2 } from "lucide-react"
import type { Skill, CharBasics } from "./constants"
import SkillCard from "./SkillCard"
import SkillDetailSheet from "@/components/game/SkillDetailSheet"

interface Props {
  char: CharBasics | null
  onCharUpdated: () => void
}

export default function SkillView({ char, onCharUpdated }: Props) {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loaded, setLoaded] = useState(false)
  const [filter, setFilter] = useState<"all" | "active" | "passive">("all")
  const [pendingInvest, setPendingInvest] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const fetchSkills = useCallback(async () => {
    try {
      const res = await fetch("/api/skills")
      if (!res.ok) return
      const data = await res.json()
      setSkills(data.skills)
      setLoaded(true)
    } catch {}
  }, [])

  useEffect(() => { fetchSkills() }, [fetchSkills])

  const view: Skill[] = skills.map((s) => ({
    ...s,
    invested: s.invested + (pendingInvest[s.id] ?? 0),
  }))

  const spent = Object.values(pendingInvest).reduce((a, b) => a + b, 0)
  const available = (char?.skill_points ?? 0) - spent

  const handleInvest = (id: string, delta: number) => {
    const skill = view.find((s) => s.id === id)
    if (!skill) return
    const next = Math.max(0, Math.min(skill.max_skp, skill.invested + delta))
    const diff = next - skill.invested
    if (diff > 0 && available < diff) return
    setPendingInvest((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + diff }))
  }

  const save = async () => {
    if (spent === 0) return
    setSaving(true)
    try {
      const investments: Record<string, number> = {}
      for (const s of view) {
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
      setSaving(false)
    }
  }

  const filtered = view.filter((s) => filter === "all" ? true : s.type === filter)

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="px-4 pb-3 shrink-0">
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3 border border-dashed border-purple-300 bg-[#faf5ff]">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-purple-500 font-semibold">투자 가능 스킬 포인트</p>
            <p className="text-xl font-extrabold leading-none mt-0.5 text-purple-900">
              {available} <span className="text-xs font-bold text-purple-600">SKP</span>
            </p>
          </div>
          {spent > 0 && (
            <div className="text-right">
              <p className="text-xs text-purple-400">이번에 투자</p>
              <p className="text-lg font-bold text-purple-600">+{spent}</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-3 flex gap-2 shrink-0">
        {(["all", "active", "passive"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 rounded-full text-xs font-bold transition-all border ${
              filter === f ? "bg-purple-500 text-white border-transparent" : "bg-white text-gray-500 border-[#f1ece4]"
            }`}
          >
            {f === "all" ? "전체" : f === "active" ? "⚡ 액티브" : "🛡 패시브"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-2.5 pb-2">
        {!loaded ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> 스킬 로딩 중...
          </div>
        ) : filtered.map((skill) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            isUnlocked={(char?.level ?? 1) >= skill.unlock_level}
            availableSkp={available}
            onInvest={handleInvest}
            onSelect={setSelectedId}
          />
        ))}
      </div>

      <div className="px-4 pt-2 pb-4 shrink-0">
        <button
          onClick={save}
          disabled={saving || spent === 0}
          className="w-full flex items-center justify-center gap-2 py-3 bg-purple-100 text-purple-700 rounded-xl text-sm font-bold active:scale-95 transition-all"
          style={{ opacity: spent === 0 && !saving ? 0.7 : 1 }}
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> 저장 중...</>
            : <><Save className="w-4 h-4" /> 스킬 적용</>
          }
        </button>
      </div>

      {selectedId && (() => {
        const target = view.find((s) => s.id === selectedId)
        if (!target) return null
        return (
          <SkillDetailSheet
            skill={target}
            isUnlocked={(char?.level ?? 1) >= target.unlock_level}
            onClose={() => setSelectedId(null)}
          />
        )
      })()}
    </div>
  )
}
