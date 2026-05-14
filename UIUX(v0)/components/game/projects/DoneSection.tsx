/**
 * @module components/game/projects/DoneSection
 * @purpose 완료된 챕터/프로젝트 토글 섹션. 완료 챕터는 인라인 요약, 완료 프로젝트는 ProjectCard 재사용.
 */

"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Trophy, X } from "lucide-react"
import { PROJECT_COLOR_CLS } from "@/lib/constants/ui"
import { apiDelete, ApiError } from "@/hooks/useApi"
import type { Chapter, Project } from "@/hooks/useProjects"
import ProjectCard from "./ProjectCard"

interface Props {
  doneChapters: Chapter[]
  doneStandaloneProjects: Project[]
  chapters: Chapter[]
  projects: Project[]
  expandedProjectIds: Set<number>
  toggleProject: (id: number) => void
  refetch: () => Promise<void>
  setProjects: (p: Project[]) => void
  setChapters: (c: Chapter[]) => void
  onToast: (msg: string, exp?: number) => void
  onExpGained?: () => void
  onConfirmDeleteProject: (target: { id: number; name: string }) => void
}

export default function DoneSection({
  doneChapters, doneStandaloneProjects, chapters, projects,
  expandedProjectIds, toggleProject,
  refetch, setProjects, setChapters,
  onToast, onExpGained, onConfirmDeleteProject,
}: Props) {
  const [showDone, setShowDone] = useState(false)
  const totalDone = doneChapters.length + doneStandaloneProjects.length

  const handleDeleteChapter = async (id: number) => {
    try {
      const data = await apiDelete<{ chapters?: Chapter[] }>(`/api/chapters/${id}`)
      setChapters(data.chapters ?? [])
      await refetch()
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    }
  }

  if (totalDone === 0) return null

  return (
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
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${PROJECT_COLOR_CLS[p.color] ?? "bg-violet-500"} opacity-40`} />
                    <span className="text-[11px] line-through text-muted-foreground flex-1 truncate">{p.name}</span>
                  </div>
                ))}
              </div>
            )
          })}
          {doneStandaloneProjects.length > 0 && (
            <div className="space-y-2">
              {doneStandaloneProjects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  chapters={chapters}
                  expanded={expandedProjectIds.has(p.id)}
                  toggleExpand={() => toggleProject(p.id)}
                  onMutated={(d) => { if (d.projects) setProjects(d.projects); else refetch() }}
                  onDelete={() => onConfirmDeleteProject({ id: p.id, name: p.name })}
                  onExpGained={onExpGained}
                  onToast={onToast}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
