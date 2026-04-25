"use client"

import { useState, useEffect, useCallback } from "react"
import { Edit3, Save, X, Send, ChevronDown, ChevronUp } from "lucide-react"

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

interface ActivityLog {
  id: number
  input_text: string
  input_type: string
  exp_gained: number
  ai_comment: string
  created_at: string
}

interface ConfigRow {
  config_key: string
  config_value: string
  description: string
}

interface HomeTabProps {
  char: CharacterData | null
  onCharUpdated: () => void
  onExpGained: () => void
}

const STATS = [
  { key: "str",      label: "STR", icon: "⚔️",  bar: "bg-red-400",    light: "bg-red-50",    text: "text-red-500" },
  { key: "vit",      label: "VIT", icon: "🛡️",  bar: "bg-green-400",  light: "bg-green-50",  text: "text-green-600" },
  { key: "dex",      label: "DEX", icon: "💨",  bar: "bg-yellow-400", light: "bg-yellow-50", text: "text-yellow-600" },
  { key: "int_stat", label: "INT", icon: "🔮",  bar: "bg-blue-400",   light: "bg-blue-50",   text: "text-blue-500" },
  { key: "luk",      label: "LUK", icon: "🍀",  bar: "bg-purple-400", light: "bg-purple-50", text: "text-purple-500" },
]

export default function HomeTab({ char, onCharUpdated, onExpGained }: HomeTabProps) {
  // 스탯 편집
  const [editMode, setEditMode] = useState(false)
  const [editVals, setEditVals] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // 활동 입력
  const [actText, setActText] = useState("")
  const [actSubmitting, setActSubmitting] = useState(false)
  const [actLogs, setActLogs] = useState<ActivityLog[]>([])
  const [actToast, setActToast] = useState<{ exp: number; comment: string } | null>(null)
  const [actError, setActError] = useState<string | null>(null)

  // 게임 설정 에디터
  const [showConfig, setShowConfig] = useState(false)
  const [configs, setConfigs] = useState<ConfigRow[]>([])
  const [configEdits, setConfigEdits] = useState<Record<string, string>>({})
  const [savingConfig, setSavingConfig] = useState<string | null>(null)

  const fetchActLogs = useCallback(async () => {
    const res = await fetch("/api/activities?type=ai&limit=5")
    if (res.ok) setActLogs(await res.json())
  }, [])

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
    fetchActLogs()
  }, [fetchActLogs])

  useEffect(() => {
    if (showConfig && configs.length === 0) fetchConfig()
  }, [showConfig, configs.length, fetchConfig])

  const enterEdit = () => {
    if (!char) return
    const vals: Record<string, string> = {}
    STATS.forEach((s) => { vals[s.key] = String(char[s.key as keyof CharacterData] ?? 0) })
    vals.stat_points = String(char.stat_points)
    vals.skill_points = String(char.skill_points)
    vals.level = String(char.level)
    vals.total_exp = String(char.total_exp)
    setEditVals(vals)
    setEditMode(true)
  }

  const saveStats = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/character", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editVals),
      })
      if (res.ok) {
        onCharUpdated()
        setEditMode(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const submitActivity = async () => {
    if (!actText.trim() || actSubmitting) return
    setActSubmitting(true)
    setActError(null)
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: actText }),
      })
      const data = await res.json()
      if (!res.ok) { setActError(data.error ?? "오류"); return }
      setActText("")
      setActToast({ exp: data.exp, comment: data.comment })
      setTimeout(() => setActToast(null), 3000)
      onExpGained()
      fetchActLogs()
    } finally {
      setActSubmitting(false)
    }
  }

  const saveConfig = async (key: string) => {
    setSavingConfig(key)
    try {
      await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: configEdits[key] }),
      })
    } finally {
      setSavingConfig(null)
    }
  }

  const getStatVal = (key: string) =>
    Number(char?.[key as keyof CharacterData] ?? 0)

  const barPct = (val: number) => Math.min(Math.round((val / 30) * 100), 100)

  if (!char) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-gray-400 text-sm">불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0 pb-6">

      {/* ── 캐릭터 스탯 카드 ─────────────────────────── */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        {/* 헤더 */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, #f0f9ff 0%, #e8f4fd 50%, #f3eeff 100%)" }}
        >
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Character</p>
            <p className="text-base font-black text-gray-800">Lv.{char.level} Hero</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400">스탯 포인트</p>
            <p className="text-lg font-black text-amber-500">{char.stat_points}</p>
          </div>
        </div>

        {/* 스탯 목록 */}
        <div className="bg-white px-4 py-3 flex flex-col gap-2.5">
          {STATS.map((s) => {
            const val = editMode ? Number(editVals[s.key] ?? 0) : getStatVal(s.key)
            const pct = barPct(val)
            return (
              <div key={s.key} className="flex items-center gap-2">
                <span className="text-sm w-5 flex-shrink-0">{s.icon}</span>
                <span className={`text-xs font-black w-7 flex-shrink-0 ${s.text}`}>{s.label}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${s.bar}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {editMode ? (
                  <input
                    type="number"
                    value={editVals[s.key] ?? "0"}
                    onChange={(e) => setEditVals((p) => ({ ...p, [s.key]: e.target.value }))}
                    className="w-14 text-right text-sm font-bold bg-gray-50 border border-gray-200 rounded-lg px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-violet-300"
                    min={0}
                  />
                ) : (
                  <span className="w-8 text-right text-sm font-black text-gray-700">{val}</span>
                )}
              </div>
            )
          })}

          {/* 포인트 행 */}
          {editMode ? (
            <div className="border-t border-gray-100 pt-2.5 flex flex-col gap-2">
              {[
                { k: "stat_points", label: "스탯 포인트", color: "text-amber-600" },
                { k: "skill_points", label: "스킬 포인트", color: "text-violet-600" },
                { k: "level", label: "레벨", color: "text-emerald-600" },
                { k: "total_exp", label: "현재 EXP", color: "text-blue-600" },
              ].map(({ k, label, color }) => (
                <div key={k} className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${color}`}>{label}</span>
                  <input
                    type="number"
                    value={editVals[k] ?? "0"}
                    onChange={(e) => setEditVals((p) => ({ ...p, [k]: e.target.value }))}
                    className="w-20 text-right text-sm font-bold bg-gray-50 border border-gray-200 rounded-lg px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-violet-300"
                    min={0}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="border-t border-gray-100 pt-2 flex justify-between text-xs">
              <span className="text-gray-400">스킬 포인트 <span className="font-bold text-violet-500">{char.skill_points}</span></span>
              <span className="text-gray-400">누적 태스크 <span className="font-bold text-emerald-500">{char.task_count}</span></span>
            </div>
          )}
        </div>

        {/* 편집 버튼 영역 */}
        <div className="bg-gray-50 px-4 py-2.5 flex justify-end gap-2 border-t border-gray-100">
          {editMode ? (
            <>
              <button
                onClick={() => setEditMode(false)}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-600 rounded-xl text-xs font-bold active:scale-95"
              >
                <X className="w-3 h-3" /> 취소
              </button>
              <button
                onClick={saveStats}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 bg-violet-500 text-white rounded-xl text-xs font-bold disabled:opacity-50 active:scale-95"
              >
                <Save className="w-3 h-3" /> {saving ? "저장 중..." : "저장"}
              </button>
            </>
          ) : (
            <button
              onClick={enterEdit}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-600 rounded-xl text-xs font-bold active:scale-95"
            >
              <Edit3 className="w-3 h-3" /> 수치 편집
            </button>
          )}
        </div>
      </div>

      {/* ── 오늘의 활동 입력 ──────────────────────────── */}
      <div className="mx-4 mt-4 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-2 bg-white">
          <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">✍️ 오늘의 활동</p>

          {actToast && (
            <div className="mb-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex justify-between items-center">
              <span className="text-sm font-black text-amber-600">+{actToast.exp} EXP!</span>
              <span className="text-xs text-amber-500">{actToast.comment}</span>
            </div>
          )}
          {actError && (
            <div className="mb-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <p className="text-xs text-red-600">{actError}</p>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={actText}
              onChange={(e) => setActText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitActivity()}
              placeholder="오늘 한 일을 입력하세요..."
              className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-300 transition"
              disabled={actSubmitting}
            />
            <button
              onClick={submitActivity}
              disabled={actSubmitting || !actText.trim()}
              className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center text-white disabled:opacity-40 active:scale-95 flex-shrink-0"
            >
              {actSubmitting ? (
                <span className="text-[9px] font-black animate-pulse">AI</span>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          {actSubmitting && (
            <p className="text-[11px] text-amber-400 mt-1.5 text-center animate-pulse">
              AI 게임 마스터가 판정 중...
            </p>
          )}
        </div>

        {/* 최근 활동 로그 */}
        {actLogs.length > 0 && (
          <div className="border-t border-gray-100">
            {actLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 px-4 py-2.5 border-b border-gray-50 last:border-0 bg-white">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700 truncate">{log.input_text}</p>
                  <p className="text-[10px] text-gray-400 leading-snug">{log.ai_comment}</p>
                </div>
                <span className="text-xs font-black text-amber-500 flex-shrink-0">+{log.exp_gained}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 게임 설정 에디터 ──────────────────────────── */}
      <button
        onClick={() => setShowConfig(!showConfig)}
        className="mx-4 mt-4 flex items-center justify-between px-4 py-3 bg-gray-50 rounded-2xl border border-gray-100 text-sm text-gray-600 font-bold"
      >
        <span className="flex items-center gap-2">
          <span>⚙️</span>
          <span>게임 설정 에디터</span>
          <span className="text-[10px] font-normal text-gray-400">({configs.length}개 항목)</span>
        </span>
        {showConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {showConfig && (
        <div className="mx-4 mt-1 rounded-2xl border border-gray-100 overflow-hidden bg-white">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
            <p className="text-[10px] text-gray-400">값 변경 후 각 행의 저장 버튼을 누르세요. 즉시 적용됩니다.</p>
          </div>
          {configs.map((cfg) => (
            <div key={cfg.config_key} className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-50 last:border-0">
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
              <button
                onClick={() => saveConfig(cfg.config_key)}
                disabled={
                  savingConfig === cfg.config_key ||
                  configEdits[cfg.config_key] === cfg.config_value
                }
                className="flex-shrink-0 px-2 py-1 bg-violet-100 text-violet-600 rounded-lg text-[10px] font-bold disabled:opacity-40 active:scale-95"
              >
                {savingConfig === cfg.config_key ? "..." : "저장"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
