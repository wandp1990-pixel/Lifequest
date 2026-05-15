/**
 * @module components/game/ProjectsTab
 * @purpose 프로젝트 탭 컨테이너. useProjects 로 데이터 fetch + toast/confirmDelete 공유 + 자식 컴포넌트 합성.
 *          하위:
 *            ProjectCard / ChapterSection / DoneSection — 각자 mutation 자체 수행 후 응답 onMutated 로 부모 state 갱신
 *            AddProjectForm / AddChapterForm — 자체 form state + POST 후 refetch
 *          props: onExpGained(레벨업/EXP 후 부모에 신호), refreshTick(외부 트리거 시 refetch)
 */

"use client"

import { useEffect, useState } from "react"
import { BookOpen, FolderPlus, Plus } from "lucide-react"
import { DEADLINE_IMMINENT_DAYS } from "@/lib/constants/time"
import { apiDelete, ApiError } from "@/hooks/useApi"
import { useProjects, type Project } from "@/hooks/useProjects"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import ProjectCard from "./projects/ProjectCard"
import ChapterSection from "./projects/ChapterSection"
import DoneSection from "./projects/DoneSection"
import AddProjectForm from "./projects/AddProjectForm"
import AddChapterForm from "./projects/AddChapterForm"

interface ProjectsTabProps {
  onExpGained?: () => void
  refreshTick?: number
}

function isDueSoon(due: string | null): boolean {
  if (!due) return false
  const diff = new Date(due).getTime() - Date.now()
  return diff < DEADLINE_IMMINENT_DAYS * 24 * 60 * 60 * 1000
}

export default function ProjectsTab({ onExpGained, refreshTick }: ProjectsTabProps) {
  const { projects, setProjects, chapters, setChapters, loading, refetch } = useProjects()
  const [adding, setAdding] = useState(false)
  const [addingBundle, setAddingBundle] = useState(false)
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<number>>(new Set())
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null)

  useEffect(() => { refetch() }, [refetch, refreshTick])

  const toggleProject = (id: number) => {
    setExpandedProjectIds((prev) => {
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

  const handleDeleteProject = async (id: number) => {
    try {
      const data = await apiDelete<{ projects?: Project[] }>(`/api/projects/${id}`)
      setProjects(data.projects ?? [])
      await refetch()
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    }
    setConfirmDelete(null)
  }

  if (loading) {
    return <div className="flex justify-center items-center py-10 text-muted-foreground text-sm">불러오는 중...</div>
  }

  const activeChapters = chapters.filter((c) => c.status === "active")
  const doneChapters = chapters.filter((c) => c.status === "done")
  const standaloneProjects = projects.filter((p) => p.chapter_id === null && p.status !== "done")
  const doneStandaloneProjects = projects.filter((p) => p.chapter_id === null && p.status === "done")
  const dueSoonProjects = projects.filter((p) => isDueSoon(p.due_date) && p.status !== "done")

  return (
    <div className="px-4 mt-3 pb-4 space-y-4">
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

      <div className="flex gap-2">
        <button
          onClick={() => { setAdding((v) => !v); setAddingBundle(false) }}
          className={`flex items-center gap-1.5 flex-1 py-2.5 px-3 rounded-xl border text-sm transition-colors ${
            adding ? "border-violet-500 text-violet-400 bg-violet-500/10" : "border-dashed border-border text-muted-foreground"
          }`}
        >
          <Plus size={14} /> 새 프로젝트
        </button>
        <button
          onClick={() => { setAddingBundle((v) => !v); setAdding(false) }}
          className={`flex items-center gap-1.5 flex-1 py-2.5 px-3 rounded-xl border text-sm transition-colors ${
            addingBundle ? "border-violet-500 text-violet-400 bg-violet-500/10" : "border-dashed border-border text-muted-foreground"
          }`}
        >
          <FolderPlus size={14} /> 새 묶음
        </button>
      </div>

      {adding && (
        <AddProjectForm
          chapters={activeChapters}
          onClose={() => setAdding(false)}
          onCreated={() => refetch()}
        />
      )}

      {addingBundle && (
        <AddChapterForm
          onClose={() => setAddingBundle(false)}
          onCreated={(newId) => {
            if (newId !== null) setExpandedChapters((prev) => new Set([...prev, newId]))
            refetch()
          }}
        />
      )}

      {activeChapters.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen size={13} className="text-violet-400" />
            <span className="text-xs font-bold text-violet-400">묶음</span>
            <span className="text-xs text-muted-foreground">{activeChapters.length}</span>
          </div>
          {activeChapters.map((ch) => (
            <ChapterSection
              key={ch.id}
              ch={ch}
              projects={projects}
              chapters={chapters}
              expanded={expandedChapters.has(ch.id)}
              toggleExpanded={() => toggleChapter(ch.id)}
              expandedProjectIds={expandedProjectIds}
              toggleProject={toggleProject}
              refetch={refetch}
              setProjects={setProjects}
              setChapters={setChapters}
              onExpGained={onExpGained}
              onConfirmDeleteProject={setConfirmDelete}
            />
          ))}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">단독 프로젝트</span>
          <span className="text-xs text-muted-foreground">{standaloneProjects.length}</span>
        </div>
        {standaloneProjects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            chapters={chapters}
            expanded={expandedProjectIds.has(p.id)}
            toggleExpand={() => toggleProject(p.id)}
            onMutated={(d) => { if (d.projects) setProjects(d.projects); else refetch() }}
            onDelete={() => setConfirmDelete({ id: p.id, name: p.name })}
            onExpGained={onExpGained}
          />
        ))}
        {standaloneProjects.length === 0 && (
          <div className="rounded-xl border border-dashed border-border px-4 py-5 text-center">
            <p className="text-xs text-muted-foreground">단독 프로젝트가 없습니다</p>
            <p className="text-[11px] text-muted-foreground mt-1">묶음에 속하지 않은 프로젝트가 여기에 표시됩니다</p>
          </div>
        )}
      </div>

      <DoneSection
        doneChapters={doneChapters}
        doneStandaloneProjects={doneStandaloneProjects}
        chapters={chapters}
        projects={projects}
        expandedProjectIds={expandedProjectIds}
        toggleProject={toggleProject}
        refetch={refetch}
        setProjects={setProjects}
        setChapters={setChapters}
        onExpGained={onExpGained}
        onConfirmDeleteProject={setConfirmDelete}
      />

      <Dialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>프로젝트 삭제</DialogTitle>
            <DialogDescription>&quot;{confirmDelete?.name}&quot;과 모든 하위 작업이 삭제됩니다.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-2 sm:justify-end">
            <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 rounded-xl border border-border text-sm">취소</button>
            <button onClick={() => confirmDelete && handleDeleteProject(confirmDelete.id)} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-bold">삭제</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
