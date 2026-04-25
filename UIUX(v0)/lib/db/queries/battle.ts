import { getClient, now } from "../client"

export async function addBattleLog(
  monsterName: string, monsterGrade: string, result: string,
  expGained: number, drawTickets: number, logData: object[]
) {
  const db = getClient()
  await db.execute({
    sql: "INSERT INTO battle_log (monster_name,monster_grade,result,exp_gained,draw_tickets,log_data,created_at) VALUES (?,?,?,?,?,?,?)",
    args: [monsterName, monsterGrade, result, expGained, drawTickets, JSON.stringify(logData), now()],
  })
  await db.execute(
    "DELETE FROM battle_log WHERE id NOT IN (SELECT id FROM battle_log ORDER BY id DESC LIMIT 10)"
  )
}
