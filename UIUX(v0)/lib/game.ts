import * as db from "./db"
import { buildPlayerCombatStats } from "./battle"

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
  const [char, cfg, bcfg, equipment, allSkills] = await Promise.all([
    db.getCharacter(),
    db.getGameConfig(),
    db.getBattleConfig(),
    db.getEquipment(),
    db.getSkillsWithInvestment(),
  ])

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

  const updates: Parameters<typeof db.updateCharacter>[0] = {
    level,
    total_exp: totalExp,
    stat_points: statPts,
    skill_points: skillPts,
    draw_tickets: tickets,
    max_hp: maxHp,
    max_mp: maxMp,
  }
  if (leveledUp) {
    const equippedOptions = (equipment as { is_equipped: number; options: string }[])
      .filter((e) => e.is_equipped === 1)
      .map((e) => e.options)
    const cs = buildPlayerCombatStats({ ...char, level }, equippedOptions, bcfg, allSkills)
    updates.current_hp = Math.round(cs.max_hp)
    updates.current_mp = Math.round(cs.max_mp)
  }

  await db.updateCharacter(updates)

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
