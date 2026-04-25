"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Save } from "lucide-react"

interface CharacterData {
  level: number
  total_exp: number
  next_exp: number
  current_hp: number
  max_hp: number
  current_mp: number
  max_mp: number
  draw_tickets: number
  task_count: number
  stat_points: number
  skill_points: number
  str: number
  vit: number
  dex: number
  int_stat: number
  luk: number
}

interface ConfigRow {
  config_key: string
  config_value: string
  description: string
}

interface SettingsDrawerProps {
  char: CharacterData | null
  onCharUpdated: () => void
  onClose: () => void
}

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
]

export default function SettingsDrawer({ char, onCharUpdated, onClose }: SettingsDrawerProps) {
  const [charEdits, setCharEdits] = useState<Record<string, string>>({})
  const [charSaving, setCharSaving] = useState(false)

  const [configs, setConfigs] = useState<ConfigRow[]>([])
  const [configEdits, setConfigEdits] = useState<Record<string, string>>({})
  const [configSaving, setConfigSaving] = useState(false)

  useEffect(() => {
    if (!char) return
    const vals: Record<string, string> = {}
    CHAR_FIELDS.forEach((f) => {
      vals[f.key] = String(char[f.key as keyof CharacterData] ?? 0)
    })
    setCharEdits(vals)
  }, [char])

  const fetchConfig = useCallback(async () => {
    const res = await fetch("/api/config")
    if (res.ok) {
      const data: ConfigRow[] = await res.json()
      setConfigs(data)
      const map: Record<string, string> = {}
      data.forEach((r) => { map[r.config_key] = r.config_value })
      setConfigEdits(map)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const saveChar = async () => {
    setCharSaving(true)
    try {
      const res = await fetch("/api/character", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(charEdits),
      })
      if (res.ok) onCharUpdated()
    } finally {
      setCharSaving(false)
    }
  }

  const saveAllConfigs = async () => {
    setConfigSaving(true)
    try {
      await Promise.all(
        configs.map((cfg) =>
          fetch("/api/config", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: cfg.config_key, value: configEdits[cfg.config_key] }),
          })
        )
      )
      await fetchConfig()
    } finally {
      setConfigSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div
        className="fixed inset-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-white z-50 flex flex-col"
        style={{ maxHeight: "100dvh" }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-800">설정</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-gray-100 active:scale-95">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-6">
          {/* 캐릭터 수치 편집 */}
          <div className="px-4 pt-4 pb-3">
            <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-3">캐릭터 수치 편집</p>
            <div className="flex flex-col gap-2.5">
              {CHAR_FIELDS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{label}</span>
                  <input
                    type="number"
                    value={charEdits[key] ?? "0"}
                    onChange={(e) => setCharEdits((p) => ({ ...p, [key]: e.target.value }))}
                    className="w-24 text-right text-sm font-bold bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-violet-300"
                    min={0}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={saveChar}
              disabled={charSaving}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-violet-500 text-white rounded-xl text-sm font-bold disabled:opacity-50 active:scale-95"
            >
              <Save className="w-4 h-4" />
              {charSaving ? "저장 중..." : "일괄 저장"}
            </button>
          </div>

          <div className="h-px bg-gray-100 mx-4 my-1" />

          {/* 게임 설정 에디터 */}
          <div className="px-4 pt-3 pb-2">
            <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-3">게임 설정 에디터</p>
            {configs.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">불러오는 중...</p>
            ) : (
              <div className="rounded-xl overflow-hidden border border-gray-100">
                {configs.map((cfg, i) => (
                  <div
                    key={cfg.config_key}
                    className={`flex items-center gap-2 px-3 py-2.5 bg-white ${i < configs.length - 1 ? "border-b border-gray-50" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-700 truncate">{cfg.config_key}</p>
                      <p className="text-[10px] text-gray-400 truncate">{cfg.description}</p>
                    </div>
                    <input
                      type="text"
                      value={configEdits[cfg.config_key] ?? cfg.config_value}
                      onChange={(e) =>
                        setConfigEdits((p) => ({ ...p, [cfg.config_key]: e.target.value }))
                      }
                      className="w-20 text-right text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg px-1.5 py-1 outline-none focus:ring-2 focus:ring-violet-300"
                    />
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={saveAllConfigs}
              disabled={configSaving || configs.length === 0}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-violet-500 text-white rounded-xl text-sm font-bold disabled:opacity-50 active:scale-95"
            >
              <Save className="w-4 h-4" />
              {configSaving ? "저장 중..." : "일괄 저장"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
