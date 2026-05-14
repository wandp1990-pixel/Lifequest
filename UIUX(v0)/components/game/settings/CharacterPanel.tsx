/**
 * @module components/game/settings/CharacterPanel
 * @purpose 캐릭터 수치(name, str/vit/dex/int/luk, stat/skill_points, level, total_exp, draw_tickets) 일괄 편집.
 *          PUT /api/character 로 저장 후 onCharUpdated 콜백.
 */

"use client"

import { useEffect, useState } from "react"
import { Save } from "lucide-react"
import SettingsSection from "./SettingsSection"
import { apiPut, ApiError } from "@/hooks/useApi"
import { useCharacterCtx } from "@/contexts/CharacterContext"

const CHAR_FIELDS = [
  { key: "str",          label: "STR (힘)" },
  { key: "vit",          label: "VIT (체력)" },
  { key: "dex",          label: "DEX (민첩)" },
  { key: "int_stat",     label: "INT (지력)" },
  { key: "luk",          label: "LUK (행운)" },
  { key: "stat_points",  label: "스탯 포인트" },
  { key: "skill_points", label: "스킬 포인트" },
  { key: "level",        label: "레벨" },
  { key: "total_exp",    label: "현재 EXP" },
  { key: "draw_tickets", label: "뽑기권" },
] as const

export default function CharacterPanel() {
  const { char, refetch } = useCharacterCtx()
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [nameEdit, setNameEdit] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!char) return
    const vals: Record<string, string> = {}
    CHAR_FIELDS.forEach((f) => {
      vals[f.key] = String((char as unknown as Record<string, unknown>)[f.key] ?? 0)
    })
    setEdits(vals)
    setNameEdit(char.name ?? "전사")
  }, [char])

  const save = async () => {
    setSaving(true)
    try {
      await apiPut("/api/character", { ...edits, name: nameEdit })
      refetch()
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsSection title="캐릭터 수치 편집">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
        <span className="text-sm text-muted-foreground">캐릭터명</span>
        <input
          type="text"
          value={nameEdit}
          onChange={(e) => setNameEdit(e.target.value)}
          maxLength={20}
          placeholder="전사"
          className="w-32 text-right text-sm font-bold bg-muted border border-border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-violet-300"
        />
      </div>
      <div className="flex flex-col gap-2.5">
        {CHAR_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{label}</span>
            <input
              type="number"
              value={edits[key] ?? "0"}
              onChange={(e) => setEdits((p) => ({ ...p, [key]: e.target.value }))}
              className="w-24 text-right text-sm font-bold bg-muted border border-border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-violet-300"
              min={0}
            />
          </div>
        ))}
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-violet-500 text-white rounded-xl text-sm font-bold disabled:opacity-50 active:scale-95"
      >
        <Save className="w-4 h-4" />
        {saving ? "저장 중..." : "일괄 저장"}
      </button>
    </SettingsSection>
  )
}
