/**
 * @module hooks/useProjects
 * @purpose /api/projects + /api/chapters 데이터 + refetch. ProjectsTab 의 자체 fetchAll 을 대체.
 *          TasksTab 은 projectCount 만 필요하므로 동일 훅으로 카운터를 계산 가능.
 * @do-not:
 *   - mutation (POST/PATCH/DELETE) 로직 추가는 Phase 4 의 ProjectsTab 분할과 함께 진행
 */

import { useCallback, useState } from "react"
import { apiGet, ApiError } from "./useApi"

export interface ProjectTask {
  id: number
  project_id: number
  name: string
  is_completed: number
  exp_reward: number
  sort_order: number
  created_at: string
  completed_at: string | null
}

export interface Project {
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

export interface Chapter {
  id: number
  name: string
  start_date: string | null
  end_date: string | null
  bonus_exp: number
  status: "active" | "done"
  total_projects: number
  done_projects: number
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    try {
      const [pData, cData] = await Promise.all([
        apiGet<{ projects?: Project[] }>("/api/projects"),
        apiGet<{ chapters?: Chapter[] }>("/api/chapters"),
      ])
      setProjects(pData.projects ?? [])
      setChapters(cData.chapters ?? [])
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    } finally {
      setLoading(false)
    }
  }, [])

  return { projects, setProjects, chapters, setChapters, loading, refetch }
}
