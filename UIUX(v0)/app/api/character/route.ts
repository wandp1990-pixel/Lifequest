import { NextRequest, NextResponse } from "next/server"
import { initDb, initDbSchemaOnly, getCharacter, getGameConfig, updateCharacter, getBattleConfig, getClient, getEquipment, getSkillsWithInvestment } from "@/lib/db"
import { requiredExp, recalcHpMp } from "@/lib/game"
import { buildPlayerCombatStats, parseEquippedStatBonuses } from "@/lib/battle"
import { ensureChecklistItems } from "@/lib/db/seed"

// 캐릭터 정보 조회 + 장비/스킬 포함 effective 스탯 계산
// effective: buildPlayerCombatStats로 계산한 아이템/패시브 보너스 포함 최종 스탯
// item_stat_bonuses: 기초 스탯(STR/VIT/DEX/INT/LUK)의 아이템 보너스만 분리
export async function GET() {
  try {
    await initDb()
    const char = await getCharacter()
    if (!char) {
      return NextResponse.json({ error: "캐릭터 데이터 없음" }, { status: 404 })
    }
    const [cfg, bcfg, equipment, allSkills] = await Promise.all([
      getGameConfig(), getBattleConfig(), getEquipment(), getSkillsWithInvestment(),
    ])
    const nextExp = requiredExp(char.level, cfg)

    // 장착된 장비의 옵션 문자열 추출
    const equippedOptions = (equipment as { is_equipped: number; options: string }[])
      .filter((e) => e.is_equipped === 1)
      .map((e) => e.options)

    // 전투 스탯 계산 (패시브 스킬 % 보너스 포함)
    const cs = buildPlayerCombatStats(char, equippedOptions, bcfg, allSkills)
    // 기초 스탯의 아이템 보너스만 추출
    const itemStatBonuses = parseEquippedStatBonuses(equippedOptions)

    const finalVit = char.vit + itemStatBonuses.vit
    const finalInt = char.int_stat + itemStatBonuses.int_stat

    return NextResponse.json({
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
        accuracy_bonus: Math.round(cs.bonus_accuracy * 1000) / 10,
        evasion_bonus:  Math.round(cs.bonus_evasion * 1000) / 10,
        double_attack: cs.double_attack_chance > 0,
        life_steal:    cs.life_steal_ratio > 0,
        def_ignore:    cs.defense_ignore_ratio > 0,
        reflect:       cs.reflect_ratio > 0,
      },
      item_stat_bonuses: itemStatBonuses,
    })
  } catch (e) {
    console.error("[character]", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

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
export async function PUT(req: NextRequest) {
  try {
    await initDb()
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
      const equippedOptions = (equipment as { is_equipped: number; options: string }[])
        .filter((e) => e.is_equipped === 1)
        .map((e) => e.options)
      const cs = buildPlayerCombatStats(merged, equippedOptions, bcfg, allSkills)
      const effMaxHp = Math.round(cs.max_hp)
      const effMaxMp = Math.round(cs.max_mp)

      await updateCharacter({
        ...fields,
        max_hp: maxHp,
        max_mp: maxMp,
        current_hp: Math.min(merged.current_hp, effMaxHp),
        current_mp: Math.min(merged.current_mp, effMaxMp),
      })
    }
    const char = await getCharacter()
    const cfg = await getGameConfig()
    const nextExp = requiredExp(char.level, cfg)
    return NextResponse.json({ ...char, next_exp: nextExp })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
