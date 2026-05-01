import { NextRequest, NextResponse } from "next/server"
import {
  initDb, getCharacter, getEquipment, getGameConfig, getBattleConfig,
  getSkillsWithInvestment, getClient,
} from "@/lib/db"
import { now } from "@/lib/db/client"
import { generateMonster, buildPlayerCombatStats, runBattle, getActiveSkills, parseEquippedStatBonuses, type Monster } from "@/lib/battle"
import { calcRegen } from "@/lib/regen"

function isMonsterStats(value: unknown): value is Monster["stats"] {
  if (!value || typeof value !== "object") return false
  const s = value as Record<string, unknown>
  return ["HP", "patk", "matk", "pdef", "mdef", "dex", "luk"].every((k) => Number.isFinite(s[k]))
}

function isValidMonster(value: unknown): value is Monster {
  if (!value || typeof value !== "object") return false
  const m = value as Record<string, unknown>
  return typeof m.full_name === "string"
    && typeof m.grade_code === "string"
    && typeof m.grade_name === "string"
    && typeof m.race_name === "string"
    && typeof m.race_emoji === "string"
    && typeof m.color === "string"
    && Number.isFinite(m.ticket_reward)
    && Number.isFinite(m.total_coeff)
    && isMonsterStats(m.stats)
}

function parsePendingMonster(raw: string | null | undefined): Monster | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return isValidMonster(parsed) ? parsed : null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDb()

    let body: { monster?: Monster } = {}
    try { body = await req.json() } catch {}

    const [char, gameCfg, battleCfg, equipment, allSkills] = await Promise.all([
      getCharacter(), getGameConfig(), getBattleConfig(),
      getEquipment(), getSkillsWithInvestment(),
    ])

    const equippedOptions = equipment
      .filter((e) => (e.is_equipped as number) === 1)
      .map((e) => e.options as string)

    const activeSkills = getActiveSkills(allSkills)
    const playerCombat = buildPlayerCombatStats(char, equippedOptions, battleCfg, allSkills)
    const pendingMonster = parsePendingMonster(char.pending_battle_monster)

    const gradeKeys = ["C", "B", "A", "S", "SR", "SSR", "UR"]
    const maxUnlockedIdx = char.max_cleared_grade ? gradeKeys.indexOf(char.max_cleared_grade) + 1 : 0
    const providedGradeIdx = body.monster ? gradeKeys.indexOf(body.monster.grade_code) : -1
    const useProvided = isValidMonster(body.monster) && providedGradeIdx >= 0 && providedGradeIdx <= maxUnlockedIdx

    // 저장된 재도전 몬스터가 있으면 항상 그 몬스터를 우선 사용한다.
    const monster = pendingMonster
      ?? (useProvided ? body.monster! : generateMonster(char.clear_count ?? 0, char.level, gameCfg, char.max_cleared_grade ?? null))

    monster.ticket_reward = parseInt(gameCfg[`monster_grade_${monster.grade_code}_tickets`] ?? "1")

    // 전투 후 HP/MP 처리 모드 (full / none / half)
    const restoreMode = (battleCfg.restore_hp_after_battle ?? "full").toLowerCase()

    // last_regen_at 기준 자연 회복 적용 (화면에 표시되는 regen된 HP와 일치시키기 위함)
    const effMaxHp = Math.round(playerCombat.max_hp)
    const effMaxMp = Math.round(playerCombat.max_mp)
    const itemBonus = parseEquippedStatBonuses(equippedOptions)
    const regenedHp = calcRegen(char.current_hp, effMaxHp, char.vit + itemBonus.vit, char.last_regen_at)
    const regenedMp = calcRegen(char.current_mp, effMaxMp, char.int_stat + itemBonus.int_stat, char.last_regen_at)

    // none/half 모드에서는 regen 적용한 HP/MP를 전투 시작값으로 사용
    const startHp = restoreMode === "full" ? undefined : regenedHp
    const startMp = restoreMode === "full" ? undefined : regenedMp
    const result = runBattle(playerCombat, monster, battleCfg, activeSkills, 30, startHp, startMp)

    const finalHp = restoreMode === "full" ? Math.round(playerCombat.max_hp)
                  : restoreMode === "half" ? Math.min(Math.round(playerCombat.max_hp), result.player_final_hp + Math.round(playerCombat.max_hp / 2))
                  : result.player_final_hp
    const finalMp = restoreMode === "full" ? Math.round(playerCombat.max_mp)
                  : restoreMode === "half" ? Math.min(Math.round(playerCombat.max_mp), result.player_final_mp + Math.round(playerCombat.max_mp / 2))
                  : result.player_final_mp

    const regenAt = now()
    const db = getClient()
    const tx = await db.transaction("write")
    try {
      if (result.winner === "플레이어") {
        const prevIdx = char.max_cleared_grade ? gradeKeys.indexOf(char.max_cleared_grade) : -1
        const curIdx  = gradeKeys.indexOf(monster.grade_code)
        const newMaxGrade = curIdx > prevIdx ? monster.grade_code : (char.max_cleared_grade ?? null)
        await tx.execute({
          sql: `UPDATE character
                SET draw_tickets = ?, clear_count = ?, current_hp = ?, current_mp = ?,
                    last_regen_at = ?, max_cleared_grade = ?, pending_battle_monster = NULL, updated_at = ?
                WHERE id = 1`,
          args: [
            char.draw_tickets + result.ticket_reward,
            (char.clear_count ?? 0) + 1,
            finalHp,
            finalMp,
            regenAt,
            newMaxGrade,
            regenAt,
          ],
        })
      } else {
        await tx.execute({
          sql: `UPDATE character
                SET current_hp = ?, current_mp = ?, last_regen_at = ?,
                    pending_battle_monster = ?, updated_at = ?
                WHERE id = 1`,
          args: [
            finalHp,
            finalMp,
            regenAt,
            JSON.stringify(monster),
            regenAt,
          ],
        })
      }

      await tx.execute({
        sql: "INSERT INTO battle_log (monster_name,monster_grade,result,exp_gained,draw_tickets,log_data,created_at) VALUES (?,?,?,?,?,?,?)",
        args: [
          monster.full_name,
          monster.grade_code,
          result.winner,
          0,
          result.ticket_reward,
          JSON.stringify(result.logs as object[]),
          regenAt,
        ],
      })
      await tx.execute(
        "DELETE FROM battle_log WHERE id NOT IN (SELECT id FROM battle_log ORDER BY id DESC LIMIT 10)"
      )
      await tx.commit()
    } catch (e) {
      await tx.rollback()
      throw e
    }

    const charFinal = await getCharacter()

    return NextResponse.json({
      ...result,
      exp_gained: 0,
      leveled_up: false,
      char_after: {
        level:        charFinal.level,
        draw_tickets: charFinal.draw_tickets,
        clear_count:  charFinal.clear_count ?? 0,
      },
    })
  } catch (e) {
    console.error("[battle]", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
