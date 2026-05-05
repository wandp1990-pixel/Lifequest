import { getClient, now } from "../client"
import type { Project, ProjectTask, ProjectWithTasks } from "../types"

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
    const project = row as unknown as Project
    const tasks = tasksByProject.get(project.id) ?? []
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
  fields: Partial<Pick<Project, 'name' | 'description' | 'status' | 'priority' | 'due_date' | 'bonus_exp' | 'color'>>
): Promise<void> {
  const db = getClient()
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined)
  if (entries.length === 0) return
  const sets = entries.map(([k]) => `${k}=?`).join(", ")
  const args = [...entries.map(([, v]) => v), id]
  await db.execute({ sql: `UPDATE project SET ${sets} WHERE id=?`, args })
}

export async function completeProject(id: number): Promise<void> {
  const db = getClient()
  await db.execute({
    sql: "UPDATE project SET status='done', completed_at=? WHERE id=?",
    args: [now(), id],
  })
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

export async function completeProjectTask(id: number): Promise<void> {
  const db = getClient()
  await db.execute({
    sql: "UPDATE project_task SET is_completed=1, completed_at=? WHERE id=?",
    args: [now(), id],
  })
}

export async function deleteProjectTask(id: number): Promise<void> {
  const db = getClient()
  await db.execute({ sql: "DELETE FROM project_task WHERE id=?", args: [id] })
}

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
    await completeProject(projectId)
    return true
  }
  return false
}

export async function getProjectById(id: number): Promise<Project | null> {
  const db = getClient()
  const res = await db.execute({ sql: "SELECT * FROM project WHERE id=?", args: [id] })
  if (res.rows.length === 0) return null
  return res.rows[0] as unknown as Project
}
