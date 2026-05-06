import * as db from "./db"
import { getClient, now } from "./db/client"
import { buildPlayerCombatStats } from "./battle"

// 특정 레벨 달성에 필요한 경험치 계산
// 기본값: base_exp=100, level_multiplier=1.01 → 레벨마다 1% 증가
export function requiredExp(level: number, cfg: Record<string, string>): number {
  const base = parseFloat(cfg.base_exp ?? "100")
  const mult = parseFloat(cfg.level_multiplier ?? "1.01")
  let val = base
  for (let i = 0; i < level - 1; i++) {
    val = Math.ceil(val * mult)
  }
  return Math.floor(val)
}

// VIT/INT 스탯을 기반으로 최대 HP/MP 재계산
// base_hp + (VIT * vit_to_max_hp), base_mp + (INT * int_to_max_mp)
export function recalcHpMp(
  char: db.Character,
  bcfg: Record<string, string>
): { maxHp: number; maxMp: number } {
  const vitToHp = parseFloat(bcfg.vit_to_max_hp ?? "10")
  const intToMp = parseFloat(bcfg.int_to_max_mp ?? "5")
  return {
    maxHp: char.base_hp + Math.floor(char.vit * vitToHp),
    maxMp: char.base_mp + Math.floor(char.int_stat * intToMp),
  }
}

// EXP 획득 및 레벨업 처리 (transaction 보장)
// 1. 누적 EXP에 지급 EXP 더함
// 2. 필요 EXP 체크하며 레벨업 (stat_points/skill_points/draw_tickets 지급)
// 3. 레벨업 시 HP/MP 풀 회복 (아이템 보너스 포함)
export async function gainExp(expAmount: number) {
  const [cfg, bcfg, equipment, allSkills] = await Promise.all([
    db.getGameConfig(),
    db.getBattleConfig(),
    db.getEquipment(),
    db.getSkillsWithInvestment(),
  ])

  const client = getClient()
  const tx = await client.transaction("write")
  try {
    const charRes = await tx.execute("SELECT * FROM character WHERE id = 1")
    const char = charRes.rows[0] as unknown as db.Character

    const oldLevel = char.level
    let totalExp = char.total_exp + expAmount
    let level = oldLevel
    let statPts = char.stat_points
    let skillPts = char.skill_points
    let tickets = char.draw_tickets

    const statPerLv = parseInt(cfg.stat_points_per_level ?? "3")
    const skillPerLv = parseInt(cfg.skill_points_per_level ?? "2")
    const ticketPerLv = parseInt(cfg.draw_tickets_per_level ?? "1")

    // 레벨업 루프: 현재 레벨의 필요 EXP를 초과할 때까지 반복
    let leveledUp = false
    while (totalExp >= requiredExp(level, cfg)) {
      totalExp -= requiredExp(level, cfg)
      level++
      statPts += statPerLv
      skillPts += skillPerLv
      tickets += ticketPerLv
      leveledUp = true
    }

    const { maxHp, maxMp } = recalcHpMp({ ...char, level }, bcfg)

    const updates: Record<string, unknown> = {
      level,
      total_exp: totalExp,
      stat_points: statPts,
      skill_points: skillPts,
      draw_tickets: tickets,
      max_hp: maxHp,
      max_mp: maxMp,
      updated_at: now(),
    }

    // 레벨업 시: 장비 옵션(아이템 보너스) 포함해서 현재 HP/MP 풀 회복
    if (leveledUp) {
      const equippedOptions = (equipment as { is_equipped: number; options: string }[])
        .filter((e) => e.is_equipped === 1)
        .map((e) => e.options)
      const cs = buildPlayerCombatStats({ ...char, level }, equippedOptions, bcfg, allSkills)
      updates.current_hp = Math.round(cs.max_hp)
      updates.current_mp = Math.round(cs.max_mp)
    }

    const sets = Object.keys(updates).map((k) => `${k} = ?`).join(", ")
    const vals = [...Object.values(updates), 1]
    await tx.execute({ sql: `UPDATE character SET ${sets} WHERE id = ?`, args: vals })
    await tx.commit()

    return {
      leveledUp,
      oldLevel,
      newLevel: level,
      rewards: {
        statPoints: statPts - char.stat_points,
        skillPoints: skillPts - char.skill_points,
        drawTickets: tickets - char.draw_tickets,
      },
    }
  } catch (e) {
    await tx.rollback()
    throw e
  }
}
