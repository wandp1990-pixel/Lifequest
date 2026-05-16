import { NextRequest, NextResponse } from "next/server"
import { initDbSchemaOnly, getCharacter, getGameConfig, updateCharacter, getBattleConfig, getClient, getEquipment, getSkillsWithInvestment } from "@/lib/db"
import { requiredExp, recalcHpMp } from "@/lib/game"
import { buildPlayerCombatStats, parseEquippedStatBonuses } from "@/lib/battle"
import { ensureChecklistItems } from "@/lib/db/seed"
import { ok, notFound, withInit } from "@/lib/api/respond"
import { now } from "@/lib/time/kst"

// 캐릭터 정보 조회 + 장비/스킬 포함 effective 스탯 계산
// effective: buildPlayerCombatStats로 계산한 아이템/패시브 보너스 포함 최종 스탯
// item_stat_bonuses: 기초 스탯(STR/VIT/DEX/INT/LUK)의 아이템 보너스만 분리
export const GET = withInit(async () => {
  const char = await getCharacter()
  if (!char) {
    return notFound("캐릭터 데이터 없음")
  }
  const [cfg, bcfg, equipment, allSkills] = await Promise.all([
    getGameConfig(), getBattleConfig(), getEquipment(), getSkillsWithInvestment(),
  ])
  const nextExp = requiredExp(char.level, cfg)

  // 장착된 장비의 옵션 문자열 추출
  const equippedOptions = (equipment as unknown as { is_equipped: number; options: string }[])
    .filter((e) => e.is_equipped === 1)
    .map((e) => e.options)

  // 전투 스탯 계산 (패시브 스킬 % 보너스 포함)
  const cs = buildPlayerCombatStats(char, equippedOptions, bcfg, allSkills)
  // 기초 스탯의 아이템 보너스만 추출
  const itemStatBonuses = parseEquippedStatBonuses(equippedOptions)

  const finalVit = char.vit + itemStatBonuses.vit
  const finalInt = char.int_stat + itemStatBonuses.int_stat

  return ok({
    ...char,
    next_exp: nextExp,
    effective: {
      patk:          Math.round(cs.patk),
      matk:          Math.round(cs.matk),
      pdef:          Math.round(cs.pdef),
      mdef:          Math.round(cs.mdef),
      dex:           Math.round(cs.dex),
      luk:           Math.round(cs.luk),
      vit:           Math.round(finalVit),
      int:           Math.round(finalInt),
      max_hp:        Math.round(cs.max_hp),
      max_mp:        Math.round(cs.max_mp),
      // 치명타율/명중/회피: 소수점 1자리 %로 표시 (예: 12.5%)
      crit_rate:     Math.round(cs.bonus_crit_rate * 1000) / 10,
      // 치명타 피해는 이미 % 단위 (예: "치명타피해 +50%" → 50)
      crit_dmg:      Math.round(cs.bonus_crit_dmg * 10) / 10,
      accuracy_bonus: Math.round(cs.bonus_accuracy * 1000) / 10,
      evasion_bonus:  Math.round(cs.bonus_evasion * 1000) / 10,
      // 패시브 능력: ratio(0~1) → % 정수. 0이면 미보유
      double_attack: Math.round(cs.double_attack_chance * 100),
      life_steal:    Math.round(cs.life_steal_ratio * 100),
      def_ignore:    Math.round(cs.defense_ignore_ratio * 100),
      reflect:       Math.round(cs.reflect_ratio * 100),
    },
    item_stat_bonuses: itemStatBonuses,
  })
})

// 캐릭터 데이터 삭제/초기화
// mode="full": 완전 초기화 (할일/습관/루틴 제거, 기본 체크리스트 재생성)
// mode 다른 값: 소프트 리셋 (스트릭만 초기화, 아이템/스킬 유지)
// initDbSchemaOnly 사용: seed 데이터 재생성 스킵 (첫 실행 아님)
export async function DELETE(req: NextRequest) {
  try {
    await initDbSchemaOnly()
    const db = getClient()
    const mode = new URL(req.url).searchParams.get("mode") ?? "full"

    // 공통 삭제: 모든 로그 및 임시 데이터
    await db.execute("DELETE FROM activity_log")
    await db.execute("DELETE FROM checklist_log")
    await db.execute("DELETE FROM equipment")
    await db.execute("DELETE FROM routine_log")
    await db.execute("DELETE FROM routine_bonus_log")
    await db.execute("DELETE FROM skill_log")
    await db.execute("DELETE FROM battle_log")
    await db.execute("DELETE FROM attendance_log")
    // 재도전 몬스터 저장 제거
    await db.execute("UPDATE character SET pending_battle_monster = NULL WHERE id = 1")

    if (mode === "full") {
      // 완전 초기화: 할일, 체크리스트, 루틴 모두 제거 후 기본값 재생성
      await db.execute("DELETE FROM todo_item")
      await db.execute("DELETE FROM checklist_item")
      await db.execute("DELETE FROM routine_item")
      await db.execute("DELETE FROM routine")
      await ensureChecklistItems(db)
    } else {
      // 소프트 리셋: 체크리스트 스트릭만 초기화, 항목 유지
      await db.execute("UPDATE checklist_item SET streak=0, best_streak=0")
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// 캐릭터 스탯 부분 업데이트 (화이트리스트 패턴으로 보안)
// allowed 필드만 수용, level은 최소 1, 나머지는 최소 0
// 수치 변경 시 max_hp/mp 재계산, 장비 보너스 포함 effective max로 current 캡
export const PUT = withInit(async (req: NextRequest) => {
  const body = await req.json()
  // 허용된 필드 목록 (SQL injection 방지)
  const allowed = ["str", "vit", "dex", "int_stat", "luk", "stat_points", "skill_points",
                   "level", "total_exp", "current_hp", "current_mp", "draw_tickets",
                   "clear_count", "task_count"]
  const fields: Record<string, number | string> = {}
  for (const key of allowed) {
    if (!(key in body) || body[key] === "") continue
    const n = Number(body[key])
    if (!Number.isFinite(n)) continue
    // level은 최소 1, 나머지 수치는 최소 0
    const min = key === "level" ? 1 : 0
    fields[key] = Math.max(min, Math.floor(n))
  }
  // name은 별도 처리: 20자 제한, trim
  if (typeof body.name === "string") {
    const trimmed = body.name.trim().slice(0, 20)
    if (trimmed) fields.name = trimmed
  }
  if (Object.keys(fields).length > 0) {
    const char = await getCharacter()
    const [bcfg, equipment, allSkills] = await Promise.all([
      getBattleConfig(), getEquipment(), getSkillsWithInvestment(),
    ])
    const merged = { ...char, ...fields } as typeof char
    // 기본 max_hp/mp 계산 (VIT/INT 기반, 아이템 제외)
    const { maxHp, maxMp } = recalcHpMp(merged, bcfg)

    // 장비 + 패시브 스킬 포함 effective max 계산
    // current_hp가 새로운 max를 초과하지 않도록 캡 (단, 아이템으로 부풀린 HP는 보존)
    const equippedOptions = (equipment as unknown as { is_equipped: number; options: string }[])
      .filter((e) => e.is_equipped === 1)
      .map((e) => e.options)
    const cs = buildPlayerCombatStats(merged, equippedOptions, bcfg, allSkills)
    const effMaxHp = Math.round(cs.max_hp)
    const effMaxMp = Math.round(cs.max_mp)

    // current_hp / current_mp 가 수동 편집된 경우, 회복 기준점(last_regen_at)도 함께 리셋.
    // 누락 시: 수동 편집 후 calcRegen 호출이 과거 시각 기준 elapsed 로 비정상 회복하는 버그.
    const updateFields: Record<string, number | string> = {
      ...fields,
      max_hp: maxHp,
      max_mp: maxMp,
      current_hp: Math.min(merged.current_hp, effMaxHp),
      current_mp: Math.min(merged.current_mp, effMaxMp),
    }
    if ("current_hp" in fields || "current_mp" in fields) {
      updateFields.last_regen_at = now()
    }
    await updateCharacter(updateFields)
  }
  const char = await getCharacter()
  const cfg = await getGameConfig()
  const nextExp = requiredExp(char.level, cfg)
  return ok({ ...char, next_exp: nextExp })
})
