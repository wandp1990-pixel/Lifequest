import * as db from "./db"
import { getClient, now } from "./db/client"
import { computeEffectiveStats } from "./character/stats"

// 특정 레벨 달성에 필요한 경험치 계산
// 기본값: base_exp=100, level_multiplier=1.01 → 레벨마다 1% 증가
// 잘못된 cfg(NaN/0/음수/<=1 mult) 방어 — gainExp의 while 루프 hang 방지
export function requiredExp(level: number, cfg: Record<string, string>): number {
  const baseRaw = parseFloat(cfg.base_exp ?? "100")
  const multRaw = parseFloat(cfg.level_multiplier ?? "1.01")
  const base = Number.isFinite(baseRaw) && baseRaw > 0 ? baseRaw : 100
  const mult = Number.isFinite(multRaw) && multRaw > 1 ? multRaw : 1.01
  const safeLevel = Math.max(1, Math.min(level, 10000))
  let val = base
  for (let i = 0; i < safeLevel - 1; i++) {
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
//
// cfg/bcfg/skills는 변경 빈도가 낮아 트랜잭션 외부 read 유지.
// equipment는 장착/뽑기로 자주 바뀌므로 트랜잭션 안에서 재read해 stale max_hp 방지.
export async function gainExp(expAmount: number) {
  const [cfg, bcfg, allSkills] = await Promise.all([
    db.getGameConfig(),
    db.getBattleConfig(),
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

    // 레벨업 루프: 현재 레벨의 필요 EXP를 초과할 때까지 반복.
    // 비현실적 EXP 입력/잘못된 cfg로 인한 무한 폭주 방지 위해 안전 상한.
    let leveledUp = false
    const MAX_LEVEL = 9999
    while (level < MAX_LEVEL && totalExp >= requiredExp(level, cfg)) {
      totalExp -= requiredExp(level, cfg)
      level++
      statPts += statPerLv
      skillPts += skillPerLv
      tickets += ticketPerLv
      leveledUp = true
    }

    const { maxHp, maxMp } = recalcHpMp({ ...char, level }, bcfg)

    const updates: Record<string, string | number | null> = {
      level,
      total_exp: totalExp,
      stat_points: statPts,
      skill_points: skillPts,
      draw_tickets: tickets,
      max_hp: maxHp,
      max_mp: maxMp,
      updated_at: now(),
    }

    // 레벨업 시: 장비 옵션(아이템 보너스) 포함해서 현재 HP/MP 풀 회복.
    // 트랜잭션 안에서 equipment를 재read해 동시 장착 변경으로 인한 max_hp 부풀림 방지.
    if (leveledUp) {
      const equipRes = await tx.execute("SELECT is_equipped, options FROM equipment")
      // 통일 helper: boostedSkills 자동 적용 — 장비 옵션의 `[스킬명]` 패시브 포함 effective max 산출
      const { combatStats: cs } = computeEffectiveStats(
        { ...char, level },
        equipRes.rows as unknown[],
        allSkills,
        bcfg,
      )
      updates.current_hp = Math.round(cs.max_hp)
      updates.current_mp = Math.round(cs.max_mp)
      // 풀회복 시 회복 기준점도 함께 리셋. 누락 시 풀회복 직후 HP 감소가 발생하면
      // calcRegen 이 레벨업 이전 시각 기준 elapsed 로 비정상 회복 계산함.
      updates.last_regen_at = now()
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
