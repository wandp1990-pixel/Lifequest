export type Chapter = {
  id: number
  name: string
  start_date: string | null
  end_date: string | null
  bonus_tickets: number
  status: 'active' | 'done'
  created_at: string
  completed_at: string | null
}

export type ChapterWithProgress = Chapter & {
  total_projects: number
  done_projects: number
}

export type Project = {
  id: number
  name: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  bonus_exp: number
  due_date: string | null
  color: string
  chapter_id: number | null
  created_at: string
  completed_at: string | null
}

export type ProjectTask = {
  id: number
  project_id: number
  name: string
  is_completed: number
  exp_reward: number
  sort_order: number
  created_at: string
  completed_at: string | null
}

export type ProjectWithTasks = Project & {
  tasks: ProjectTask[]
  progress: number
}

export type Character = {
  id: number
  name: string
  level: number
  total_exp: number
  stat_points: number
  skill_points: number
  draw_tickets: number
  clear_count: number
  task_count: number
  str: number
  vit: number
  dex: number
  int_stat: number
  luk: number
  base_hp: number
  base_mp: number
  current_hp: number
  max_hp: number
  current_mp: number
  max_mp: number
  attendance_streak: number
  max_cleared_grade: string | null
  last_regen_at: string | null
  pending_battle_monster: string | null
}
