import { NextRequest, NextResponse } from "next/server"
import {
  initDb, getCharacter, getEquipment, getGameConfig, getBattleConfig,
  updateCharacter, addBattleLog, getSkillsWithInvestment,
} from "@/lib/db"
import { generateMonster, buildPlayerCombatStats, runBattle, getActiveSkills, type Monster } from "@/lib/battle"
import { gainExp } from "@/lib/game"

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
    const monster      = body.monster ?? generateMonster(char.clear_count ?? 0, char.level, gameCfg)
    const result       = runBattle(playerCombat, monster, battleCfg, activeSkills)

    let expGained = 0
    let gainResult = null

    if (result.winner === "플레이어") {
      expGained  = monster.exp_reward
      gainResult = await gainExp(expGained)

      // EXP 업데이트 후 다시 읽어 최신 draw_tickets + max_hp/mp 반영
      const charAfterExp = await getCharacter()
      await updateCharacter({
        draw_tickets: charAfterExp.draw_tickets + result.ticket_reward,
        clear_count:  (charAfterExp.clear_count ?? 0) + 1,
        current_hp:   charAfterExp.max_hp,
        current_mp:   charAfterExp.max_mp,
      })
    } else {
      // 패배해도 HP/MP 전량 회복
      await updateCharacter({
        current_hp: char.max_hp,
        current_mp: char.max_mp,
      })
    }

    await addBattleLog(
      monster.full_name, monster.grade_code,
      result.winner, expGained, result.ticket_reward,
      result.logs as object[]
    )

    const charFinal = await getCharacter()

    return NextResponse.json({
      ...result,
      exp_gained: expGained,
      leveled_up: gainResult?.leveledUp ?? false,
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
