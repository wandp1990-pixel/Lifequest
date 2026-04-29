"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Save, ChevronDown, ChevronRight, RotateCcw, FileText, Zap, Database, Plus, Trash2 } from "lucide-react"

interface CharacterData {
  name?: string
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

interface BattleConfigRow {
  config_key: string
  config_value: string
  label: string
  min_val: number
  max_val: number
  step: number
}

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

const EMPTY_SKILL_DB: Omit<SkillDbRow, "id"> = {
  name: "", type: "active", max_skp: 20, unlock_level: 1,
  base_effect_value: 0, effect_coeff: 0, base_trigger_param: 0,
  trigger_param_coeff: 0, mp_cost: 0, mp_cost_coeff: 0,
  effect_code: "", trigger_condition: "", description: "", is_active: 1,
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
  const [nameEdit, setNameEdit] = useState<string>("")
  const [charSaving, setCharSaving] = useState(false)
  const [showChar, setShowChar] = useState(false)

  const [skills, setSkills] = useState<SkillRow[]>([])
  const [skillEdits, setSkillEdits] = useState<Record<string, number>>({})
  const [skillSaving, setSkillSaving] = useState(false)
  const [showSkills, setShowSkills] = useState(false)

  const [configs, setConfigs] = useState<ConfigRow[]>([])
  const [configEdits, setConfigEdits] = useState<Record<string, string>>({})
  const [configSaving, setConfigSaving] = useState(false)
  const [showConfig, setShowConfig] = useState(false)

  const [battleConfigs, setBattleConfigs] = useState<BattleConfigRow[]>([])
  const [battleConfigEdits, setBattleConfigEdits] = useState<Record<string, string>>({})
  const [battleConfigSaving, setBattleConfigSaving] = useState(false)
  const [showBattleConfig, setShowBattleConfig] = useState(false)

  const [promptContent, setPromptContent] = useState("")
  const [promptInput, setPromptInput] = useState("")
  const [showPrompt, setShowPrompt] = useState(false)
  const [savingPrompt, setSavingPrompt] = useState(false)
  const [promptSaved, setPromptSaved] = useState(false)

  const [skillDb, setSkillDb] = useState<SkillDbRow[]>([])
  const [skillDbEdits, setSkillDbEdits] = useState<Record<string, SkillDbRow>>({})
  const [skillDbExpanded, setSkillDbExpanded] = useState<Record<string, boolean>>({})
  const [skillDbSaving, setSkillDbSaving] = useState<string | null>(null)
  const [showSkillDb, setShowSkillDb] = useState(false)
  const [showAddSkill, setShowAddSkill] = useState(false)
  const [newSkill, setNewSkill] = useState<{ id: string } & Omit<SkillDbRow, "id">>({ id: "", ...EMPTY_SKILL_DB })
  const [addingSkill, setAddingSkill] = useState(false)
  const [deletingSkill, setDeletingSkill] = useState<string | null>(null)

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
    setNameEdit(char.name ?? "전사")
  }, [char])

  const fetchSkills = useCallback(async () => {
    const res = await fetch("/api/skills")
    if (res.ok) {
      const data = await res.json()
      setSkills(data.skills)
      const map: Record<string, number> = {}
      data.skills.forEach((s: SkillRow) => { map[s.id] = s.invested })
      setSkillEdits(map)
    }
  }, [])

  const saveSkills = async () => {
    setSkillSaving(true)
    try {
      const res = await fetch("/api/skills", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investments: skillEdits }),
      })
      if (res.ok) {
        await fetchSkills()
        onCharUpdated()
      }
    } finally {
      setSkillSaving(false)
    }
  }

  const fetchSkillDb = useCallback(async () => {
    const res = await fetch("/api/skill-db")
    if (res.ok) {
      const data = await res.json()
      setSkillDb(data.skills)
      const map: Record<string, SkillDbRow> = {}
      data.skills.forEach((s: SkillDbRow) => { map[s.id] = { ...s } })
      setSkillDbEdits(map)
    }
  }, [])

  const saveSkillDbRow = async (id: string) => {
    setSkillDbSaving(id)
    try {
      const row = skillDbEdits[id]
      const res = await fetch("/api/skill-db", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      })
      if (res.ok) {
        const data = await res.json()
        setSkillDb(data.skills)
        const map: Record<string, SkillDbRow> = {}
        data.skills.forEach((s: SkillDbRow) => { map[s.id] = { ...s } })
        setSkillDbEdits(map)
      }
    } finally {
      setSkillDbSaving(null)
    }
  }

  const addSkillDb = async () => {
    if (!newSkill.id.trim() || !newSkill.name.trim()) return
    setAddingSkill(true)
    try {
      const res = await fetch("/api/skill-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSkill),
      })
      if (res.ok) {
        const data = await res.json()
        setSkillDb(data.skills)
        const map: Record<string, SkillDbRow> = {}
        data.skills.forEach((s: SkillDbRow) => { map[s.id] = { ...s } })
        setSkillDbEdits(map)
        setNewSkill({ id: "", ...EMPTY_SKILL_DB })
        setShowAddSkill(false)
      }
    } finally {
      setAddingSkill(false)
    }
  }

  const removeSkillDb = async (id: string) => {
    setDeletingSkill(id)
    try {
      const res = await fetch(`/api/skill-db?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      if (res.ok) {
        const data = await res.json()
        setSkillDb(data.skills)
        const map: Record<string, SkillDbRow> = {}
        data.skills.forEach((s: SkillDbRow) => { map[s.id] = { ...s } })
        setSkillDbEdits(map)
      }
    } finally {
      setDeletingSkill(null)
    }
  }

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

  const fetchBattleConfig = useCallback(async () => {
    const res = await fetch("/api/battle-config")
    if (res.ok) {
      const data: BattleConfigRow[] = await res.json()
      setBattleConfigs(data)
      const map: Record<string, string> = {}
      data.forEach((r) => { map[r.config_key] = r.config_value })
      setBattleConfigEdits(map)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
    fetchBattleConfig()
    fetchSkills()
    fetchSkillDb()
    fetch("/api/prompt").then((r) => r.ok && r.json()).then((d) => {
      if (d) { setPromptContent(d.content ?? ""); setPromptInput(d.content ?? "") }
    })
  }, [fetchConfig, fetchBattleConfig, fetchSkills, fetchSkillDb])

  const saveChar = async () => {
    setCharSaving(true)
    try {
      const res = await fetch("/api/character", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...charEdits, name: nameEdit }),
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

  const saveAllBattleConfigs = async () => {
    setBattleConfigSaving(true)
    try {
      await Promise.all(
        battleConfigs.map((cfg) =>
          fetch("/api/battle-config", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: cfg.config_key, value: battleConfigEdits[cfg.config_key] }),
          })
        )
      )
      await fetchBattleConfig()
    } finally {
      setBattleConfigSaving(false)
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
        setConfirmReset(false)
        onClose()
        window.location.reload()
      }
    } finally {
      setResetting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div
        className="fixed inset-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-background z-50 flex flex-col"
        style={{ maxHeight: "100dvh" }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <h2 className="text-base font-bold text-foreground">설정</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-muted active:scale-95">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-6">

          {/* AI 판정 프롬프트 */}
          <button
            onClick={() => setShowPrompt(!showPrompt)}
            className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border active:bg-muted"
          >
            <span className="flex items-center gap-2 text-sm font-bold text-foreground">
              <FileText className="w-4 h-4 text-violet-400" />
              AI 판정 프롬프트
            </span>
            {showPrompt ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showPrompt && (
            <div className="px-4 pt-3 pb-4">
              <textarea
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                className="w-full text-xs text-foreground bg-muted border border-border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-violet-300 resize-none leading-relaxed"
                rows={10}
              />
              <div className="flex justify-between items-center mt-2">
                {promptSaved
                  ? <span className="text-[10px] text-violet-500 font-bold">저장 완료!</span>
                  : <span className="text-[10px] text-muted-foreground">재배포 후에도 유지됩니다</span>
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
            className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border active:bg-muted"
          >
            <span className="text-sm font-bold text-foreground">캐릭터 수치 편집</span>
            {showChar ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showChar && (
            <div className="px-4 pt-3 pb-4">
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
                      value={charEdits[key] ?? "0"}
                      onChange={(e) => setCharEdits((p) => ({ ...p, [key]: e.target.value }))}
                      className="w-24 text-right text-sm font-bold bg-muted border border-border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-violet-300"
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

          {/* 스킬 편집 */}
          <button
            onClick={() => setShowSkills(!showSkills)}
            className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border active:bg-muted"
          >
            <span className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Zap className="w-4 h-4 text-yellow-400" />
              스킬 편집
            </span>
            {showSkills ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showSkills && (
            <div className="px-4 pt-3 pb-4">
              {skills.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">불러오는 중...</p>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between bg-yellow-50 rounded-xl px-3 py-2">
                    <span className="text-xs text-yellow-800 font-bold">잔여 스킬 포인트</span>
                    <span className="text-sm font-bold text-yellow-600">
                      {(char?.skill_points ?? 0) - Object.entries(skillEdits).reduce((acc, [id, pts]) => {
                        const orig = skills.find((s) => s.id === id)?.invested ?? 0
                        return acc + (pts - orig)
                      }, 0)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {skills.map((skill) => {
                      const current = skillEdits[skill.id] ?? skill.invested
                      const origInvested = skill.invested
                      const totalDelta = Object.entries(skillEdits).reduce((acc, [id, pts]) => {
                        const orig = skills.find((s) => s.id === id)?.invested ?? 0
                        return acc + (pts - orig)
                      }, 0)
                      const remaining = (char?.skill_points ?? 0) - totalDelta
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
                                onClick={() => setSkillEdits((p) => ({ ...p, [skill.id]: Math.max(0, current - 1) }))}
                                disabled={current <= 0}
                                className="w-6 h-6 flex items-center justify-center bg-background border border-border rounded-lg text-sm font-bold disabled:opacity-30 active:scale-95"
                              >−</button>
                              <span className="text-xs font-bold text-foreground w-10 text-center">{current}/{skill.max_skp}</span>
                              <button
                                onClick={() => setSkillEdits((p) => ({ ...p, [skill.id]: current + 1 }))}
                                disabled={!canAdd}
                                className="w-6 h-6 flex items-center justify-center bg-background border border-border rounded-lg text-sm font-bold disabled:opacity-30 active:scale-95"
                              >+</button>
                            </div>
                          </div>
                          {skill.max_skp > 0 && (
                            <div className="w-full h-1 bg-background rounded-full mt-1.5">
                              <div
                                className="h-1 bg-yellow-400 rounded-full transition-all"
                                style={{ width: `${(current / skill.max_skp) * 100}%` }}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <button
                    onClick={saveSkills}
                    disabled={skillSaving}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-yellow-500 text-white rounded-xl text-sm font-bold disabled:opacity-50 active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                    {skillSaving ? "저장 중..." : "일괄 저장"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* 스킬 DB 에디터 */}
          <button
            onClick={() => setShowSkillDb(!showSkillDb)}
            className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border active:bg-muted"
          >
            <span className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Database className="w-4 h-4 text-emerald-400" />
              스킬 DB 에디터
            </span>
            {showSkillDb ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showSkillDb && (
            <div className="px-4 pt-3 pb-4">
              {skillDb.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">불러오는 중...</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {skillDb.map((skill) => {
                    const edit = skillDbEdits[skill.id] ?? skill
                    const expanded = skillDbExpanded[skill.id] ?? false
                    const isDirty = JSON.stringify(edit) !== JSON.stringify(skill)
                    return (
                      <div key={skill.id} className={`rounded-xl border ${edit.is_active ? "border-emerald-200 bg-emerald-50" : "border-border bg-muted"}`}>
                        {/* 헤더 */}
                        <div className="flex items-center gap-2 px-3 py-2.5">
                          <button
                            onClick={() => setSkillDbExpanded((p) => ({ ...p, [skill.id]: !expanded }))}
                            className="flex-1 flex items-center gap-2 min-w-0 text-left"
                          >
                            {expanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                            <span className="text-xs font-bold text-foreground truncate">{edit.name || skill.id}</span>
                            <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold flex-shrink-0">{edit.type}</span>
                            <span className="text-[9px] text-muted-foreground flex-shrink-0">Lv.{edit.unlock_level}</span>
                            {!edit.is_active && <span className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-500 rounded-full font-bold flex-shrink-0">비활성</span>}
                          </button>
                          {isDirty && (
                            <button
                              onClick={() => saveSkillDbRow(skill.id)}
                              disabled={skillDbSaving === skill.id}
                              className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-emerald-500 text-white rounded-lg text-[10px] font-bold disabled:opacity-50 active:scale-95"
                            >
                              <Save className="w-3 h-3" />
                              {skillDbSaving === skill.id ? "..." : "저장"}
                            </button>
                          )}
                          <button
                            onClick={() => removeSkillDb(skill.id)}
                            disabled={deletingSkill === skill.id}
                            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg bg-red-50 text-red-400 active:scale-95 disabled:opacity-40"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        {/* 펼쳐진 편집 폼 */}
                        {expanded && (
                          <div className="border-t border-border px-3 py-3 flex flex-col gap-2">
                            {([
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
                            ] as [keyof SkillDbRow, string, string][]).map(([field, label, type]) => (
                              <div key={field} className="flex items-center justify-between gap-2">
                                <span className="text-[10px] text-muted-foreground flex-shrink-0">{label}</span>
                                <input
                                  type={type}
                                  value={String(edit[field] ?? "")}
                                  onChange={(e) => setSkillDbEdits((p) => ({
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
                                onClick={() => setSkillDbEdits((p) => ({
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

              {/* 새 스킬 추가 */}
              <button
                onClick={() => setShowAddSkill(!showAddSkill)}
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-emerald-300 text-emerald-600 rounded-xl text-xs font-bold active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                새 스킬 추가
              </button>
              {showAddSkill && (
                <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 flex flex-col gap-2">
                  {([
                    ["id", "ID (고유값)", "text"],
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
                  ] as [string, string, string][]).map(([field, label, type]) => (
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
                    onClick={addSkillDb}
                    disabled={addingSkill || !newSkill.id.trim() || !newSkill.name.trim()}
                    className="mt-1 w-full flex items-center justify-center gap-2 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold disabled:opacity-40 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {addingSkill ? "추가 중..." : "추가"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 게임 설정 에디터 */}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border active:bg-muted"
          >
            <span className="text-sm font-bold text-foreground">게임 설정 에디터</span>
            {showConfig ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showConfig && (
            <div className="px-4 pt-3 pb-4">
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
                        value={configEdits[cfg.config_key] ?? cfg.config_value}
                        onChange={(e) =>
                          setConfigEdits((p) => ({ ...p, [cfg.config_key]: e.target.value }))
                        }
                        className="w-20 text-right text-xs font-bold bg-muted border border-border rounded-lg px-1.5 py-1 outline-none focus:ring-2 focus:ring-violet-300"
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

          {/* 전투 설정 에디터 */}
          <button
            onClick={() => setShowBattleConfig(!showBattleConfig)}
            className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border active:bg-muted"
          >
            <span className="text-sm font-bold text-blue-600">전투 상수 에디터</span>
            {showBattleConfig ? <ChevronDown className="w-4 h-4 text-blue-300" /> : <ChevronRight className="w-4 h-4 text-blue-300" />}
          </button>
          {showBattleConfig && (
            <div className="px-4 pt-3 pb-4">
              {battleConfigs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">불러오는 중...</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {battleConfigs.map((cfg) => {
                    const isNumeric = cfg.step > 0
                    const val = battleConfigEdits[cfg.config_key] ?? cfg.config_value
                    const numVal = parseFloat(val)
                    return (
                      <div key={cfg.config_key} className="bg-blue-50 rounded-xl px-3 py-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-blue-800">{cfg.label}</span>
                          <input
                            type={isNumeric ? "number" : "text"}
                            value={val}
                            step={isNumeric ? cfg.step : undefined}
                            min={isNumeric ? cfg.min_val : undefined}
                            max={isNumeric ? cfg.max_val : undefined}
                            onChange={(e) =>
                              setBattleConfigEdits((p) => ({ ...p, [cfg.config_key]: e.target.value }))
                            }
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
                            onChange={(e) =>
                              setBattleConfigEdits((p) => ({ ...p, [cfg.config_key]: e.target.value }))
                            }
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
                onClick={saveAllBattleConfigs}
                disabled={battleConfigSaving || battleConfigs.length === 0}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-bold disabled:opacity-50 active:scale-95"
              >
                <Save className="w-4 h-4" />
                {battleConfigSaving ? "저장 중..." : "일괄 저장"}
              </button>
            </div>
          )}

          {/* 캐릭터 초기화 */}
          <button
            onClick={() => setShowReset(!showReset)}
            className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border active:bg-muted"
          >
            <span className="text-sm font-bold text-red-500">캐릭터 초기화</span>
            {showReset ? <ChevronDown className="w-4 h-4 text-red-300" /> : <ChevronRight className="w-4 h-4 text-red-300" />}
          </button>
          {showReset && (
            <div className="px-4 pt-3 pb-4">
              <p className="text-xs text-muted-foreground mb-3">레벨·스탯·EXP가 모두 초기화됩니다. 복구할 수 없습니다.</p>
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
                    className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-xl text-sm font-bold active:scale-95"
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
