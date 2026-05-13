import { getClient, now } from "../client"
import type { Project, ProjectTask, ProjectWithTasks } from "../types"

function calcProjectBonusExp(tasks: ProjectTask[]): number {
  return tasks.reduce((sum, task) => sum + Number(task.exp_reward ?? 0), 0)
}

export async function getProjects(): Promise<ProjectWithTasks[]> {
  const db = getClient()
  const projectsRes = await db.execute(
    "SELECT * FROM project ORDER BY CASE status WHEN 'in_progress' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END, id DESC"
  )
  const tasksRes = await db.execute(
    "SELECT * FROM project_task ORDER BY sort_order ASC, id ASC"
  )

  const tasksByProject = new Map<number, ProjectTask[]>()
  for (const row of tasksRes.rows) {
    const pid = Number(row.project_id)
    if (!tasksByProject.has(pid)) tasksByProject.set(pid, [])
    tasksByProject.get(pid)!.push(row as unknown as ProjectTask)
  }

  return projectsRes.rows.map((row) => {
    const rawProject = row as unknown as Project
    const tasks = tasksByProject.get(rawProject.id) ?? []
    const project = { ...rawProject, bonus_exp: calcProjectBonusExp(tasks) }
    const total = tasks.length
    const done = tasks.filter((t) => t.is_completed).length
    const progress = total === 0 ? 0 : Math.round((done / total) * 100)
    return { ...project, tasks, progress }
  })
}

export async function addProject(
  name: string,
  description: string,
  priority: string,
  bonusExp: number,
  dueDate: string | null,
  color: string,
  chapterId: number | null = null,
): Promise<void> {
  const db = getClient()
  await db.execute({
    sql: "INSERT INTO project (name, description, priority, bonus_exp, due_date, color, chapter_id, status, created_at) VALUES (?,?,?,?,?,?,?,'todo',?)",
    args: [name, description, priority, bonusExp, dueDate ?? null, color, chapterId ?? null, now()],
  })
}

export async function updateProject(
  id: number,
  fields: Partial<Pick<Project, 'name' | 'description' | 'status' | 'priority' | 'due_date' | 'bonus_exp' | 'color' | 'chapter_id'>>
): Promise<void> {
  const db = getClient()
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined)
  if (entries.length === 0) return
  const sets = entries.map(([k]) => `${k}=?`).join(", ")
  const args = [...entries.map(([, v]) => v), id]
  await db.execute({ sql: `UPDATE project SET ${sets} WHERE id=?`, args })
}

// 재완료 가드: 이미 done이면 false. 새로 완료된 경우만 true.
export async function completeProject(id: number): Promise<boolean> {
  const db = getClient()
  const res = await db.execute({
    sql: "UPDATE project SET status='done', completed_at=? WHERE id=? AND status!='done'",
    args: [now(), id],
  })
  return res.rowsAffected > 0
}

export async function deleteProject(id: number): Promise<void> {
  const db = getClient()
  await db.execute({ sql: "DELETE FROM project_task WHERE project_id=?", args: [id] })
  await db.execute({ sql: "DELETE FROM project WHERE id=?", args: [id] })
}

export async function addProjectTask(
  projectId: number,
  name: string,
  expReward: number
): Promise<void> {
  const db = getClient()
  const countRes = await db.execute({
    sql: "SELECT COUNT(*) as cnt FROM project_task WHERE project_id=?",
    args: [projectId],
  })
  const sortOrder = Number(countRes.rows[0].cnt)
  await db.execute({
    sql: "INSERT INTO project_task (project_id, name, exp_reward, sort_order, created_at) VALUES (?,?,?,?,?)",
    args: [projectId, name, expReward, sortOrder, now()],
  })
  // 첫 task 추가 시 프로젝트를 in_progress로 전환
  await db.execute({
    sql: "UPDATE project SET status='in_progress' WHERE id=? AND status='todo'",
    args: [projectId],
  })
}

export async function updateProjectTaskExp(id: number, expReward: number): Promise<void> {
  const db = getClient()
  await db.execute({
    sql: "UPDATE project_task SET exp_reward=? WHERE id=?",
    args: [expReward, id],
  })
}

// race 방어: 미완료 상태일 때만 통과.
export async function completeProjectTask(id: number): Promise<boolean> {
  const db = getClient()
  const res = await db.execute({
    sql: "UPDATE project_task SET is_completed=1, completed_at=? WHERE id=? AND is_completed=0",
    args: [now(), id],
  })
  return res.rowsAffected > 0
}

export async function deleteProjectTask(id: number): Promise<void> {
  const db = getClient()
  await db.execute({ sql: "DELETE FROM project_task WHERE id=?", args: [id] })
}

// 모든 task가 끝났을 때만 프로젝트를 완료. completeProject가 conditional이라
// 동시 호출 시 한 쪽만 true를 받음 → 보너스 중복 지급 방지.
export async function checkAndCompleteProject(projectId: number): Promise<boolean> {
  const db = getClient()
  const res = await db.execute({
    sql: "SELECT COUNT(*) as total, SUM(is_completed) as done FROM project_task WHERE project_id=?",
    args: [projectId],
  })
  const row = res.rows[0]
  const total = Number(row.total)
  const done = Number(row.done)
  if (total > 0 && done === total) {
    return await completeProject(projectId)
  }
  return false
}

export async function getProjectById(id: number): Promise<(Project & { tasks: ProjectTask[] }) | null> {
  const db = getClient()
  const res = await db.execute({ sql: "SELECT * FROM project WHERE id=?", args: [id] })
  if (res.rows.length === 0) return null
  const project = res.rows[0] as unknown as Project
  const tasksRes = await db.execute({
    sql: "SELECT * FROM project_task WHERE project_id=? ORDER BY sort_order ASC, id ASC",
    args: [id],
  })
  const tasks = tasksRes.rows as unknown as ProjectTask[]
  return { ...project, bonus_exp: calcProjectBonusExp(tasks), tasks }
}
