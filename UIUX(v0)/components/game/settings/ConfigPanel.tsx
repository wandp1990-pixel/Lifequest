/**
 * @module components/game/settings/ConfigPanel
 * @purpose game_config 테이블 전체 일괄 편집 + 저장. PUT /api/config 를 row 별로 Promise.all.
 */

"use client"

import { useCallback, useEffect, useState } from "react"
import { Save } from "lucide-react"
import SettingsSection from "./SettingsSection"
import { apiGet, apiPut, ApiError } from "@/hooks/useApi"

interface ConfigRow {
  config_key: string
  config_value: string
  description: string
}

export default function ConfigPanel() {
  const [configs, setConfigs] = useState<ConfigRow[]>([])
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const fetchConfig = useCallback(async () => {
    try {
      const data = await apiGet<ConfigRow[]>("/api/config")
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
        apiPut("/api/config", { key: cfg.config_key, value: edits[cfg.config_key] })
      ))
      await fetchConfig()
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsSection title="게임 설정 에디터">
      {configs.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">불러오는 중...</p>
      ) : (
        <div className="rounded-xl overflow-hidden border border-border">
          {configs.map((cfg, i) => (
            <div
              key={cfg.config_key}
              className={`flex items-center gap-2 px-3 py-2.5 bg-background ${i < configs.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{cfg.config_key}</p>
                <p className="text-[10px] text-muted-foreground truncate">{cfg.description}</p>
              </div>
              <input
                type="text"
                value={edits[cfg.config_key] ?? cfg.config_value}
                onChange={(e) => setEdits((p) => ({ ...p, [cfg.config_key]: e.target.value }))}
                className="w-20 text-right text-xs font-bold bg-muted border border-border rounded-lg px-1.5 py-1 outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
          ))}
        </div>
      )}
      <button
        onClick={saveAll}
        disabled={saving || configs.length === 0}
        className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-violet-500 text-white rounded-xl text-sm font-bold disabled:opacity-50 active:scale-95"
      >
        <Save className="w-4 h-4" />
        {saving ? "저장 중..." : "일괄 저장"}
      </button>
    </SettingsSection>
  )
}
