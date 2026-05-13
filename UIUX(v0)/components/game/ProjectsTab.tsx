"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, X, Trash2, CheckCircle2, Circle, ChevronDown, ChevronRight, BookOpen, Trophy, FolderPlus } from "lucide-react"

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
  const [newDueDate,   setNewDueDate]   = useState("")
  const [newColor,     setNewColor]     = useState("violet")
  const [newChapterId, setNewChapterId] = useState<number | null>(null)

  // 하위 작업 추가
  const [addingTaskFor, setAddingTaskFor] = useState<number | null>(null)
  const [newTaskName,   setNewTaskName]   = useState("")
  const [completing,    setCompleting]    = useState<number | null>(null)

  // 프로젝트 카드 내 챕터 편집
  const [editingChapterFor, setEditingChapterFor] = useState<number | null>(null)

  // 묶음(챕터) 관련
  const [addingBundle,      setAddingBundle]      = useState(false)
  const [chName,            setChName]            = useState("")
  const [chEnd,             setChEnd]             = useState("")
  const [chTickets,         setChTickets]         = useState(3)
  const [completingChapter, setCompletingChapter] = useState<number | null>(null)
  const [expandedChapters,  setExpandedChapters]  = useState<Set<number>>(new Set())

  // 묶음 안에서 새 프로젝트 생성
  const [addingProjectToChapter,  setAddingProjectToChapter]  = useState<number | null>(null)
  const [chapterNewProjName,      setChapterNewProjName]      = useState("")
  const [chapterNewProjPriority,  setChapterNewProjPriority]  = useState<"low" | "medium" | "high">("medium")

  // 기존 프로젝트를 묶음에 할당
  const [assigningToChapter, setAssigningToChapter] = useState<number | null>(null)
  const [assignProjectIds,   setAssignProjectIds]   = useState<number[]>([])

  // 완료된 것들 표시 토글
  const [showDone, setShowDone] = useState(false)

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

  // ── 프로젝트 CRUD ─────────────────────────────────────
  const handleAddProject = async () => {
    if (!newName.trim()) return
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(), description: newDesc, priority: newPriority,
        due_date: newDueDate || null, color: newColor, chapter_id: newChapterId,
      }),
    })
    if (res.ok) {
      await fetchAll()
      setAdding(false)
      setNewName(""); setNewDesc(""); setNewPriority("medium")
      setNewDueDate(""); setNewColor("violet"); setNewChapterId(null)
    }
  }

  const handleAddTask = async (projectId: number) => {
    if (!newTaskName.trim()) return
    const res = await fetch(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTaskName.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      setProjects(data.projects ?? [])
      setAddingTaskFor(null); setNewTaskName("")
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

  const handleChapterChange = async (id: number, chapterId: number | null) => {
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapter_id: chapterId }),
    })
    if (res.ok) {
      const data = await res.json()
      setProjects(data.projects ?? [])
      await fetchAll()
    }
    setEditingChapterFor(null)
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
      const newest = (data.chapters ?? []).at(-1)
      if (newest) setExpandedChapters((prev) => new Set([...prev, newest.id]))
      setAddingBundle(false); setChName(""); setChEnd(""); setChTickets(3)
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

  // ── 묶음 안 새 프로젝트 생성 ─────────────────────────
  const handleAddProjectInChapter = async (chapterId: number) => {
    if (!chapterNewProjName.trim()) return
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: chapterNewProjName.trim(),
        description: "",
        priority: chapterNewProjPriority,
        due_date: null,
        color: "violet",
        chapter_id: chapterId,
      }),
    })
    if (res.ok) {
      await fetchAll()
      setAddingProjectToChapter(null)
      setChapterNewProjName("")
      setChapterNewProjPriority("medium")
    }
  }

  // ── 기존 프로젝트를 묶음에 할당 ──────────────────────
  const handleAssignProjectsToChapter = async (chapterId: number) => {
    if (assignProjectIds.length === 0) return
    await Promise.all(
      assignProjectIds.map((pid) =>
        fetch(`/api/projects/${pid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chapter_id: chapterId }),
        })
      )
    )
    await fetchAll()
    setAssigningToChapter(null)
    setAssignProjectIds([])
  }

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleChapter = (id: number) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // 해당 챕터에 추가 가능한 프로젝트 (다른 챕터 소속 포함, done 제외)
  const availableForChapter = (chapterId: number) =>
    projects.filter((p) => p.chapter_id !== chapterId && p.status !== "done")

  const activeChapters = chapters.filter((c) => c.status === "active")
  const doneChapters   = chapters.filter((c) => c.status === "done")
  const standaloneProjects     = projects.filter((p) => p.chapter_id === null && p.status !== "done")
  const doneStandaloneProjects = projects.filter((p) => p.chapter_id === null && p.status === "done")
  const dueSoonProjects = projects.filter((p) => isDueSoon(p.due_date) && p.status !== "done")

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

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground flex-shrink-0">묶음</span>
              {editingChapterFor === project.id ? (
                <>
                  <select
                    autoFocus
                    value={project.chapter_id ?? ""}
                    onChange={(e) => handleChapterChange(project.id, e.target.value ? Number(e.target.value) : null)}
                    className="flex-1 text-[11px] bg-muted border border-border rounded-lg px-2 py-0.5 outline-none focus:border-violet-500"
                  >
                    <option value="">없음 (단독)</option>
                    {activeChapters.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button onClick={() => setEditingChapterFor(null)} className="text-muted-foreground shrink-0"><X size={12} /></button>
                </>
              ) : (
                <button
                  onClick={() => setEditingChapterFor(project.id)}
                  className="text-[11px] text-violet-400 active:scale-95"
                >
                  {project.chapter_id
                    ? (chapters.find((c) => c.id === project.chapter_id)?.name ?? "묶음")
                    : "없음 (탭해서 변경)"}
                </button>
              )}
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

            {project.tasks.length === 0 && (
              <div className="rounded-lg bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
                첫 작업을 추가하면 이 프로젝트가 자동으로 진행 중으로 바뀝니다.
              </div>
            )}

            {addingTaskFor === project.id ? (
              <div className="flex gap-2 mt-1">
                <input
                  autoFocus
                  className="flex-1 text-xs bg-muted border border-border rounded-lg px-3 py-1.5 outline-none focus:border-violet-500"
                  placeholder="작업 이름"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddTask(project.id)
                    if (e.key === "Escape") { setAddingTaskFor(null); setNewTaskName("") }
                  }}
                />
                <button onClick={() => handleAddTask(project.id)} className="px-3 py-1.5 text-xs bg-violet-500 text-white rounded-lg font-bold">추가</button>
                <button onClick={() => { setAddingTaskFor(null); setNewTaskName("") }} className="text-muted-foreground"><X size={14} /></button>
              </div>
            ) : (
              <button
                onClick={() => { setAddingTaskFor(project.id); setNewTaskName("") }}
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

  // ── 챕터(묶음) 섹션 렌더 ─────────────────────────────
  const renderChapterSection = (ch: Chapter) => {
    const expanded = expandedChapters.has(ch.id)
    const pct = ch.total_projects === 0 ? 0 : Math.round((ch.done_projects / ch.total_projects) * 100)
    const allDone = ch.total_projects > 0 && ch.done_projects === ch.total_projects
    const chProjects = projects.filter((p) => p.chapter_id === ch.id)
    const available  = availableForChapter(ch.id)

    return (
      <div key={ch.id} className="rounded-xl border border-violet-500/30 bg-card overflow-hidden">
        {/* 챕터 헤더 */}
        <button
          className="w-full flex items-center gap-2 px-3 py-2.5 active:bg-muted/40 transition-colors"
          onClick={() => toggleChapter(ch.id)}
        >
          <BookOpen size={14} className="text-violet-400 shrink-0" />
          <span className="text-xs font-bold text-violet-400 flex-1 text-left truncate">{ch.name}</span>
          {ch.end_date && (
            <span className={`text-[10px] shrink-0 ${isDueSoon(ch.end_date) ? "text-red-400 font-bold" : "text-muted-foreground"}`}>
              {isDueSoon(ch.end_date) ? "⚠ " : ""}{formatDate(ch.end_date)}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground shrink-0">{ch.done_projects}/{ch.total_projects}</span>
          {expanded ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
        </button>

        {/* 진행률 바 */}
        <div className="h-1 bg-muted">
          <div className="h-full bg-violet-500 transition-all" style={{ width: `${pct}%` }} />
        </div>

        {expanded && (
          <div className="px-3 pb-3 pt-2 space-y-2 border-t border-border/50">
            {/* 챕터 내 프로젝트 목록 */}
            {chProjects.length > 0 ? (
              <div className="space-y-2">{chProjects.map(renderProject)}</div>
            ) : (
              <p className="text-[11px] text-muted-foreground text-center py-2">프로젝트를 추가해보세요</p>
            )}

            {/* 기존 프로젝트 추가 인라인 피커 */}
            {assigningToChapter === ch.id && (
              <div className="border border-border rounded-lg p-2.5 space-y-2">
                <p className="text-[11px] font-bold text-violet-400">기존 프로젝트 추가</p>
                {available.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">추가할 프로젝트가 없습니다</p>
                ) : (
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {available.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                        <input
                          type="checkbox"
                          checked={assignProjectIds.includes(p.id)}
                          onChange={(e) => {
                            if (e.target.checked) setAssignProjectIds((prev) => [...prev, p.id])
                            else setAssignProjectIds((prev) => prev.filter((id) => id !== p.id))
                          }}
                          className="w-3.5 h-3.5 accent-violet-500"
                        />
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${COLOR_CLS[p.color] ?? "bg-violet-500"}`} />
                        <span className="text-[11px] flex-1 truncate">{p.name}</span>
                        {p.chapter_id !== null && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {chapters.find((c) => c.id === p.chapter_id)?.name}에서 이동
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAssignProjectsToChapter(ch.id)}
                    disabled={assignProjectIds.length === 0}
                    className="flex-1 py-1.5 text-xs bg-violet-500 text-white rounded-lg font-bold disabled:opacity-40"
                  >
                    추가
                  </button>
                  <button
                    onClick={() => { setAssigningToChapter(null); setAssignProjectIds([]) }}
                    className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            {/* 묶음 안 새 프로젝트 생성 인라인 폼 */}
            {addingProjectToChapter === ch.id && (
              <div className="border border-border rounded-lg p-2.5 space-y-2">
                <p className="text-[11px] font-bold text-violet-400">새 프로젝트 만들기</p>
                <input
                  autoFocus
                  className="w-full text-xs bg-muted border border-border rounded-lg px-3 py-1.5 outline-none focus:border-violet-500"
                  placeholder="프로젝트 이름 *"
                  value={chapterNewProjName}
                  onChange={(e) => setChapterNewProjName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddProjectInChapter(ch.id)
                    if (e.key === "Escape") { setAddingProjectToChapter(null); setChapterNewProjName("") }
                  }}
                />
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-muted-foreground shrink-0">우선순위</label>
                  <select
                    className="flex-1 text-xs bg-muted border border-border rounded-lg px-2 py-1 outline-none"
                    value={chapterNewProjPriority}
                    onChange={(e) => setChapterNewProjPriority(e.target.value as "low" | "medium" | "high")}
                  >
                    <option value="high">높음</option>
                    <option value="medium">보통</option>
                    <option value="low">낮음</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddProjectInChapter(ch.id)}
                    disabled={!chapterNewProjName.trim()}
                    className="flex-1 py-1.5 text-xs bg-violet-500 text-white rounded-lg font-bold disabled:opacity-40"
                  >
                    생성
                  </button>
                  <button
                    onClick={() => { setAddingProjectToChapter(null); setChapterNewProjName("") }}
                    className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            {/* 하단 액션 버튼 행 */}
            {assigningToChapter !== ch.id && addingProjectToChapter !== ch.id && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => { setAssigningToChapter(ch.id); setAddingProjectToChapter(null); setAssignProjectIds([]) }}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground active:text-violet-400 transition-colors"
                >
                  <Plus size={11} /> 기존 추가
                </button>
                <span className="text-[11px] text-muted-foreground">·</span>
                <button
                  onClick={() => { setAddingProjectToChapter(ch.id); setAssigningToChapter(null); setChapterNewProjName(""); setChapterNewProjPriority("medium") }}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground active:text-violet-400 transition-colors"
                >
                  <Plus size={11} /> 새 프로젝트
                </button>
                <div className="flex-1" />
                <span className="text-[10px] text-muted-foreground">
                  보상: <span className="text-violet-400 font-bold">뽑기권 +{ch.bonus_tickets}</span>
                </span>
              </div>
            )}

            {/* 완료 / 삭제 */}
            <div className="flex items-center justify-between pt-1 border-t border-border/50">
              <button onClick={() => handleDeleteChapter(ch.id)} className="text-muted-foreground p-0.5">
                <Trash2 size={12} />
              </button>
              {allDone ? (
                <button
                  onClick={() => handleCompleteChapter(ch)}
                  disabled={completingChapter === ch.id}
                  className="text-[10px] px-2.5 py-1 bg-emerald-500 text-white rounded-full font-bold active:scale-95 transition-transform disabled:opacity-60"
                >
                  {completingChapter === ch.id ? "..." : "묶음 완료"}
                </button>
              ) : (
                <span className="text-[10px] text-muted-foreground">
                  {ch.total_projects - ch.done_projects}개 남음
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return <div className="flex justify-center items-center py-10 text-muted-foreground text-sm">불러오는 중...</div>
  }

  const totalDone = doneChapters.length + doneStandaloneProjects.length

  return (
    <div className="px-4 pb-4 space-y-4">

      {/* ── 요약 카드 ── */}
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-card to-card p-4">
        <p className="text-sm font-bold">🗂️ 프로젝트</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border/70 bg-background/80 px-3 py-2">
            <p className="text-[10px] text-muted-foreground">묶음</p>
            <p className="mt-1 text-base font-bold text-violet-400">{activeChapters.length}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/80 px-3 py-2">
            <p className="text-[10px] text-muted-foreground">단독</p>
            <p className="mt-1 text-base font-bold text-amber-400">{standaloneProjects.length}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/80 px-3 py-2">
            <p className="text-[10px] text-muted-foreground">마감 임박</p>
            <p className="mt-1 text-base font-bold text-red-400">{dueSoonProjects.length}</p>
          </div>
        </div>
      </div>

      {/* ── 상단 버튼 두 개 ── */}
      <div className="flex gap-2">
        <button
          onClick={() => { setAdding((v) => !v); setAddingBundle(false) }}
          className={`flex items-center gap-1.5 flex-1 py-2.5 px-3 rounded-xl border text-sm transition-colors ${
            adding
              ? "border-violet-500 text-violet-400 bg-violet-500/10"
              : "border-dashed border-border text-muted-foreground"
          }`}
        >
          <Plus size={14} /> 새 프로젝트
        </button>
        <button
          onClick={() => { setAddingBundle((v) => !v); setAdding(false) }}
          className={`flex items-center gap-1.5 flex-1 py-2.5 px-3 rounded-xl border text-sm transition-colors ${
            addingBundle
              ? "border-violet-500 text-violet-400 bg-violet-500/10"
              : "border-dashed border-border text-muted-foreground"
          }`}
        >
          <FolderPlus size={14} /> 새 묶음
        </button>
      </div>

      {/* ── 새 프로젝트 폼 ── */}
      {adding && (
        <div className="border border-border rounded-xl p-3 space-y-2 bg-card">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold">새 프로젝트</span>
            <button onClick={() => setAdding(false)}><X size={16} className="text-muted-foreground" /></button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            프로젝트는 큰 목표이고, 세부 단계는 만든 뒤 안에서 작업으로 추가합니다.
          </p>
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
                onChange={(e) => setNewPriority(e.target.value as "low" | "medium" | "high")}
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
          {activeChapters.length > 0 && (
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">묶음 (선택)</label>
              <select
                className="w-full text-xs bg-muted border border-border rounded-lg px-2 py-1.5 outline-none"
                value={newChapterId ?? ""}
                onChange={(e) => setNewChapterId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">없음 (단독)</option>
                {activeChapters.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
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
      )}

      {/* ── 새 묶음 폼 ── */}
      {addingBundle && (
        <div className="border border-border rounded-xl p-3 space-y-2 bg-card">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold">새 묶음</span>
            <button onClick={() => setAddingBundle(false)}><X size={16} className="text-muted-foreground" /></button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            비슷한 프로젝트들을 한 묶음으로 관리하세요. 만든 뒤 묶음 안에서 프로젝트를 추가할 수 있습니다.
          </p>
          <input
            autoFocus
            className="w-full text-sm bg-muted border border-border rounded-lg px-3 py-2 outline-none focus:border-violet-500"
            placeholder="묶음 이름 *"
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
          <button
            onClick={handleAddChapter}
            disabled={!chName.trim()}
            className="w-full py-2 text-sm bg-violet-500 text-white rounded-xl font-bold disabled:opacity-40"
          >
            묶음 생성
          </button>
        </div>
      )}

      {/* ── 활성 묶음 섹션 ── */}
      {activeChapters.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen size={13} className="text-violet-400" />
            <span className="text-xs font-bold text-violet-400">묶음</span>
            <span className="text-xs text-muted-foreground">{activeChapters.length}</span>
          </div>
          {activeChapters.map(renderChapterSection)}
        </div>
      )}

      {/* ── 단독 프로젝트 섹션 ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">단독 프로젝트</span>
          <span className="text-xs text-muted-foreground">{standaloneProjects.length}</span>
        </div>
        {standaloneProjects.map(renderProject)}
        {standaloneProjects.length === 0 && (
          <div className="rounded-xl border border-dashed border-border px-4 py-5 text-center">
            <p className="text-xs text-muted-foreground">단독 프로젝트가 없습니다</p>
            <p className="text-[11px] text-muted-foreground mt-1">묶음에 속하지 않은 프로젝트가 여기에 표시됩니다</p>
          </div>
        )}
      </div>

      {/* ── 완료된 것들 토글 ── */}
      {totalDone > 0 && (
        <div>
          <button
            onClick={() => setShowDone((v) => !v)}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            {showDone ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            <Trophy size={13} className="text-emerald-500" />
            완료된 항목 {totalDone}개
          </button>
          {showDone && (
            <div className="mt-2 space-y-3 opacity-70">
              {/* 완료된 묶음 */}
              {doneChapters.map((ch) => {
                const chProjects = projects.filter((p) => p.chapter_id === ch.id)
                return (
                  <div key={ch.id} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <Trophy size={13} className="text-emerald-500 shrink-0" />
                      <span className="text-xs font-bold line-through text-muted-foreground flex-1">{ch.name}</span>
                      <button onClick={() => handleDeleteChapter(ch.id)} className="text-muted-foreground"><X size={12} /></button>
                    </div>
                    {chProjects.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 pl-5">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${COLOR_CLS[p.color] ?? "bg-violet-500"} opacity-40`} />
                        <span className="text-[11px] line-through text-muted-foreground flex-1 truncate">{p.name}</span>
                      </div>
                    ))}
                  </div>
                )
              })}
              {/* 완료된 단독 프로젝트 */}
              {doneStandaloneProjects.length > 0 && (
                <div className="space-y-2">
                  {doneStandaloneProjects.map(renderProject)}
                </div>
              )}
            </div>
          )}
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
