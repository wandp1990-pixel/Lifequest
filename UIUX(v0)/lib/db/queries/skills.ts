import { getClient, now } from "../client"

export interface SkillRow {
  id: string
  name: string
  type: string
  max_skp: number
  unlock_level: number
  base_effect_value: number
  effect_coeff: number
  mp_cost: number
  mp_cost_coeff: number
  effect_code: string
  trigger_condition: string
  description: string
  invested: number
}

export interface SkillDbRow {
  id: string
  name: string
  type: string
  max_skp: number
  unlock_level: number
  base_effect_value: number
  effect_coeff: number
  base_trigger_param: number
  trigger_param_coeff: number
  mp_cost: number
  mp_cost_coeff: number
  effect_code: string
  trigger_condition: string
  description: string
  is_active: number
}

export async function getSkillsWithInvestment(): Promise<SkillRow[]> {
  const db = getClient()
  const res = await db.execute(`
    SELECT s.id, s.name, s.type, s.max_skp, s.unlock_level,
           s.base_effect_value, s.effect_coeff, s.mp_cost, s.mp_cost_coeff,
           s.effect_code, s.trigger_condition, s.description,
           COALESCE(l.invested_points, 0) AS invested
    FROM skill_table s
    LEFT JOIN skill_log l ON s.id = l.skill_id
    WHERE s.is_active = 1
    ORDER BY s.unlock_level ASC
  `)
  return res.rows.map((r) => ({
    id:                  r.id as string,
    name:                r.name as string,
    type:                r.type as string,
    max_skp:             r.max_skp as number,
    unlock_level:        r.unlock_level as number,
    base_effect_value:   r.base_effect_value as number,
    effect_coeff:        r.effect_coeff as number,
    mp_cost:             r.mp_cost as number,
    mp_cost_coeff:       r.mp_cost_coeff as number,
    effect_code:         r.effect_code as string,
    trigger_condition:   r.trigger_condition as string,
    description:         r.description as string,
    invested:            r.invested as number,
  }))
}

export async function getAllSkillsDb(): Promise<SkillDbRow[]> {
  const db = getClient()
  const res = await db.execute(`
    SELECT id, name, type, max_skp, unlock_level,
           base_effect_value, effect_coeff, base_trigger_param, trigger_param_coeff,
           mp_cost, mp_cost_coeff, effect_code, trigger_condition, description, is_active
    FROM skill_table
    ORDER BY unlock_level ASC, id ASC
  `)
  return res.rows.map((r) => ({
    id:                  r.id as string,
    name:                r.name as string,
    type:                r.type as string,
    max_skp:             r.max_skp as number,
    unlock_level:        r.unlock_level as number,
    base_effect_value:   r.base_effect_value as number,
    effect_coeff:        r.effect_coeff as number,
    base_trigger_param:  r.base_trigger_param as number,
    trigger_param_coeff: r.trigger_param_coeff as number,
    mp_cost:             r.mp_cost as number,
    mp_cost_coeff:       r.mp_cost_coeff as number,
    effect_code:         r.effect_code as string,
    trigger_condition:   r.trigger_condition as string,
    description:         r.description as string,
    is_active:           r.is_active as number,
  }))
}

export async function createSkillDb(data: Omit<SkillDbRow, "is_active"> & { is_active?: number }): Promise<void> {
  const db = getClient()
  await db.execute({
    sql: `INSERT INTO skill_table
      (id, name, type, max_skp, unlock_level, base_effect_value, effect_coeff,
       base_trigger_param, trigger_param_coeff, mp_cost, mp_cost_coeff,
       effect_code, trigger_condition, description, is_active)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [
      data.id, data.name, data.type, data.max_skp, data.unlock_level,
      data.base_effect_value, data.effect_coeff, data.base_trigger_param ?? 0,
      data.trigger_param_coeff ?? 0, data.mp_cost, data.mp_cost_coeff,
      data.effect_code, data.trigger_condition, data.description, data.is_active ?? 1,
    ],
  })
}

export async function updateSkillDb(id: string, data: Partial<Omit<SkillDbRow, "id">>): Promise<void> {
  const db = getClient()
  const fields = Object.keys(data)
  if (fields.length === 0) return
  const sets = fields.map((f) => `${f} = ?`).join(", ")
  const vals = fields.map((f) => (data as Record<string, unknown>)[f])
  await db.execute({ sql: `UPDATE skill_table SET ${sets} WHERE id = ?`, args: [...vals, id] })
}

export async function deleteSkillDb(id: string): Promise<void> {
  const db = getClient()
  await db.execute({ sql: "DELETE FROM skill_log WHERE skill_id = ?", args: [id] })
  await db.execute({ sql: "DELETE FROM skill_table WHERE id = ?", args: [id] })
}

export async function saveSkillInvestments(
  investments: Record<string, number>
): Promise<void> {
  const db = getClient()
  const t = now()
  for (const [skillId, points] of Object.entries(investments)) {
    const existing = await db.execute({
      sql: "SELECT id FROM skill_log WHERE skill_id = ?",
      args: [skillId],
    })
    if (existing.rows.length > 0) {
      await db.execute({
        sql: "UPDATE skill_log SET invested_points = ?, is_unlocked = ?, updated_at = ? WHERE skill_id = ?",
        args: [points, points > 0 ? 1 : 0, t, skillId],
      })
    } else {
      await db.execute({
        sql: "INSERT INTO skill_log (skill_id, invested_points, is_unlocked, updated_at) VALUES (?, ?, ?, ?)",
        args: [skillId, points, points > 0 ? 1 : 0, t],
      })
    }
  }
}
