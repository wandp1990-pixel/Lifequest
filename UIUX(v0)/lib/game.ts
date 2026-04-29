import * as db from "./db"

export function requiredExp(level: number, cfg: Record<string, string>): number {
  const base = parseFloat(cfg.base_exp ?? "100")
  const mult = parseFloat(cfg.level_multiplier ?? "1.01")
  let val = base
  for (let i = 0; i < level - 1; i++) {
    val = Math.ceil(val * mult)
  }
  return Math.floor(val)
}

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

export async function gainExp(expAmount: number) {
  const char = await db.getCharacter()
  const cfg = await db.getGameConfig()
  const bcfg = await db.getBattleConfig()

  const oldLevel = char.level
  let totalExp = char.total_exp + expAmount
  let level = oldLevel
  let statPts = char.stat_points
  let skillPts = char.skill_points
  let tickets = char.draw_tickets

  const statPerLv = parseInt(cfg.stat_points_per_level ?? "3")
  const skillPerLv = parseInt(cfg.skill_points_per_level ?? "2")
  const ticketPerLv = parseInt(cfg.draw_tickets_per_level ?? "1")

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

  // DB의 max_hp/max_mp는 항상 base+stat 기준(장비 보너스 미포함). current도 동일 기준으로 캡.
  // 장비 보너스를 포함한 effective max는 /api/character GET에서 별도 계산.
  const currentHp = leveledUp ? maxHp : Math.min(char.current_hp, maxHp)
  const currentMp = leveledUp ? maxMp : Math.min(char.current_mp, maxMp)

  await db.updateCharacter({
    level,
    total_exp: totalExp,
    stat_points: statPts,
    skill_points: skillPts,
    draw_tickets: tickets,
    max_hp: maxHp,
    max_mp: maxMp,
    current_hp: currentHp,
    current_mp: currentMp,
  })

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
}
