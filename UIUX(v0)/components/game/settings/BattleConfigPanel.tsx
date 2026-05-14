/**
 * @module components/game/settings/BattleConfigPanel
 * @purpose battle_config (VIT→max_hp 등 수식 계수) 일괄 편집. step>0 이면 number+range, else text.
 *          vit_to_max_hp / int_to_max_mp 변경 시 max_hp/max_mp 재계산 위해 char.vit 재 PUT.
 */

"use client"

import { useCallback, useEffect, useState } from "react"
import { Save } from "lucide-react"
import SettingsSection from "./SettingsSection"
import { apiGet, apiPut, ApiError } from "@/hooks/useApi"
import { useCharacterCtx } from "@/contexts/CharacterContext"

interface BattleConfigRow {
  config_key: string
  config_value: string
  label: string
  min_val: number
  max_val: number
  step: number
}

export default function BattleConfigPanel() {
  const { char, refetch } = useCharacterCtx()
  const [configs, setConfigs] = useState<BattleConfigRow[]>([])
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const fetchConfig = useCallback(async () => {
    try {
      const data = await apiGet<BattleConfigRow[]>("/api/battle-config")
      setConfigs(data)
      const map: Record<string, string> = {}
      data.forEach((r) => { map[r.config_key] = r.config_value })
      setEdits(map)
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    }
  }, [])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  const saveAll = async () => {
    setSaving(true)
    try {
      await Promise.all(configs.map((cfg) =>
        apiPut("/api/battle-config", { key: cfg.config_key, value: edits[cfg.config_key] })
      ))
      // vit_to_max_hp / int_to_max_mp 변경이 max_hp/max_mp 에 반영되도록 재계산
      if (char) {
        await apiPut("/api/character", { vit: char.vit })
        refetch()
      }
      await fetchConfig()
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsSection title={<span className="text-blue-600">전투 상수 에디터</span>}>
      {configs.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">불러오는 중...</p>
      ) : (
        <div className="flex flex-col gap-3">
          {configs.map((cfg) => {
            const isNumeric = cfg.step > 0
            const val = edits[cfg.config_key] ?? cfg.config_value
            const numVal = parseFloat(val)
            return (
              <div key={cfg.config_key} className="bg-blue-50 dark:bg-blue-950/40 rounded-xl px-3 py-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-blue-800">{cfg.label}</span>
                  <input
                    type={isNumeric ? "number" : "text"}
                    value={val}
                    step={isNumeric ? cfg.step : undefined}
                    min={isNumeric ? cfg.min_val : undefined}
                    max={isNumeric ? cfg.max_val : undefined}
                    onChange={(e) => setEdits((p) => ({ ...p, [cfg.config_key]: e.target.value }))}
                    className="w-20 text-right text-xs font-bold bg-background border border-blue-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                {isNumeric && (
                  <input
                    type="range"
                    min={cfg.min_val}
                    max={cfg.max_val}
                    step={cfg.step}
                    value={isNaN(numVal) ? cfg.min_val : numVal}
                    onChange={(e) => setEdits((p) => ({ ...p, [cfg.config_key]: e.target.value }))}
                    className="w-full h-1.5 accent-blue-500"
                  />
                )}
                {isNumeric && (
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[10px] text-blue-400">{cfg.min_val}</span>
                    <span className="text-[10px] text-blue-400">{cfg.max_val}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      <button
        onClick={saveAll}
        disabled={saving || configs.length === 0}
        className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-bold disabled:opacity-50 active:scale-95"
      >
        <Save className="w-4 h-4" />
        {saving ? "저장 중..." : "일괄 저장"}
      </button>
    </SettingsSection>
  )
}
