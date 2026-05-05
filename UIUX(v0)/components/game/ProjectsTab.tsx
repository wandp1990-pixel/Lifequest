"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, X, Trash2, CheckCircle2, Circle, ChevronDown, ChevronRight, Sparkles, BookOpen, Trophy } from "lucide-react"

interface ProjectTask {
  id: number
  project_id: number
  name: string
  is_completed: number
  exp_reward: number
  sort_order: number
  created_at: string
  completed_at: string | null
}

interface Project {
  id: number
  name: string
  description: string | null
  status: "todo" | "in_progress" | "done"
  priority: "low" | "medium" | "high"
  bonus_exp: number
  due_date: string | null
  color: string
  chapter_id: number | null
  created_at: string
  completed_at: string | null
  tasks: ProjectTask[]
  progress: number
}

interface Chapter {
  id: number
  name: string
  start_date: string | null
  end_date: string | null
  bonus_tickets: number
  status: "active" | "done"
  total_projects: number
  done_projects: number
}

interface ProjectsTabProps {
  onExpGained?: () => void
  refreshTick?: number
}

const PRIORITY_LABEL: Record<string, string> = { high: "높음", medium: "보통", low: "낮음" }
const PRIORITY_COLOR: Record<string, string> = {
  high: "text-red-400 bg-red-400/10",
  medium: "text-yellow-400 bg-yellow-400/10",
  low: "text-slate-400 bg-slate-400/10",
}
const STATUS_LABEL: Record<string, string> = { todo: "시작 전", in_progress: "진행 중", done: "완료" }
const COLOR_OPTIONS = [
  { value: "violet",  label: "보라",  cls: "bg-violet-500" },
  { value: "blue",    label: "파랑",  cls: "bg-blue-500" },
  { value: "emerald", label: "초록",  cls: "bg-emerald-500" },
  { value: "amber",   label: "노랑",  cls: "bg-amber-500" },
  { value: "rose",    label: "빨강",  cls: "bg-rose-500" },
]
const COLOR_CLS: Record<string, string> = {
  violet: "bg-violet-500", blue: "bg-blue-500", emerald: "bg-emerald-500",
  amber: "bg-amber-500", rose: "bg-rose-500",
}

function formatDate(d: string | null): string | null {
  if (!d) return null
  return new Date(d).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
}

function isDueSoon(due: string | null): boolean {
  if (!due) return false
  const diff = new Date(due).getTime() - Date.now()
  return diff < 3 * 24 * 60 * 60 * 1000
}

export default function ProjectsTab({ onExpGained, refreshTick }: ProjectsTabProps) {
  const [projects,  setProjects]  = useState<Project[]>([])
  const [chapters,  setChapters]  = useState<Chapter[]>([])
  const [loading,   setLoading]   = useState(true)
  const [adding,    setAdding]    = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [toast,     setToast]     = useState<{ msg: string; exp?: number } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null)

  // 새 프로젝트 폼
  const [newName,      setNewName]      = useState("")
  const [newDesc,      setNewDesc]      = useState("")
  const [newPriority,  setNewPriority]  = useState<"low" | "medium" | "high">("medium")
  const [newBonusExp,  setNewBonusExp]  = useState(100)
  const [newDueDate,   setNewDueDate]   = useState("")
  const [newColor,     setNewColor]     = useState("violet")
  const [newChapterId, setNewChapterId] = useState<number | null>(null)
  const [defaultTaskExp, setDefaultTaskExp] = useState(20)

  // AI 판정
  const [aiJudging, setAiJudging] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<{ bonus_exp: number; task_exp: number; comment: string } | null>(null)

  // 하위 작업 추가
  const [addingTaskFor, setAddingTaskFor] = useState<number | null>(null)
  const [newTaskName,   setNewTaskName]   = useState("")
  const [newTaskExp,    setNewTaskExp]    = useState(20)
  const [completing,    setCompleting]    = useState<number | null>(null)

  // 챕터 UI
  const [chapterExpanded, setChapterExpanded] = useState(false)
  const [addingChapter,   setAddingChapter]   = useState(false)
  const [chName,          setChName]          = useState("")
  const [chEnd,           setChEnd]           = useState("")
  const [chTickets,       setChTickets]       = useState(3)
  const [completingChapter, setCompletingChapter] = useState<number | null>(null)

  const fetchAll = useCallback(async () => {
    const [pRes, cRes] = await Promise.all([
      fetch("/api/projects"),
      fetch("/api/chapters"),
    ])
    if (pRes.ok) {
      const data = await pRes.json()
      setProjects(data.projects ?? [])
    }
    if (cRes.ok) {
      const data = await cRes.json()
      setChapters(data.chapters ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll, refreshTick])

  const showToast = (msg: string, exp?: number) => {
    setToast({ msg, exp })
    setTimeout(() => setToast(null), 3000)
  }

  // ── AI 판정 ───────────────────────────────────────────
  const handleAiJudge = async () => {
    if (!newName.trim() || aiJudging) return
    setAiJudging(true)
    setAiSuggestion(null)
    try {
      const res = await fetch("/api/projects/ai-judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDesc, priority: newPriority }),
      })
      if (res.ok) {
        const data = await res.json()
        setAiSuggestion(data)
        setNewBonusExp(data.bonus_exp)
        setDefaultTaskExp(data.task_exp)
        setNewTaskExp(data.task_exp)
      }
    } finally {
      setAiJudging(false)
    }
  }

  // ── 프로젝트 CRUD ─────────────────────────────────────
  const handleAddProject = async () => {
    if (!newName.trim()) return
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(), description: newDesc, priority: newPriority,
        bonus_exp: newBonusExp, due_date: newDueDate || null, color: newColor,
        chapter_id: newChapterId,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setProjects(data.projects ?? [])
      await fetchAll()
      setAdding(false)
      setNewName(""); setNewDesc(""); setNewPriority("medium")
      setNewBonusExp(100); setNewDueDate(""); setNewColor("violet")
      setNewChapterId(null); setAiSuggestion(null); setDefaultTaskExp(20)
    }
  }

  const handleAddTask = async (projectId: number) => {
    if (!newTaskName.trim()) return
    const res = await fetch(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTaskName.trim(), exp_reward: newTaskExp }),
    })
    if (res.ok) {
      const data = await res.json()
      setProjects(data.projects ?? [])
      setAddingTaskFor(null); setNewTaskName(""); setNewTaskExp(defaultTaskExp)
    }
  }

  const handleCompleteTask = async (projectId: number, taskId: number) => {
    if (completing !== null) return
    setCompleting(taskId)
    const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, { method: "PATCH" })
    if (res.ok) {
      const data = await res.json()
      setProjects(data.projects ?? [])
      await fetchAll()
      if (data.projectCompleted) showToast(`프로젝트 완료! 보너스 +${data.bonusExp}XP`, data.bonusExp)
      else showToast(`+${data.exp}XP`, data.exp)
      onExpGained?.()
    }
    setCompleting(null)
  }

  const handleDeleteTask = async (projectId: number, taskId: number) => {
    const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, { method: "DELETE" })
    if (res.ok) setProjects((await res.json()).projects ?? [])
  }

  const handleDeleteProject = async (id: number) => {
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" })
    if (res.ok) {
      setProjects((await res.json()).projects ?? [])
      await fetchAll()
    }
    setConfirmDelete(null)
  }

  const handleStatusChange = async (id: number, status: "todo" | "in_progress" | "done") => {
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const data = await res.json()
      setProjects(data.projects ?? [])
      await fetchAll()
      if (status === "done" && data.bonusExp > 0) {
        showToast(`프로젝트 완료! +${data.bonusExp}XP`, data.bonusExp)
        onExpGained?.()
      }
    }
  }

  // ── 챕터 CRUD ─────────────────────────────────────────
  const handleAddChapter = async () => {
    if (!chName.trim()) return
    const res = await fetch("/api/chapters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: chName.trim(), end_date: chEnd || null, bonus_tickets: chTickets }),
    })
    if (res.ok) {
      const data = await res.json()
      setChapters(data.chapters ?? [])
      setAddingChapter(false); setChName(""); setChEnd(""); setChTickets(3)
    }
  }

  const handleCompleteChapter = async (ch: Chapter) => {
    if (completingChapter !== null) return
    setCompletingChapter(ch.id)
    const res = await fetch(`/api/chapters/${ch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", bonus_tickets: ch.bonus_tickets }),
    })
    if (res.ok) {
      const data = await res.json()
      setChapters(data.chapters ?? [])
      showToast(`챕터 완료! 뽑기권 +${data.ticketsAwarded}`)
      onExpGained?.()
    }
    setCompletingChapter(null)
  }

  const handleDeleteChapter = async (id: number) => {
    const res = await fetch(`/api/chapters/${id}`, { method: "DELETE" })
    if (res.ok) {
      const data = await res.json()
      setChapters(data.chapters ?? [])
      await fetchAll()
    }
  }

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const grouped = {
    in_progress: projects.filter((p) => p.status === "in_progress"),
    todo:        projects.filter((p) => p.status === "todo"),
    done:        projects.filter((p) => p.status === "done"),
  }

  const activeChapters = chapters.filter((c) => c.status === "active")

  // ── 프로젝트 카드 렌더 ────────────────────────────────
  const renderProject = (project: Project) => {
    const expanded = expandedIds.has(project.id)
    const dueSoon  = isDueSoon(project.due_date) && project.status !== "done"
    const dueLabel = formatDate(project.due_date)
    const chapter  = chapters.find((c) => c.id === project.chapter_id)

    return (
      <div key={project.id} className="rounded-xl border border-border bg-card overflow-hidden">
        <div
          className="flex items-start gap-3 p-3 cursor-pointer active:bg-muted/40 transition-colors"
          onClick={() => toggleExpand(project.id)}
        >
          <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${COLOR_CLS[project.color] ?? "bg-violet-500"}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-bold ${project.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                {project.name}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[project.priority]}`}>
                {PRIORITY_LABEL[project.priority]}
              </span>
              {dueLabel && (
                <span className={`text-[10px] ${dueSoon ? "text-red-400 font-bold" : "text-muted-foreground"}`}>
                  {dueSoon ? "⚠ " : ""}{dueLabel}
                </span>
              )}
              {chapter && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400">
                  {chapter.name}
                </span>
              )}
            </div>
            {project.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{project.description}</p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${project.status === "done" ? "bg-emerald-500" : COLOR_CLS[project.color] ?? "bg-violet-500"}`}
                  style={{ width: `${project.progress}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {project.tasks.filter((t) => t.is_completed).length}/{project.tasks.length}
              </span>
            </div>
          </div>
          <div className="shrink-0">
            {expanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
          </div>
        </div>

        {expanded && (
          <div className="border-t border-border px-3 pb-3 pt-2 space-y-2">
            <div className="flex gap-1 flex-wrap">
              {(["todo", "in_progress", "done"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(project.id, s)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                    project.status === s
                      ? "bg-violet-500 text-white border-violet-500"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
              <div className="flex-1" />
              <button onClick={() => setConfirmDelete({ id: project.id, name: project.name })} className="text-[10px] text-red-400 px-1">
                <Trash2 size={12} />
              </button>
            </div>

            {project.bonus_exp > 0 && (
              <div className="text-[11px] text-muted-foreground">
                완료 보너스: <span className="text-amber-400 font-bold">+{project.bonus_exp}XP</span>
              </div>
            )}

            <div className="space-y-1.5">
              {project.tasks.map((task) => (
                <div key={task.id} className={`flex items-center gap-2 py-1 ${task.is_completed ? "opacity-50" : ""}`}>
                  <button
                    onClick={() => !task.is_completed && handleCompleteTask(project.id, task.id)}
                    disabled={!!task.is_completed || completing === task.id}
                    className="shrink-0"
                  >
                    {task.is_completed ? (
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    ) : completing === task.id ? (
                      <Circle size={16} className="text-muted-foreground animate-pulse" />
                    ) : (
                      <Circle size={16} className="text-muted-foreground" />
                    )}
                  </button>
                  <span className={`flex-1 text-xs ${task.is_completed ? "line-through" : ""}`}>{task.name}</span>
                  <span className="text-[10px] text-amber-400 shrink-0">+{task.exp_reward}XP</span>
                  {!task.is_completed && (
                    <button onClick={() => handleDeleteTask(project.id, task.id)} className="text-muted-foreground shrink-0">
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {addingTaskFor === project.id ? (
              <div className="flex flex-col gap-1.5 mt-1">
                <input
                  autoFocus
                  className="w-full text-xs bg-muted border border-border rounded-lg px-3 py-1.5 outline-none focus:border-violet-500"
                  placeholder="작업 이름"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddTask(project.id)
                    if (e.key === "Escape") { setAddingTaskFor(null); setNewTaskName("") }
                  }}
                />
                <div className="flex gap-2 items-center">
                  <span className="text-[11px] text-muted-foreground shrink-0">EXP</span>
                  <input
                    type="number" min={1} max={500}
                    className="w-20 text-xs bg-muted border border-border rounded-lg px-2 py-1 outline-none focus:border-violet-500"
                    value={newTaskExp}
                    onChange={(e) => setNewTaskExp(Number(e.target.value))}
                  />
                  <button onClick={() => handleAddTask(project.id)} className="flex-1 py-1 text-xs bg-violet-500 text-white rounded-lg font-bold">추가</button>
                  <button onClick={() => { setAddingTaskFor(null); setNewTaskName("") }} className="text-muted-foreground"><X size={14} /></button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setAddingTaskFor(project.id); setNewTaskName(""); setNewTaskExp(defaultTaskExp) }}
                className="flex items-center gap-1 text-xs text-muted-foreground mt-1"
                disabled={project.status === "done"}
              >
                <Plus size={12} /> 작업 추가
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return <div className="flex justify-center items-center py-10 text-muted-foreground text-sm">불러오는 중...</div>
  }

  return (
    <div className="px-4 pb-4 space-y-4">

      {/* ── 챕터 섹션 ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <button
          className="w-full flex items-center gap-2 px-3 py-2.5 active:bg-muted/40 transition-colors"
          onClick={() => setChapterExpanded((v) => !v)}
        >
          <BookOpen size={14} className="text-violet-400" />
          <span className="text-xs font-bold text-violet-400">챕터</span>
          <span className="text-xs text-muted-foreground ml-1">{activeChapters.length}개 진행 중</span>
          <div className="flex-1" />
          {chapterExpanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
        </button>

        {chapterExpanded && (
          <div className="border-t border-border px-3 pb-3 pt-2 space-y-3">
            {chapters.length === 0 && !addingChapter && (
              <p className="text-xs text-muted-foreground text-center py-2">챕터가 없습니다</p>
            )}

            {chapters.map((ch) => {
              const pct = ch.total_projects === 0 ? 0 : Math.round((ch.done_projects / ch.total_projects) * 100)
              const allDone = ch.total_projects > 0 && ch.done_projects === ch.total_projects
              return (
                <div key={ch.id} className={`rounded-lg border p-3 space-y-2 ${ch.status === "done" ? "border-emerald-500/30 bg-emerald-500/5" : "border-border"}`}>
                  <div className="flex items-center gap-2">
                    {ch.status === "done" ? <Trophy size={13} className="text-emerald-500 shrink-0" /> : <BookOpen size={13} className="text-violet-400 shrink-0" />}
                    <span className={`text-xs font-bold flex-1 ${ch.status === "done" ? "line-through text-muted-foreground" : ""}`}>{ch.name}</span>
                    {ch.end_date && (
                      <span className="text-[10px] text-muted-foreground">{formatDate(ch.end_date)}</span>
                    )}
                    <button onClick={() => handleDeleteChapter(ch.id)} className="text-muted-foreground ml-1">
                      <X size={12} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${ch.status === "done" ? "bg-emerald-500" : "bg-violet-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{ch.done_projects}/{ch.total_projects}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      완료 보상: <span className="text-violet-400 font-bold">뽑기권 +{ch.bonus_tickets}</span>
                    </span>
                    {ch.status === "active" && (
                      <button
                        onClick={() => handleCompleteChapter(ch)}
                        disabled={!allDone || completingChapter === ch.id}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-all ${
                          allDone
                            ? "bg-emerald-500 text-white active:scale-95"
                            : "bg-muted text-muted-foreground opacity-50"
                        }`}
                      >
                        {completingChapter === ch.id ? "..." : "챕터 완료"}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {addingChapter ? (
              <div className="space-y-2 border border-border rounded-lg p-2">
                <input
                  autoFocus
                  className="w-full text-xs bg-muted border border-border rounded-lg px-3 py-1.5 outline-none focus:border-violet-500"
                  placeholder="챕터 이름 *"
                  value={chName}
                  onChange={(e) => setChName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddChapter()}
                />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[11px] text-muted-foreground block mb-1">마감일</label>
                    <input
                      type="date"
                      className="w-full text-xs bg-muted border border-border rounded-lg px-2 py-1.5 outline-none"
                      value={chEnd}
                      onChange={(e) => setChEnd(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] text-muted-foreground block mb-1">보상 뽑기권</label>
                    <input
                      type="number" min={1} max={30}
                      className="w-full text-xs bg-muted border border-border rounded-lg px-2 py-1.5 outline-none"
                      value={chTickets}
                      onChange={(e) => setChTickets(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddChapter} disabled={!chName.trim()} className="flex-1 py-1.5 text-xs bg-violet-500 text-white rounded-lg font-bold disabled:opacity-40">추가</button>
                  <button onClick={() => setAddingChapter(false)} className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground">취소</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingChapter(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground"
              >
                <Plus size={12} /> 새 챕터 추가
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── 새 프로젝트 추가 ── */}
      <div>
        {adding ? (
          <div className="border border-border rounded-xl p-3 space-y-2 bg-card">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold">새 프로젝트</span>
              <button onClick={() => { setAdding(false); setAiSuggestion(null) }}><X size={16} className="text-muted-foreground" /></button>
            </div>

            <input
              autoFocus
              className="w-full text-sm bg-muted border border-border rounded-lg px-3 py-2 outline-none focus:border-violet-500"
              placeholder="프로젝트 이름 *"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              className="w-full text-xs bg-muted border border-border rounded-lg px-3 py-2 outline-none focus:border-violet-500"
              placeholder="설명 (선택)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[11px] text-muted-foreground block mb-1">우선순위</label>
                <select
                  className="w-full text-xs bg-muted border border-border rounded-lg px-2 py-1.5 outline-none"
                  value={newPriority}
                  onChange={(e) => { setNewPriority(e.target.value as "low" | "medium" | "high"); setAiSuggestion(null) }}
                >
                  <option value="high">높음</option>
                  <option value="medium">보통</option>
                  <option value="low">낮음</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-[11px] text-muted-foreground block mb-1">마감일</label>
                <input
                  type="date"
                  className="w-full text-xs bg-muted border border-border rounded-lg px-2 py-1.5 outline-none"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
              </div>
            </div>

            {/* AI 추천 버튼 */}
            <button
              onClick={handleAiJudge}
              disabled={!newName.trim() || aiJudging}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs rounded-lg border border-violet-500/40 text-violet-400 font-bold active:bg-violet-500/10 disabled:opacity-40 transition-colors"
            >
              <Sparkles size={13} />
              {aiJudging ? "AI 판정 중..." : "AI EXP 추천 받기"}
            </button>

            {aiSuggestion && (
              <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 px-3 py-2 space-y-0.5">
                <div className="flex items-center gap-1">
                  <Sparkles size={11} className="text-violet-400" />
                  <span className="text-[11px] font-bold text-violet-400">AI 추천</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{aiSuggestion.comment}</p>
                <p className="text-[11px] text-violet-300">
                  완료 보너스 <span className="font-bold text-amber-400">{aiSuggestion.bonus_exp} XP</span> · 작업당 <span className="font-bold text-amber-400">{aiSuggestion.task_exp} XP</span>
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[11px] text-muted-foreground block mb-1">완료 보너스 EXP</label>
                <input
                  type="number" min={0} max={9999}
                  className="w-full text-xs bg-muted border border-border rounded-lg px-2 py-1.5 outline-none"
                  value={newBonusExp}
                  onChange={(e) => setNewBonusExp(Number(e.target.value))}
                />
              </div>
              <div className="flex-1">
                <label className="text-[11px] text-muted-foreground block mb-1">챕터 연결</label>
                <select
                  className="w-full text-xs bg-muted border border-border rounded-lg px-2 py-1.5 outline-none"
                  value={newChapterId ?? ""}
                  onChange={(e) => setNewChapterId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">없음</option>
                  {activeChapters.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">색상</label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setNewColor(c.value)}
                    className={`w-6 h-6 rounded-full ${c.cls} ${newColor === c.value ? "ring-2 ring-white ring-offset-1 ring-offset-background" : ""}`}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={handleAddProject}
              disabled={!newName.trim()}
              className="w-full py-2 text-sm bg-violet-500 text-white rounded-xl font-bold disabled:opacity-40"
            >
              프로젝트 생성
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 w-full py-2.5 px-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-violet-500 hover:text-violet-400 transition-colors"
          >
            <Plus size={15} /> 새 프로젝트 추가
          </button>
        )}
      </div>

      {/* ── 프로젝트 목록 ── */}
      {grouped.in_progress.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-violet-400">진행 중</span>
            <span className="text-xs text-muted-foreground">{grouped.in_progress.length}</span>
          </div>
          {grouped.in_progress.map(renderProject)}
        </div>
      )}

      {grouped.todo.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">시작 전</span>
            <span className="text-xs text-muted-foreground">{grouped.todo.length}</span>
          </div>
          {grouped.todo.map(renderProject)}
        </div>
      )}

      {grouped.done.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-500">완료</span>
            <span className="text-xs text-muted-foreground">{grouped.done.length}</span>
          </div>
          {grouped.done.map(renderProject)}
        </div>
      )}

      {projects.length === 0 && !adding && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <p className="text-2xl mb-2">📋</p>
          <p>프로젝트가 없습니다</p>
          <p className="text-xs mt-1">연계 퀘스트를 만들어 목표를 달성하세요!</p>
        </div>
      )}

      {/* ── 삭제 확인 ── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold mb-1">프로젝트 삭제</p>
            <p className="text-xs text-muted-foreground mb-4">&quot;{confirmDelete.name}&quot;과 모든 하위 작업이 삭제됩니다.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 rounded-xl border border-border text-sm">취소</button>
              <button onClick={() => handleDeleteProject(confirmDelete.id)} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-bold">삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 토스트 ── */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-full px-4 py-2 text-xs font-bold shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {toast.msg}
        </div>
      )}
    </div>
  )
}
