"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Save, ChevronDown, ChevronRight, RotateCcw, FileText } from "lucide-react"

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

const RESET_VALUES = {
  level: "1", total_exp: "0", stat_points: "0", skill_points: "0", draw_tickets: "0",
  str: "0", vit: "0", dex: "0", int_stat: "0", luk: "0",
  current_hp: "100", max_hp: "100", current_mp: "50", max_mp: "50",
  clear_count: "0", task_count: "0",
}

export default function SettingsDrawer({ char, onCharUpdated, onClose }: SettingsDrawerProps) {
  const [charEdits, setCharEdits] = useState<Record<string, string>>({})
  const [charSaving, setCharSaving] = useState(false)
  const [showChar, setShowChar] = useState(false)

  const [configs, setConfigs] = useState<ConfigRow[]>([])
  const [configEdits, setConfigEdits] = useState<Record<string, string>>({})
  const [configSaving, setConfigSaving] = useState(false)
  const [showConfig, setShowConfig] = useState(false)

  const [promptContent, setPromptContent] = useState("")
  const [promptInput, setPromptInput] = useState("")
  const [showPrompt, setShowPrompt] = useState(false)
  const [savingPrompt, setSavingPrompt] = useState(false)
  const [promptSaved, setPromptSaved] = useState(false)

  const [showReset, setShowReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

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
    fetch("/api/prompt").then((r) => r.ok && r.json()).then((d) => {
      if (d) { setPromptContent(d.content ?? ""); setPromptInput(d.content ?? "") }
    })
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

  const savePrompt = async () => {
    setSavingPrompt(true)
    try {
      const res = await fetch("/api/prompt", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: promptInput }),
      })
      if (res.ok) {
        setPromptContent(promptInput)
        setPromptSaved(true)
        setTimeout(() => setPromptSaved(false), 2000)
      }
    } finally {
      setSavingPrompt(false)
    }
  }

  const resetCharacter = async () => {
    setResetting(true)
    try {
      const res = await fetch("/api/character", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(RESET_VALUES),
      })
      if (res.ok) {
        await fetch("/api/character", { method: "DELETE" })
        onCharUpdated()
        setConfirmReset(false)
        onClose()
      }
    } finally {
      setResetting(false)
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

          {/* AI 판정 프롬프트 */}
          <button
            onClick={() => setShowPrompt(!showPrompt)}
            className="w-full flex items-center justify-between px-4 py-3.5 border-b border-gray-100 active:bg-gray-50"
          >
            <span className="flex items-center gap-2 text-sm font-bold text-gray-700">
              <FileText className="w-4 h-4 text-violet-400" />
              AI 판정 프롬프트
            </span>
            {showPrompt ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </button>
          {showPrompt && (
            <div className="px-4 pt-3 pb-4">
              <textarea
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-violet-300 resize-none leading-relaxed"
                rows={10}
              />
              <div className="flex justify-between items-center mt-2">
                {promptSaved
                  ? <span className="text-[10px] text-violet-500 font-bold">저장 완료!</span>
                  : <span className="text-[10px] text-gray-400">재배포 후에도 유지됩니다</span>
                }
                <button
                  onClick={savePrompt}
                  disabled={savingPrompt || promptInput === promptContent}
                  className="flex items-center gap-1 px-3 py-1.5 bg-violet-500 text-white rounded-lg text-xs font-bold disabled:opacity-40 active:scale-95"
                >
                  <Save className="w-3 h-3" />
                  {savingPrompt ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          )}

          {/* 캐릭터 수치 편집 */}
          <button
            onClick={() => setShowChar(!showChar)}
            className="w-full flex items-center justify-between px-4 py-3.5 border-b border-gray-100 active:bg-gray-50"
          >
            <span className="text-sm font-bold text-gray-700">캐릭터 수치 편집</span>
            {showChar ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </button>
          {showChar && (
            <div className="px-4 pt-3 pb-4">
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
          )}

          {/* 게임 설정 에디터 */}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="w-full flex items-center justify-between px-4 py-3.5 border-b border-gray-100 active:bg-gray-50"
          >
            <span className="text-sm font-bold text-gray-700">게임 설정 에디터</span>
            {showConfig ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </button>
          {showConfig && (
            <div className="px-4 pt-3 pb-4">
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
          )}

          {/* 캐릭터 초기화 */}
          <button
            onClick={() => setShowReset(!showReset)}
            className="w-full flex items-center justify-between px-4 py-3.5 border-b border-gray-100 active:bg-gray-50"
          >
            <span className="text-sm font-bold text-red-500">캐릭터 초기화</span>
            {showReset ? <ChevronDown className="w-4 h-4 text-red-300" /> : <ChevronRight className="w-4 h-4 text-red-300" />}
          </button>
          {showReset && (
            <div className="px-4 pt-3 pb-4">
              <p className="text-xs text-gray-500 mb-3">레벨·스탯·EXP가 모두 초기화됩니다. 복구할 수 없습니다.</p>
              {!confirmReset ? (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-500 border border-red-200 rounded-xl text-sm font-bold active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  초기화
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold active:scale-95"
                  >
                    취소
                  </button>
                  <button
                    onClick={resetCharacter}
                    disabled={resetting}
                    className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold disabled:opacity-50 active:scale-95"
                  >
                    {resetting ? "초기화 중..." : "확인"}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  )
}
