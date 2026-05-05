import { getClient, now } from "../client"
import type { ChapterWithProgress } from "../types"

export async function getChapters(): Promise<ChapterWithProgress[]> {
  const db = getClient()
  const chapters = await db.execute(
    "SELECT * FROM chapter ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, id DESC"
  )
  const result: ChapterWithProgress[] = []
  for (const row of chapters.rows) {
    const chapterId = Number(row.id)
    const stats = await db.execute({
      sql: "SELECT COUNT(*) as total, SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done FROM project WHERE chapter_id=?",
      args: [chapterId],
    })
    const total = Number(stats.rows[0].total)
    const done  = Number(stats.rows[0].done)
    result.push({
      id:            chapterId,
      name:          String(row.name),
      start_date:    row.start_date ? String(row.start_date) : null,
      end_date:      row.end_date   ? String(row.end_date)   : null,
      bonus_tickets: Number(row.bonus_tickets),
      status:        row.status as 'active' | 'done',
      created_at:    String(row.created_at),
      completed_at:  row.completed_at ? String(row.completed_at) : null,
      total_projects: total,
      done_projects:  done,
    })
  }
  return result
}

export async function addChapter(
  name: string,
  startDate: string | null,
  endDate: string | null,
  bonusTickets: number,
): Promise<void> {
  const db = getClient()
  await db.execute({
    sql: "INSERT INTO chapter (name, start_date, end_date, bonus_tickets, status, created_at) VALUES (?,?,?,?,'active',?)",
    args: [name, startDate ?? null, endDate ?? null, bonusTickets, now()],
  })
}

export async function completeChapter(id: number): Promise<void> {
  const db = getClient()
  await db.execute({
    sql: "UPDATE chapter SET status='done', completed_at=? WHERE id=?",
    args: [now(), id],
  })
}

export async function deleteChapter(id: number): Promise<void> {
  const db = getClient()
  await db.execute({ sql: "UPDATE project SET chapter_id=NULL WHERE chapter_id=?", args: [id] })
  await db.execute({ sql: "DELETE FROM chapter WHERE id=?", args: [id] })
}
