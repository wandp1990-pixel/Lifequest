/**
 * @module components/game/projects/ChapterSection
 * @purpose 챕터(묶음) 카드. 진행률 + 내부 프로젝트 카드 목록 + assign/add 인라인 폼 + 완료/삭제.
 *          assign: PATCH /api/projects/:pid chapter_id. complete: PATCH /api/chapters/:id action=complete.
 *          add: POST /api/projects (chapter_id 자동). delete: DELETE /api/chapters/:id.
 */

"use client"

import { useState } from "react"
import { BookOpen, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react"
import { PROJECT_COLOR_CLS } from "@/lib/constants/ui"
import { DEADLINE_IMMINENT_DAYS } from "@/lib/constants/time"
import { apiDelete, apiPatch, apiPost, ApiError } from "@/hooks/useApi"
import { useToast } from "@/contexts/ToastContext"
import type { Chapter, Project } from "@/hooks/useProjects"
import ProjectCard from "./ProjectCard"

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
  ch: Chapter
  projects: Project[]
  chapters: Chapter[]
  expanded: boolean
  toggleExpanded: () => void
  expandedProjectIds: Set<number>
  toggleProject: (id: number) => void
  refetch: () => Promise<void>
  setProjects: (p: Project[]) => void
  setChapters: (c: Chapter[]) => void
  onExpGained?: () => void
  onConfirmDeleteProject: (target: { id: number; name: string }) => void
}

export default function ChapterSection({
  ch, projects, chapters, expanded, toggleExpanded,
  expandedProjectIds, toggleProject,
  refetch, setProjects, setChapters,
  onExpGained, onConfirmDeleteProject,
}: Props) {
  const { showInfo } = useToast()
  const [assigning, setAssigning] = useState(false)
  const [assignIds, setAssignIds] = useState<number[]>([])
  const [addingProject, setAddingProject] = useState(false)
  const [newProjName, setNewProjName] = useState("")
  const [newProjPriority, setNewProjPriority] = useState<"low" | "medium" | "high">("medium")
  const [completing, setCompleting] = useState(false)

  const chProjects = projects.filter((p) => p.chapter_id === ch.id)
  const totalTasks = chProjects.reduce((s, p) => s + p.tasks.length, 0)
  const doneTasks  = chProjects.reduce((s, p) => s + p.tasks.filter(t => t.is_completed !== 0).length, 0)
  const pct = totalTasks > 0
    ? Math.round((doneTasks / totalTasks) * 100)
    : ch.total_projects === 0 ? 0 : Math.round((ch.done_projects / ch.total_projects) * 100)
  const allDone = ch.total_projects > 0 && ch.done_projects === ch.total_projects
  const available = projects.filter((p) => p.chapter_id !== ch.id && p.status !== "done")

  const handleComplete = async () => {
    setCompleting(true)
    try {
      const data = await apiPatch<{ chapters?: Chapter[]; bonusExp?: number }>(
        `/api/chapters/${ch.id}`, { action: "complete" })
      setChapters(data.chapters ?? [])
      const parts: string[] = []
      if ((data.bonusExp ?? 0) > 0) parts.push(`묶음 완료 보너스 +${data.bonusExp}XP`)
      showInfo(parts.join(" · ") || "묶음 완료!")
      onExpGained?.()
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    } finally {
      setCompleting(false)
    }
  }

  const handleDeleteChapter = async () => {
    try {
      const data = await apiDelete<{ chapters?: Chapter[] }>(`/api/chapters/${ch.id}`)
      setChapters(data.chapters ?? [])
      await refetch()
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    }
  }

  const handleAssignSubmit = async () => {
    if (assignIds.length === 0) return
    try {
      await Promise.all(assignIds.map((pid) =>
        apiPatch(`/api/projects/${pid}`, { chapter_id: ch.id })
      ))
      await refetch()
      setAssigning(false)
      setAssignIds([])
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    }
  }

  const handleAddProjectInChapter = async () => {
    if (!newProjName.trim()) return
    try {
      await apiPost("/api/projects", {
        name: newProjName.trim(),
        description: "",
        priority: newProjPriority,
        due_date: null,
        color: "violet",
        chapter_id: ch.id,
      })
      await refetch()
      setAddingProject(false)
      setNewProjName("")
      setNewProjPriority("medium")
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    }
  }

  return (
    <div className="rounded-xl border border-violet-500/30 bg-card overflow-hidden">
      <button
        className="w-full flex flex-col px-3 pt-2.5 pb-2 active:bg-muted/40 transition-colors"
        onClick={toggleExpanded}
      >
        <div className="flex items-center gap-2 w-full">
          <BookOpen size={14} className="text-violet-400 shrink-0" />
          <span className="text-xs font-bold text-violet-400 flex-1 text-left truncate">{ch.name}</span>
          {ch.end_date && (
            <span className={`text-[10px] shrink-0 ${isDueSoon(ch.end_date) ? "text-red-400 font-bold" : "text-muted-foreground"}`}>
              {isDueSoon(ch.end_date) ? "⚠ " : ""}{formatDate(ch.end_date)}
            </span>
          )}
          {expanded ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
        </div>
        <div className="flex items-center gap-2 w-full mt-1.5 pl-5">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">{pct}%</span>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-2 space-y-2 border-t border-border/50">
          {chProjects.length > 0 ? (
            <div className="space-y-2">
              {chProjects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  chapters={chapters}
                  expanded={expandedProjectIds.has(p.id)}
                  toggleExpand={() => toggleProject(p.id)}
                  onMutated={(d) => { if (d.projects) setProjects(d.projects); else refetch() }}
                  onDelete={() => onConfirmDeleteProject({ id: p.id, name: p.name })}
                  onExpGained={onExpGained}
                />
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground text-center py-2">프로젝트를 추가해보세요</p>
          )}

          {assigning && (
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
                        checked={assignIds.includes(p.id)}
                        onChange={(e) => {
                          if (e.target.checked) setAssignIds((prev) => [...prev, p.id])
                          else setAssignIds((prev) => prev.filter((id) => id !== p.id))
                        }}
                        className="w-3.5 h-3.5 accent-violet-500"
                      />
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${PROJECT_COLOR_CLS[p.color] ?? "bg-violet-500"}`} />
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
                  onClick={handleAssignSubmit}
                  disabled={assignIds.length === 0}
                  className="flex-1 py-1.5 text-xs bg-violet-500 text-white rounded-lg font-bold disabled:opacity-40"
                >추가</button>
                <button
                  onClick={() => { setAssigning(false); setAssignIds([]) }}
                  className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground"
                >취소</button>
              </div>
            </div>
          )}

          {addingProject && (
            <div className="border border-border rounded-lg p-2.5 space-y-2">
              <p className="text-[11px] font-bold text-violet-400">새 프로젝트 만들기</p>
              <input
                autoFocus
                className="w-full text-xs bg-muted border border-border rounded-lg px-3 py-1.5 outline-none focus:border-violet-500"
                placeholder="프로젝트 이름 *"
                value={newProjName}
                onChange={(e) => setNewProjName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddProjectInChapter()
                  if (e.key === "Escape") { setAddingProject(false); setNewProjName("") }
                }}
              />
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-muted-foreground shrink-0">우선순위</label>
                <select
                  className="flex-1 text-xs bg-muted border border-border rounded-lg px-2 py-1 outline-none"
                  value={newProjPriority}
                  onChange={(e) => setNewProjPriority(e.target.value as "low" | "medium" | "high")}
                >
                  <option value="high">높음</option>
                  <option value="medium">보통</option>
                  <option value="low">낮음</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddProjectInChapter}
                  disabled={!newProjName.trim()}
                  className="flex-1 py-1.5 text-xs bg-violet-500 text-white rounded-lg font-bold disabled:opacity-40"
                >생성</button>
                <button
                  onClick={() => { setAddingProject(false); setNewProjName("") }}
                  className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground"
                >취소</button>
              </div>
            </div>
          )}

          {!assigning && !addingProject && (
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => { setAssigning(true); setAddingProject(false); setAssignIds([]) }}
                className="flex items-center gap-1 text-[11px] text-muted-foreground active:text-violet-400 transition-colors"
              ><Plus size={11} /> 기존 추가</button>
              <span className="text-[11px] text-muted-foreground">·</span>
              <button
                onClick={() => { setAddingProject(true); setAssigning(false); setNewProjName(""); setNewProjPriority("medium") }}
                className="flex items-center gap-1 text-[11px] text-muted-foreground active:text-violet-400 transition-colors"
              ><Plus size={11} /> 새 프로젝트</button>
              <div className="flex-1" />
              <span className="text-[10px] text-muted-foreground">
                보상: <span className="text-violet-400 font-bold">XP +{ch.bonus_exp}</span>
              </span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-border/50">
            <button onClick={handleDeleteChapter} className="text-muted-foreground p-0.5">
              <Trash2 size={12} />
            </button>
            {allDone ? (
              <button
                onClick={handleComplete}
                disabled={completing}
                className="text-[10px] px-2.5 py-1 bg-emerald-500 text-white rounded-full font-bold active:scale-95 transition-transform disabled:opacity-60"
              >
                {completing ? "..." : "묶음 완료"}
              </button>
            ) : (
              <span className="text-[10px] text-muted-foreground">{ch.total_projects - ch.done_projects}개 남음</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
