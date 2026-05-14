/**
 * @module components/game/settings/SkillsPanel
 * @purpose 보유 스킬 SKP 배분 편집. 잔여 스킬 포인트는 char.skill_points - Σ(edits - invested).
 *          PUT /api/skills { investments } 로 일괄 저장 후 onCharUpdated.
 */

"use client"

import { useCallback, useEffect, useState } from "react"
import { Save, Zap } from "lucide-react"
import SettingsSection from "./SettingsSection"
import { apiGet, apiPut, ApiError } from "@/hooks/useApi"
import { useCharacterCtx } from "@/contexts/CharacterContext"

interface SkillRow {
  id: string
  name: string
  type: string
  max_skp: number
  unlock_level: number
  base_effect_value: number
  effect_coeff: number
  mp_cost: number
  description: string
  invested: number
}

export default function SkillsPanel() {
  const { char, refetch } = useCharacterCtx()
  const [skills, setSkills] = useState<SkillRow[]>([])
  const [edits, setEdits] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)

  const fetchSkills = useCallback(async () => {
    try {
      const data = await apiGet<{ skills: SkillRow[] }>("/api/skills")
      setSkills(data.skills)
      const map: Record<string, number> = {}
      data.skills.forEach((s) => { map[s.id] = s.invested })
      setEdits(map)
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    }
  }, [])

  useEffect(() => { fetchSkills() }, [fetchSkills])

  const save = async () => {
    setSaving(true)
    try {
      await apiPut("/api/skills", { investments: edits })
      await fetchSkills()
      refetch()
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    } finally {
      setSaving(false)
    }
  }

  const totalDelta = Object.entries(edits).reduce((acc, [id, pts]) => {
    const orig = skills.find((s) => s.id === id)?.invested ?? 0
    return acc + (pts - orig)
  }, 0)
  const remaining = (char?.skill_points ?? 0) - totalDelta

  return (
    <SettingsSection title={<span className="flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" />스킬 편집</span>}>
      {skills.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">불러오는 중...</p>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between bg-yellow-50 dark:bg-yellow-950/40 rounded-xl px-3 py-2">
            <span className="text-xs text-yellow-800 font-bold">잔여 스킬 포인트</span>
            <span className="text-sm font-bold text-yellow-600">{remaining}</span>
          </div>
          <div className="flex flex-col gap-3">
            {skills.map((skill) => {
              const current = edits[skill.id] ?? skill.invested
              const canAdd = remaining > 0 && current < skill.max_skp
              return (
                <div key={skill.id} className="bg-muted rounded-xl px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground">{skill.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-bold">{skill.type}</span>
                        <span className="text-[9px] text-muted-foreground">Lv.{skill.unlock_level}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{skill.description}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setEdits((p) => ({ ...p, [skill.id]: Math.max(0, current - 1) }))}
                        disabled={current <= 0}
                        className="w-6 h-6 flex items-center justify-center bg-background border border-border rounded-lg text-sm font-bold disabled:opacity-30 active:scale-95"
                      >−</button>
                      <span className="text-xs font-bold text-foreground w-10 text-center">{current}/{skill.max_skp}</span>
                      <button
                        onClick={() => setEdits((p) => ({ ...p, [skill.id]: current + 1 }))}
                        disabled={!canAdd}
                        className="w-6 h-6 flex items-center justify-center bg-background border border-border rounded-lg text-sm font-bold disabled:opacity-30 active:scale-95"
                      >+</button>
                    </div>
                  </div>
                  {skill.max_skp > 0 && (
                    <div className="w-full h-1 bg-background rounded-full mt-1.5">
                      <div className="h-1 bg-yellow-400 rounded-full transition-all" style={{ width: `${(current / skill.max_skp) * 100}%` }} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-yellow-500 text-white rounded-xl text-sm font-bold disabled:opacity-50 active:scale-95"
          >
            <Save className="w-4 h-4" />
            {saving ? "저장 중..." : "일괄 저장"}
          </button>
        </>
      )}
    </SettingsSection>
  )
}
