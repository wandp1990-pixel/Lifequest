import { NextRequest, NextResponse } from "next/server"
import {
  initDb, getCharacter, getEquipment, getGameConfig, getBattleConfig,
  updateCharacter, addBattleLog, getSkillsWithInvestment,
} from "@/lib/db"
import { now } from "@/lib/db/client"
import { generateMonster, buildPlayerCombatStats, runBattle, getActiveSkills, type Monster } from "@/lib/battle"

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
    const monster      = body.monster ?? generateMonster(char.clear_count ?? 0, char.level, gameCfg, char.max_cleared_grade ?? null)
    const result       = runBattle(playerCombat, monster, battleCfg, activeSkills)

    // 전투 후 HP/MP 처리 모드 (full / none / half)
    const restoreMode = (battleCfg.restore_hp_after_battle ?? "full").toLowerCase()
    const finalHp = restoreMode === "full" ? Math.round(playerCombat.max_hp)
                  : restoreMode === "half" ? Math.min(Math.round(playerCombat.max_hp), result.player_final_hp + Math.round(playerCombat.max_hp / 2))
                  : result.player_final_hp
    const finalMp = restoreMode === "full" ? Math.round(playerCombat.max_mp)
                  : restoreMode === "half" ? Math.min(Math.round(playerCombat.max_mp), result.player_final_mp + Math.round(playerCombat.max_mp / 2))
                  : result.player_final_mp

    const regenAt = now()
    if (result.winner === "플레이어") {
      const GRADE_KEYS = ["C", "B", "A", "S", "SR", "SSR", "UR"]
      const prevIdx    = char.max_cleared_grade ? GRADE_KEYS.indexOf(char.max_cleared_grade) : -1
      const curIdx     = GRADE_KEYS.indexOf(monster.grade_code)
      const newMaxGrade = curIdx > prevIdx ? monster.grade_code : (char.max_cleared_grade ?? null)
      await updateCharacter({
        draw_tickets:      char.draw_tickets + result.ticket_reward,
        clear_count:       (char.clear_count ?? 0) + 1,
        current_hp:        finalHp,
        current_mp:        finalMp,
        last_regen_at:     regenAt,
        max_cleared_grade: newMaxGrade,
      })
    } else {
      await updateCharacter({
        current_hp:    finalHp,
        current_mp:    finalMp,
        last_regen_at: regenAt,
      })
    }

    await addBattleLog(
      monster.full_name, monster.grade_code,
      result.winner, 0, result.ticket_reward,
      result.logs as object[]
    )

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
