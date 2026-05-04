"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, X, Trash2, CheckCircle2, Circle, ChevronDown, ChevronRight, Pencil } from "lucide-react"

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
  created_at: string
  completed_at: string | null
  tasks: ProjectTask[]
  progress: number
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
  { value: "violet", label: "보라", cls: "bg-violet-500" },
  { value: "blue", label: "파랑", cls: "bg-blue-500" },
  { value: "emerald", label: "초록", cls: "bg-emerald-500" },
  { value: "amber", label: "노랑", cls: "bg-amber-500" },
  { value: "rose", label: "빨강", cls: "bg-rose-500" },
]
const COLOR_CLS: Record<string, string> = {
  violet: "bg-violet-500",
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
}

function formatDueDate(due: string | null): { label: string; overdue: boolean } | null {
  if (!due) return null
  const d = new Date(due)
  const now = new Date()
  const overdue = d < now
  const label = d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
  return { label, overdue }
}

export default function ProjectsTab({ onExpGained, refreshTick }: ProjectsTabProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [toast, setToast] = useState<{ msg: string; exp?: number } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null)

  // 새 프로젝트 폼 상태
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium")
  const [newBonusExp, setNewBonusExp] = useState(50)
  const [newDueDate, setNewDueDate] = useState("")
  const [newColor, setNewColor] = useState("violet")

  // 하위 작업 추가 상태 (project id → 입력 중)
  const [addingTaskFor, setAddingTaskFor] = useState<number | null>(null)
  const [newTaskName, setNewTaskName] = useState("")
  const [newTaskExp, setNewTaskExp] = useState(10)

  // 완료 중 상태 (task id)
  const [completing, setCompleting] = useState<number | null>(null)

  const fetchProjects = useCallback(async () => {
    const res = await fetch("/api/projects")
    if (res.ok) {
      const data = await res.json()
      setProjects(data.projects ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects, refreshTick])

  const showToast = (msg: string, exp?: number) => {
    setToast({ msg, exp })
    setTimeout(() => setToast(null), 3000)
  }

  const handleAddProject = async () => {
    if (!newName.trim()) return
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        description: newDesc,
        priority: newPriority,
        bonus_exp: newBonusExp,
        due_date: newDueDate || null,
        color: newColor,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setProjects(data.projects ?? [])
      setAdding(false)
      setNewName("")
      setNewDesc("")
      setNewPriority("medium")
      setNewBonusExp(50)
      setNewDueDate("")
      setNewColor("violet")
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
      setAddingTaskFor(null)
      setNewTaskName("")
      setNewTaskExp(10)
    }
  }

  const handleCompleteTask = async (projectId: number, taskId: number) => {
    if (completing !== null) return
    setCompleting(taskId)
    const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, { method: "PATCH" })
    if (res.ok) {
      const data = await res.json()
      setProjects(data.projects ?? [])
      const exp = data.exp ?? 0
      if (data.projectCompleted) {
        showToast(`프로젝트 완료! 보너스 +${data.bonusExp}XP`, data.bonusExp)
      } else {
        showToast(`+${exp}XP`, exp)
      }
      onExpGained?.()
    }
    setCompleting(null)
  }

  const handleDeleteTask = async (projectId: number, taskId: number) => {
    const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, { method: "DELETE" })
    if (res.ok) {
      const data = await res.json()
      setProjects(data.projects ?? [])
    }
  }

  const handleDeleteProject = async (id: number) => {
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" })
    if (res.ok) {
      const data = await res.json()
      setProjects(data.projects ?? [])
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
      if (status === "done" && data.bonusExp > 0) {
        showToast(`프로젝트 완료! +${data.bonusExp}XP`, data.bonusExp)
        onExpGained?.()
      }
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
    todo: projects.filter((p) => p.status === "todo"),
    done: projects.filter((p) => p.status === "done"),
  }

  const renderProject = (project: Project) => {
    const expanded = expandedIds.has(project.id)
    const due = formatDueDate(project.due_date)

    return (
      <div key={project.id} className="rounded-xl border border-border bg-card overflow-hidden">
        {/* 프로젝트 헤더 */}
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
              {due && (
                <span className={`text-[10px] ${due.overdue ? "text-red-400" : "text-muted-foreground"}`}>
                  {due.overdue ? "⚠ " : ""}{due.label}
                </span>
              )}
            </div>
            {project.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{project.description}</p>
            )}
            {/* 진행률 바 */}
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
          <div className="flex items-center gap-1 shrink-0">
            {expanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
          </div>
        </div>

        {/* 상세 펼침 */}
        {expanded && (
          <div className="border-t border-border px-3 pb-3 pt-2 space-y-2">
            {/* 상태 변경 */}
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
              <button
                onClick={() => setConfirmDelete({ id: project.id, name: project.name })}
                className="text-[10px] text-red-400 px-1"
              >
                <Trash2 size={12} />
              </button>
            </div>

            {/* 보너스 EXP 표시 */}
            {project.bonus_exp > 0 && (
              <div className="text-[11px] text-muted-foreground">
                완료 보너스: <span className="text-amber-400 font-bold">+{project.bonus_exp}XP</span>
              </div>
            )}

            {/* 하위 작업 목록 */}
            <div className="space-y-1.5">
              {project.tasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center gap-2 py-1 ${task.is_completed ? "opacity-50" : ""}`}
                >
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

            {/* 하위 작업 추가 */}
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
                    type="number"
                    min={1}
                    max={500}
                    className="w-20 text-xs bg-muted border border-border rounded-lg px-2 py-1 outline-none focus:border-violet-500"
                    value={newTaskExp}
                    onChange={(e) => setNewTaskExp(Number(e.target.value))}
                  />
                  <button
                    onClick={() => handleAddTask(project.id)}
                    className="flex-1 py-1 text-xs bg-violet-500 text-white rounded-lg font-bold"
                  >
                    추가
                  </button>
                  <button
                    onClick={() => { setAddingTaskFor(null); setNewTaskName("") }}
                    className="text-muted-foreground"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setAddingTaskFor(project.id); setNewTaskName(""); setNewTaskExp(10) }}
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
      {/* 새 프로젝트 추가 버튼 / 폼 */}
      <div>
        {adding ? (
          <div className="border border-border rounded-xl p-3 space-y-2 bg-card">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold">새 프로젝트</span>
              <button onClick={() => setAdding(false)}><X size={16} className="text-muted-foreground" /></button>
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
                  onChange={(e) => setNewPriority(e.target.value as "low" | "medium" | "high")}
                >
                  <option value="high">높음</option>
                  <option value="medium">보통</option>
                  <option value="low">낮음</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-[11px] text-muted-foreground block mb-1">완료 보너스 EXP</label>
                <input
                  type="number"
                  min={0}
                  max={9999}
                  className="w-full text-xs bg-muted border border-border rounded-lg px-2 py-1.5 outline-none"
                  value={newBonusExp}
                  onChange={(e) => setNewBonusExp(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[11px] text-muted-foreground block mb-1">마감일 (선택)</label>
                <input
                  type="date"
                  className="w-full text-xs bg-muted border border-border rounded-lg px-2 py-1.5 outline-none"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
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

      {/* 진행 중 */}
      {grouped.in_progress.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-violet-400">진행 중</span>
            <span className="text-xs text-muted-foreground">{grouped.in_progress.length}</span>
          </div>
          {grouped.in_progress.map(renderProject)}
        </div>
      )}

      {/* 시작 전 */}
      {grouped.todo.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">시작 전</span>
            <span className="text-xs text-muted-foreground">{grouped.todo.length}</span>
          </div>
          {grouped.todo.map(renderProject)}
        </div>
      )}

      {/* 완료 */}
      {grouped.done.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-500">완료</span>
            <span className="text-xs text-muted-foreground">{grouped.done.length}</span>
          </div>
          {grouped.done.map(renderProject)}
        </div>
      )}

      {/* 빈 상태 */}
      {projects.length === 0 && !adding && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <p className="text-2xl mb-2">📋</p>
          <p>프로젝트가 없습니다</p>
          <p className="text-xs mt-1">연계 퀘스트를 만들어 목표를 달성하세요!</p>
        </div>
      )}

      {/* 삭제 확인 */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold mb-1">프로젝트 삭제</p>
            <p className="text-xs text-muted-foreground mb-4">
              &quot;{confirmDelete.name}&quot;과 모든 하위 작업이 삭제됩니다.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 rounded-xl border border-border text-sm">취소</button>
              <button onClick={() => handleDeleteProject(confirmDelete.id)} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-bold">삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-full px-4 py-2 text-xs font-bold shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {toast.msg}
        </div>
      )}
    </div>
  )
}
