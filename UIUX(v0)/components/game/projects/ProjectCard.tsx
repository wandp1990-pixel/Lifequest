/**
 * @module components/game/projects/ProjectCard
 * @purpose 개별 프로젝트 카드. 헤더(이름/우선순위/마감일/진행률) + 확장 시 status/chapter 편집 + 작업 목록 + 작업 추가 폼.
 *          mutation 은 자체 useApi 호출 (PATCH /api/projects/:id, /tasks, /tasks/:id). 결과 응답을 onMutated 로 부모에 전달.
 *          completeTask 응답에 따라 toast.
 */

"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Pencil, Plus, Trash2, X } from "lucide-react"
import { PRIORITY_LABEL, PRIORITY_COLOR, STATUS_LABEL, PROJECT_COLOR_CLS, PROJECT_COLOR_OPTIONS } from "@/lib/constants/ui"
import { DEADLINE_IMMINENT_DAYS } from "@/lib/constants/time"
import { apiDelete, apiPatch, apiPost, ApiError } from "@/hooks/useApi"
import { useToast } from "@/contexts/ToastContext"
import type { Project, Chapter } from "@/hooks/useProjects"

function formatDate(d: string | null): string | null {
  if (!d) return null
  return new Date(d).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
}

function isDueSoon(due: string | null): boolean {
  if (!due) return false
  const diff = new Date(due).getTime() - Date.now()
  return diff < DEADLINE_IMMINENT_DAYS * 24 * 60 * 60 * 1000
}

interface Props {
  project: Project
  chapters: Chapter[]
  expanded: boolean
  toggleExpand: () => void
  onMutated: (data: { projects?: Project[] }) => void
  onDelete: () => void
  onExpGained?: () => void
}

export default function ProjectCard({
  project, chapters, expanded, toggleExpand,
  onMutated, onDelete, onExpGained,
}: Props) {
  const { showInfo, showError } = useToast()
  const [addingTask, setAddingTask] = useState(false)
  const [newTaskName, setNewTaskName] = useState("")
  const [newTaskExp, setNewTaskExp] = useState("0")
  const [completing, setCompleting] = useState<number | null>(null)
  const [completingProject, setCompletingProject] = useState(false)
  // 낙관적 완료 ID — props.project.tasks가 동기화되기 전 즉시 체크 표시
  const [optimisticDoneIds, setOptimisticDoneIds] = useState<Set<number>>(new Set())
  const [editingChapter, setEditingChapter] = useState(false)
  const [editingProject, setEditingProject] = useState(false)
  const [editName, setEditName] = useState(project.name)
  const [editDesc, setEditDesc] = useState(project.description ?? "")
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high">(project.priority)
  const [editDueDate, setEditDueDate] = useState(project.due_date ? project.due_date.split("T")[0] : "")
  const [editColor, setEditColor] = useState(project.color)

  const dueSoon = isDueSoon(project.due_date) && project.status !== "done"
  const dueLabel = formatDate(project.due_date)
  const chapter = chapters.find((c) => c.id === project.chapter_id)
  const activeChapters = chapters.filter((c) => c.status === "active")

  const handleStatusChange = async (status: "todo" | "in_progress" | "done") => {
    setCompletingProject(true)
    try {
      const data = await apiPatch<{ projects?: Project[]; bonusExp?: number }>(
        `/api/projects/${project.id}`, { status })
      onMutated(data)
      if (status === "done" && (data.bonusExp ?? 0) > 0) {
        showInfo(`프로젝트 완료 보너스 +${data.bonusExp}XP`)
        onExpGained?.()
      }
    } catch (e) {
      if (e instanceof ApiError) showError(e.message)
      else throw e
    } finally {
      setCompletingProject(false)
    }
  }

  const handleChapterChange = async (chapterId: number | null) => {
    try {
      const data = await apiPatch<{ projects?: Project[] }>(
        `/api/projects/${project.id}`, { chapter_id: chapterId })
      onMutated(data)
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    } finally {
      setEditingChapter(false)
    }
  }

  const handleAddTask = async () => {
    if (!newTaskName.trim()) return
    try {
      const data = await apiPost<{ projects?: Project[] }>(
        `/api/projects/${project.id}/tasks`,
        { name: newTaskName.trim(), exp_reward: Number(newTaskExp) || 0 })
      onMutated(data)
      setAddingTask(false); setNewTaskName(""); setNewTaskExp("0")
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    }
  }

  const handleCompleteTask = async (taskId: number) => {
    if (optimisticDoneIds.has(taskId)) return
    const task = project.tasks.find((t) => t.id === taskId)
    const isAi = !task || task.exp_reward === 0
    // AI: 응답 전까지 "처리 중..." 표시, 완료 처리는 응답 후. 비AI: 즉시 낙관적 완료 + 토스트.
    if (isAi) {
      setCompleting(taskId)
    } else {
      setOptimisticDoneIds((prev) => new Set([...prev, taskId]))
      if (task) showInfo(`작업 완료 +${task.exp_reward}XP`)
    }
    try {
      const data = await apiPatch<{
        projects?: Project[]; projectCompleted?: boolean
        exp: number; bonusExp?: number; usedAi?: boolean
      }>(`/api/projects/${project.id}/tasks/${taskId}`)
      onMutated(data)
      if (isAi) {
        setOptimisticDoneIds((prev) => new Set([...prev, taskId]))
        if (data.projectCompleted) {
          showInfo(`AI 산정 작업 +${data.exp}XP · 프로젝트 완료 보너스 +${data.bonusExp}XP`)
        } else {
          showInfo(`AI 산정 작업 완료 +${data.exp}XP`)
        }
      } else if (data.projectCompleted) {
        showInfo(`프로젝트 완료 보너스 +${data.bonusExp}XP`)
      }
      onExpGained?.()
    } catch (e) {
      if (!isAi) setOptimisticDoneIds((prev) => { const next = new Set(prev); next.delete(taskId); return next })
      if (!(e instanceof ApiError)) throw e
    } finally {
      if (isAi) setCompleting(null)
    }
  }

  const handleEditSave = async () => {
    if (!editName.trim()) return
    try {
      const data = await apiPatch<{ projects?: Project[] }>(
        `/api/projects/${project.id}`,
        { name: editName.trim(), description: editDesc, priority: editPriority, due_date: editDueDate || null, color: editColor }
      )
      onMutated(data)
      setEditingProject(false)
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    }
  }

  const handleDeleteTask = async (taskId: number) => {
    try {
      const data = await apiDelete<{ projects?: Project[] }>(`/api/projects/${project.id}/tasks/${taskId}`)
      onMutated(data)
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div
        className="flex items-start gap-3 p-3 cursor-pointer active:bg-muted/40 transition-colors"
        onClick={toggleExpand}
      >
        <button
          onClick={(e) => { e.stopPropagation(); handleStatusChange(project.status === "done" ? "todo" : "done") }}
          disabled={completingProject}
          className="shrink-0 w-7 h-7 flex items-center justify-center touch-manipulation"
        >
          {completingProject ? (
            <Circle size={18} className="text-muted-foreground animate-pulse" />
          ) : project.status === "done" ? (
            <CheckCircle2 size={18} className="text-emerald-500" />
          ) : (
            <Circle size={18} className="text-muted-foreground" />
          )}
        </button>
        <div className={`w-2 h-2 rounded-full mt-2.5 shrink-0 ${PROJECT_COLOR_CLS[project.color] ?? "bg-violet-500"}`} />
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
                className={`h-full rounded-full transition-all ${project.status === "done" ? "bg-emerald-500" : PROJECT_COLOR_CLS[project.color] ?? "bg-violet-500"}`}
                style={{ width: `${project.progress}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0">{project.progress}%</span>
          </div>
        </div>
        <div className="shrink-0">
          {expanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-3 pb-3 pt-2 space-y-2">
          {editingProject ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-violet-400">프로젝트 수정</span>
                <button onClick={() => setEditingProject(false)}><X size={14} className="text-muted-foreground" /></button>
              </div>
              <input
                autoFocus
                className="w-full text-sm bg-muted border border-border rounded-lg px-3 py-2 outline-none focus:border-violet-500"
                placeholder="프로젝트 이름 *"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleEditSave(); if (e.key === "Escape") setEditingProject(false) }}
              />
              <input
                className="w-full text-xs bg-muted border border-border rounded-lg px-3 py-2 outline-none focus:border-violet-500"
                placeholder="설명 (선택)"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[11px] text-muted-foreground block mb-1">우선순위</label>
                  <select
                    className="w-full text-xs bg-muted border border-border rounded-lg px-2 py-1.5 outline-none"
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as "low" | "medium" | "high")}
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
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">색상</label>
                <div className="flex gap-2">
                  {PROJECT_COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setEditColor(c.value)}
                      className={`w-6 h-6 rounded-full ${c.cls} ${editColor === c.value ? "ring-2 ring-white ring-offset-1 ring-offset-background" : ""}`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleEditSave}
                  disabled={!editName.trim()}
                  className="flex-1 py-1.5 text-xs bg-violet-500 text-white rounded-lg font-bold disabled:opacity-40"
                >저장</button>
                <button
                  onClick={() => setEditingProject(false)}
                  className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground"
                >취소</button>
              </div>
            </div>
          ) : (
            <>
          <div className="flex gap-1 flex-wrap">
            {(["todo", "in_progress", "done"] as const).map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                  project.status === s ? "bg-violet-500 text-white border-violet-500" : "border-border text-muted-foreground"
                }`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
            <div className="flex-1" />
            <button
              onClick={() => { setEditingProject(true); setEditName(project.name); setEditDesc(project.description ?? ""); setEditPriority(project.priority); setEditDueDate(project.due_date ? project.due_date.split("T")[0] : ""); setEditColor(project.color) }}
              className="text-muted-foreground px-1"
            >
              <Pencil size={12} />
            </button>
            <button onClick={onDelete} className="text-[10px] text-red-400 px-1">
              <Trash2 size={12} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground flex-shrink-0">묶음</span>
            {editingChapter ? (
              <>
                <select
                  autoFocus
                  value={project.chapter_id ?? ""}
                  onChange={(e) => handleChapterChange(e.target.value ? Number(e.target.value) : null)}
                  className="flex-1 text-[11px] bg-muted border border-border rounded-lg px-2 py-0.5 outline-none focus:border-violet-500"
                >
                  <option value="">없음 (단독)</option>
                  {activeChapters.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button onClick={() => setEditingChapter(false)} className="text-muted-foreground shrink-0"><X size={12} /></button>
              </>
            ) : (
              <button onClick={() => setEditingChapter(true)} className="text-[11px] text-violet-400 active:scale-95">
                {project.chapter_id
                  ? (chapters.find((c) => c.id === project.chapter_id)?.name ?? "묶음")
                  : "없음 (탭해서 변경)"}
              </button>
            )}
          </div>

          {project.bonus_exp > 0 && (
            <div className="text-[11px] text-muted-foreground">
              프로젝트 완료 보너스: <span className="text-amber-400 font-bold">+{project.bonus_exp}XP</span>
            </div>
          )}

          <div className="space-y-1.5">
            {project.tasks.map((task) => {
              const visuallyDone = !!task.is_completed || optimisticDoneIds.has(task.id)
              return (
                <div
                  key={task.id}
                  className={`flex items-center gap-2 py-1 ${visuallyDone ? "opacity-50" : ""} ${!visuallyDone && project.status !== "done" && completing === null ? "cursor-pointer active:bg-muted/40 rounded-lg transition-colors" : ""}`}
                  onClick={() => { !visuallyDone && project.status !== "done" && completing === null && handleCompleteTask(task.id) }}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); !visuallyDone && project.status !== "done" && completing === null && handleCompleteTask(task.id) }}
                    disabled={visuallyDone || project.status === "done" || completing !== null}
                    className="shrink-0 w-7 h-7 flex items-center justify-center touch-manipulation"
                  >
                    {visuallyDone ? (
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    ) : completing === task.id ? (
                      <Circle size={16} className="text-muted-foreground animate-pulse" />
                    ) : (
                      <Circle size={16} className="text-muted-foreground" />
                    )}
                  </button>
                  <span className={`flex-1 text-xs ${visuallyDone ? "line-through" : ""}`}>{task.name}</span>
                  <span className="text-[10px] text-amber-400 shrink-0">{task.exp_reward === 0 ? "AI 산정" : `+${task.exp_reward}XP`}</span>
                  {!visuallyDone && (
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id) }} className="text-muted-foreground shrink-0">
                      <X size={12} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {project.tasks.length === 0 && (
            <div className="rounded-lg bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
              첫 작업을 추가하면 이 프로젝트가 자동으로 진행 중으로 바뀝니다.
            </div>
          )}

          {addingTask ? (
            <div className="mt-1 space-y-2">
              <input
                autoFocus
                className="w-full text-xs bg-muted border border-border rounded-lg px-3 py-1.5 outline-none focus:border-violet-500"
                placeholder="작업 이름"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddTask()
                  if (e.key === "Escape") { setAddingTask(false); setNewTaskName(""); setNewTaskExp("0") }
                }}
              />
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min={0}
                  className="flex-1 min-w-0 text-xs bg-muted border border-border rounded-lg px-2 py-1.5 outline-none focus:border-violet-500"
                  placeholder="XP (0=AI 산정)"
                  value={newTaskExp}
                  onChange={(e) => setNewTaskExp(e.target.value)}
                />
                <button onClick={handleAddTask} className="px-3 py-1.5 text-xs bg-violet-500 text-white rounded-lg font-bold flex-shrink-0">추가</button>
                <button onClick={() => { setAddingTask(false); setNewTaskName(""); setNewTaskExp("0") }} className="text-muted-foreground flex-shrink-0 p-1"><X size={14} /></button>
              </div>
              <p className="text-[10px] text-muted-foreground">XP를 `0`으로 두면 완료 시 AI가 경험치를 산정합니다.</p>
            </div>
          ) : (
            <button
              onClick={() => { setAddingTask(true); setNewTaskName(""); setNewTaskExp("0") }}
              className="flex items-center gap-1 text-xs text-muted-foreground mt-1"
              disabled={project.status === "done"}
            >
              <Plus size={12} /> 작업 추가
            </button>
          )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
