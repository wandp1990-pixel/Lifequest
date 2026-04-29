import { NextRequest, NextResponse } from "next/server"
import {
  initDb, getCharacter, getEquipment, getGameConfig, getBattleConfig,
  updateCharacter, addBattleLog, getSkillsWithInvestment,
} from "@/lib/db"
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

    if (result.winner === "플레이어") {
      const GRADE_KEYS = ["C", "B", "A", "S", "SR", "SSR", "UR"]
      const prevIdx    = char.max_cleared_grade ? GRADE_KEYS.indexOf(char.max_cleared_grade) : -1
      const curIdx     = GRADE_KEYS.indexOf(monster.grade_code)
      const newMaxGrade = curIdx > prevIdx ? monster.grade_code : (char.max_cleared_grade ?? null)
      await updateCharacter({
        draw_tickets:      char.draw_tickets + result.ticket_reward,
        clear_count:       (char.clear_count ?? 0) + 1,
        current_hp:        result.player_max_hp,
        current_mp:        result.player_max_mp,
        max_cleared_grade: newMaxGrade,
      })
    } else {
      // 패배해도 HP/MP 전량 회복
      await updateCharacter({
        current_hp: result.player_max_hp,
        current_mp: result.player_max_mp,
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
