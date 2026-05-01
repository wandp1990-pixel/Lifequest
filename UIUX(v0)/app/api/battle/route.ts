import { NextRequest, NextResponse } from "next/server"
import {
  initDb, getCharacter, getEquipment, getGameConfig, getBattleConfig,
  updateCharacter, addBattleLog, getSkillsWithInvestment,
} from "@/lib/db"
import { now } from "@/lib/db/client"
import { generateMonster, buildPlayerCombatStats, runBattle, getActiveSkills, parseEquippedStatBonuses, type Monster } from "@/lib/battle"
import { calcRegen } from "@/lib/regen"

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
    const GRADE_KEYS_ORDER = ["C", "B", "A", "S", "SR", "SSR", "UR"]
    const maxUnlockedIdx = char.max_cleared_grade ? GRADE_KEYS_ORDER.indexOf(char.max_cleared_grade) + 1 : 0
    const providedGradeIdx = body.monster ? GRADE_KEYS_ORDER.indexOf(body.monster.grade_code) : -1
    const useProvided = body.monster && providedGradeIdx >= 0 && providedGradeIdx <= maxUnlockedIdx
    const monster = useProvided ? body.monster! : generateMonster(char.clear_count ?? 0, char.level, gameCfg, char.max_cleared_grade ?? null)
    if (useProvided) {
      monster.ticket_reward = parseInt(gameCfg[`monster_grade_${monster.grade_code}_tickets`] ?? "1")
    }

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
