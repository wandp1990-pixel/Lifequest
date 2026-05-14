/**
 * @module components/game/settings/SkillDbPanel
 * @purpose skill DB 직접 편집(CRUD). PUT/POST/DELETE /api/skill-db.
 *          response shape `{ skills: SkillDbRow[] }` 그대로 사용.
 */

"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronDown, ChevronRight, Database, Plus, Save, Trash2 } from "lucide-react"
import SettingsSection from "./SettingsSection"
import { apiDelete, apiGet, apiPost, apiPut, ApiError } from "@/hooks/useApi"

interface SkillDbRow {
  id: string
  name: string
  type: string
  max_skp: number
  unlock_level: number
  base_effect_value: number
  effect_coeff: number
  base_trigger_param: number
  trigger_param_coeff: number
  mp_cost: number
  mp_cost_coeff: number
  effect_code: string
  trigger_condition: string
  description: string
  is_active: number
}

const EMPTY: Omit<SkillDbRow, "id"> = {
  name: "", type: "active", max_skp: 20, unlock_level: 1,
  base_effect_value: 0, effect_coeff: 0, base_trigger_param: 0,
  trigger_param_coeff: 0, mp_cost: 0, mp_cost_coeff: 0,
  effect_code: "", trigger_condition: "", description: "", is_active: 1,
}

const EDIT_FIELDS: [keyof SkillDbRow, string, string][] = [
  ["name", "이름", "text"],
  ["type", "타입", "text"],
  ["unlock_level", "해금 레벨", "number"],
  ["max_skp", "최대 SKP", "number"],
  ["base_effect_value", "기본 효과값", "number"],
  ["effect_coeff", "효과 계수", "number"],
  ["base_trigger_param", "기본 발동값", "number"],
  ["trigger_param_coeff", "발동 계수", "number"],
  ["mp_cost", "MP 비용", "number"],
  ["mp_cost_coeff", "MP 비용 계수", "number"],
  ["effect_code", "효과 코드", "text"],
  ["trigger_condition", "발동 조건", "text"],
  ["description", "설명", "text"],
]

export default function SkillDbPanel() {
  const [skillDb, setSkillDb] = useState<SkillDbRow[]>([])
  const [edits, setEdits] = useState<Record<string, SkillDbRow>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newSkill, setNewSkill] = useState<{ id: string } & Omit<SkillDbRow, "id">>({ id: "", ...EMPTY })
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const applyData = (data: { skills: SkillDbRow[] }) => {
    setSkillDb(data.skills)
    const map: Record<string, SkillDbRow> = {}
    data.skills.forEach((s) => { map[s.id] = { ...s } })
    setEdits(map)
  }

  const fetchAll = useCallback(async () => {
    try {
      applyData(await apiGet<{ skills: SkillDbRow[] }>("/api/skill-db"))
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const saveRow = async (id: string) => {
    setSavingId(id)
    try {
      applyData(await apiPut<{ skills: SkillDbRow[] }>("/api/skill-db", edits[id]))
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    } finally {
      setSavingId(null)
    }
  }

  const addRow = async () => {
    if (!newSkill.id.trim() || !newSkill.name.trim()) return
    setAdding(true)
    try {
      applyData(await apiPost<{ skills: SkillDbRow[] }>("/api/skill-db", newSkill))
      setNewSkill({ id: "", ...EMPTY })
      setShowAdd(false)
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    } finally {
      setAdding(false)
    }
  }

  const removeRow = async (id: string) => {
    setDeletingId(id)
    try {
      applyData(await apiDelete<{ skills: SkillDbRow[] }>(`/api/skill-db?id=${encodeURIComponent(id)}`))
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <SettingsSection title={<span className="flex items-center gap-2"><Database className="w-4 h-4 text-emerald-400" />스킬 DB 에디터</span>}>
      {skillDb.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">불러오는 중...</p>
      ) : (
        <div className="flex flex-col gap-2">
          {skillDb.map((skill) => {
            const edit = edits[skill.id] ?? skill
            const isExpanded = expanded[skill.id] ?? false
            const isDirty = JSON.stringify(edit) !== JSON.stringify(skill)
            return (
              <div key={skill.id} className={`rounded-xl border ${edit.is_active ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40" : "border-border bg-muted"}`}>
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <button
                    onClick={() => setExpanded((p) => ({ ...p, [skill.id]: !isExpanded }))}
                    className="flex-1 flex items-center gap-2 min-w-0 text-left"
                  >
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                    <span className="text-xs font-bold text-foreground truncate">{edit.name || skill.id}</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold flex-shrink-0">{edit.type}</span>
                    <span className="text-[9px] text-muted-foreground flex-shrink-0">Lv.{edit.unlock_level}</span>
                    {!edit.is_active && <span className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-500 rounded-full font-bold flex-shrink-0">비활성</span>}
                  </button>
                  {isDirty && (
                    <button
                      onClick={() => saveRow(skill.id)}
                      disabled={savingId === skill.id}
                      className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-emerald-500 text-white rounded-lg text-[10px] font-bold disabled:opacity-50 active:scale-95"
                    >
                      <Save className="w-3 h-3" />
                      {savingId === skill.id ? "..." : "저장"}
                    </button>
                  )}
                  <button
                    onClick={() => removeRow(skill.id)}
                    disabled={deletingId === skill.id}
                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg bg-red-50 text-red-400 active:scale-95 disabled:opacity-40"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                {isExpanded && (
                  <div className="border-t border-border px-3 py-3 flex flex-col gap-2">
                    {EDIT_FIELDS.map(([field, label, type]) => (
                      <div key={field} className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">{label}</span>
                        <input
                          type={type}
                          value={String(edit[field] ?? "")}
                          onChange={(e) => setEdits((p) => ({
                            ...p,
                            [skill.id]: { ...p[skill.id], [field]: type === "number" ? Number(e.target.value) : e.target.value },
                          }))}
                          className="flex-1 min-w-0 text-right text-[10px] font-bold bg-background border border-border rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-300"
                        />
                      </div>
                    ))}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground">활성화</span>
                      <button
                        onClick={() => setEdits((p) => ({
                          ...p,
                          [skill.id]: { ...p[skill.id], is_active: p[skill.id].is_active ? 0 : 1 },
                        }))}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold ${edit.is_active ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground border border-border"}`}
                      >
                        {edit.is_active ? "ON" : "OFF"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <button
        onClick={() => setShowAdd(!showAdd)}
        className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-emerald-300 text-emerald-600 rounded-xl text-xs font-bold active:scale-95"
      >
        <Plus className="w-3.5 h-3.5" />
        새 스킬 추가
      </button>
      {showAdd && (
        <div className="mt-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-3 flex flex-col gap-2">
          {([["id", "ID (고유값)", "text"], ...EDIT_FIELDS] as [string, string, string][]).map(([field, label, type]) => (
            <div key={field} className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground flex-shrink-0">{label}</span>
              <input
                type={type}
                value={String((newSkill as Record<string, unknown>)[field] ?? "")}
                onChange={(e) => setNewSkill((p) => ({
                  ...p,
                  [field]: type === "number" ? Number(e.target.value) : e.target.value,
                }))}
                className="flex-1 min-w-0 text-right text-[10px] font-bold bg-background border border-border rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
          ))}
          <button
            onClick={addRow}
            disabled={adding || !newSkill.id.trim() || !newSkill.name.trim()}
            className="mt-1 w-full flex items-center justify-center gap-2 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold disabled:opacity-40 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            {adding ? "추가 중..." : "추가"}
          </button>
        </div>
      )}
    </SettingsSection>
  )
}
