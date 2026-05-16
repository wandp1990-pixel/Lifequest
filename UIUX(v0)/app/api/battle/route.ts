import { NextResponse } from "next/server"
import {
  initDb, getCharacter, getEquipment, getGameConfig, getBattleConfig,
  getSkillsWithInvestment, getClient,
} from "@/lib/db"
import { now } from "@/lib/db/client"
import { generateMonster, runBattle, getActiveSkills, parseEquippedStatBonuses, type Monster } from "@/lib/battle"
import { computeEffectiveStats } from "@/lib/character/stats"
import { calcRegen } from "@/lib/regen"

// 타입 가드: 몬스터 스탯 필드 유효성 검사
function isMonsterStats(value: unknown): value is Monster["stats"] {
  if (!value || typeof value !== "object") return false
  const s = value as Record<string, unknown>
  return ["HP", "patk", "matk", "pdef", "mdef", "dex", "luk"].every((k) => Number.isFinite(s[k]))
}

// 타입 가드: 전체 Monster 객체 유효성 검사
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

// DB에 JSON 문자열로 저장된 pending_battle_monster 파싱
// 재도전 몬스터가 유효하면 그것을 사용, 아니면 null 반환
function parsePendingMonster(raw: string | null | undefined): Monster | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return isValidMonster(parsed) ? parsed : null
  } catch {
    return null
  }
}

// 전투 처리: 몬스터 생성/재사용, 전투 시뮬레이션, 결과 저장
// 재도전 몬스터(pending)가 있으면 우선, 없으면 신규 생성
// 승패에 따라 다른 DB 업데이트 로직 적용
export async function POST() {
  try {
    await initDb()

    const [char, gameCfg, battleCfg, equipment, allSkills] = await Promise.all([
      getCharacter(), getGameConfig(), getBattleConfig(),
      getEquipment(), getSkillsWithInvestment(),
    ])

    // 통일 helper: 장비 옵션 추출 + 패시브 합산 + 전투 스탯 계산 한 번에
    const { equippedOptions, boostedSkills, combatStats: playerCombat } =
      computeEffectiveStats(char, equipment, allSkills, battleCfg)
    const activeSkills = getActiveSkills(boostedSkills)
    // 지난 패배에서 저장된 재도전 몬스터 파싱
    const pendingMonster = parsePendingMonster(char.pending_battle_monster)

    // 재도전 몬스터 우선 사용, 없으면 신규 몬스터 생성
    // 이를 통해 패배 후 반복 도전 시 동일 몬스터로 강화 시간 제공
    const monster = pendingMonster
      ?? generateMonster(char.clear_count ?? 0, char.level, gameCfg, char.max_cleared_grade ?? null)

    const gradeKeys = ["C", "B", "A", "S", "SR", "SSR", "UR"]

    // DB 설정에서 등급별 뽑기권 보상값 덮어쓰기
    monster.ticket_reward = parseInt(gameCfg[`monster_grade_${monster.grade_code}_tickets`] ?? "1")

    // 전투 후 HP/MP 회복 정책:
    // - "full": 전투 시작 시 풀회복 (이중 회복 없음)
    // - "half": 전투 시작 시 max/2 보장 (자연회복이 더 크면 자연회복 유지). 전투 종료 후 추가 회복 없음
    // - "none": 자연회복(calcRegen) 값으로 시작, 종료 후 추가 회복 없음
    // 회복 시계(last_regen_at)는 "none"에서는 갱신하지 않아 회복 진행이 리셋되지 않도록 함.
    // "full"/"half"는 전투 시작 시 자연회복 또는 max 보정으로 시계가 의미 없어지므로 갱신.
    const restoreMode = (battleCfg.restore_hp_after_battle ?? "full").toLowerCase()

    // last_regen_at 기준 자연회복 적용 (서버-클라이언트 HP 표시 일치 보장)
    const effMaxHp = Math.round(playerCombat.max_hp)
    const effMaxMp = Math.round(playerCombat.max_mp)
    const itemBonus = parseEquippedStatBonuses(equippedOptions)
    const regenedHp = calcRegen(char.current_hp, effMaxHp, char.vit + itemBonus.vit, char.last_regen_at)
    const regenedMp = calcRegen(char.current_mp, effMaxMp, char.int_stat + itemBonus.int_stat, char.last_regen_at)

    // startHp/startMp 결정 — 이중 회복 방지를 위해 finalHp 후처리는 제거하고 모드별로 시작값에 정책 반영
    // "full": undefined → runBattle 내부에서 max로 시작
    // "half": max(regenedHp, effMax/2) — 자연회복이 절반 이상이면 자연회복 유지
    // "none": regenedHp 그대로
    const startHp = restoreMode === "full" ? undefined
                  : restoreMode === "half" ? Math.max(regenedHp, Math.floor(effMaxHp / 2))
                  : regenedHp
    const startMp = restoreMode === "full" ? undefined
                  : restoreMode === "half" ? Math.max(regenedMp, Math.floor(effMaxMp / 2))
                  : regenedMp
    const result = runBattle(playerCombat, monster, battleCfg, activeSkills, 30, startHp, startMp)

    // 전투 후 HP/MP 최종값 = 전투 결과 그대로. 추가 회복은 시작값에 이미 반영됨
    // "full" 모드만 풀회복 유지 (시작 max, 종료도 max로 통일 — 회복 정책)
    const finalHp = restoreMode === "full" ? Math.round(playerCombat.max_hp) : result.player_final_hp
    const finalMp = restoreMode === "full" ? Math.round(playerCombat.max_mp) : result.player_final_mp

    // last_regen_at 갱신 정책: "none"은 회복 시계 유지 (사용자에게 불리한 시계 리셋 방지)
    // "full"/"half"는 시작 시 회복 정책으로 자연회복 시계가 의미 없어지므로 now() 로 리셋
    const regenAt = now()
    const newLastRegenAt = restoreMode === "none" ? (char.last_regen_at ?? regenAt) : regenAt
    const db = getClient()
    const tx = await db.transaction("write")
    try {
      if (result.winner === "플레이어") {
        // 승리 시: 뽑기권 증가, 클리어 카운트 증가, 최고 클리어 등급 갱신
        const prevIdx = char.max_cleared_grade ? gradeKeys.indexOf(char.max_cleared_grade) : -1
        const curIdx  = gradeKeys.indexOf(monster.grade_code)
        // 더 높은 등급을 클리어했으면 갱신, 아니면 기존값 유지 (하위등급 재도전으로 인한 하향 방지)
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
            newLastRegenAt,
            newMaxGrade,
            regenAt,
          ],
        })
      } else {
        // 패배 시: 현재 몬스터를 JSON으로 저장 (재도전 시 동일 몬스터 강제)
        // 유저가 동일 몬스터에 다시 도전할 수 있도록 유도하는 설계
        await tx.execute({
          sql: `UPDATE character
                SET current_hp = ?, current_mp = ?, last_regen_at = ?,
                    pending_battle_monster = ?, updated_at = ?
                WHERE id = 1`,
          args: [
            finalHp,
            finalMp,
            newLastRegenAt,
            JSON.stringify(monster),
            regenAt,
          ],
        })
      }

      // 전투 로그 기록 (턴 상세 정보 JSON으로 저장)
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
      // 최근 10개 전투 로그만 유지 (초과분 자동 삭제)
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
