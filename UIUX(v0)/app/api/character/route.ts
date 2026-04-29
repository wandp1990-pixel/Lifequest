import { NextRequest, NextResponse } from "next/server"
import { initDb, getCharacter, getGameConfig, updateCharacter, getBattleConfig, getClient, getEquipment, getSkillsWithInvestment } from "@/lib/db"
import { requiredExp, recalcHpMp } from "@/lib/game"
import { buildPlayerCombatStats, parseEquippedStatBonuses } from "@/lib/battle"
import { ensureChecklistItems } from "@/lib/db/seed"

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

    const equippedOptions = (equipment as { is_equipped: number; options: string }[])
      .filter((e) => e.is_equipped === 1)
      .map((e) => e.options)

    const cs = buildPlayerCombatStats(char, equippedOptions, bcfg, allSkills)
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

export async function DELETE(req: NextRequest) {
  try {
    await initDb()
    const db = getClient()
    const mode = new URL(req.url).searchParams.get("mode") ?? "full"

    await db.execute("DELETE FROM activity_log")
    await db.execute("DELETE FROM checklist_log")
    await db.execute("DELETE FROM equipment")
    await db.execute("DELETE FROM routine_log")
    await db.execute("DELETE FROM routine_bonus_log")
    await db.execute("DELETE FROM skill_log")
    await db.execute("DELETE FROM battle_log")
    await db.execute("DELETE FROM attendance_log")

    if (mode === "full") {
      await db.execute("DELETE FROM todo_item")
      await db.execute("DELETE FROM checklist_item")
      await db.execute("DELETE FROM routine_item")
      await db.execute("DELETE FROM routine")
      await ensureChecklistItems(db)
    } else {
      await db.execute("UPDATE checklist_item SET streak=0, best_streak=0")
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await initDb()
    const body = await req.json()
    const allowed = ["str", "vit", "dex", "int_stat", "luk", "stat_points", "skill_points",
                     "level", "total_exp", "current_hp", "current_mp", "draw_tickets",
                     "clear_count", "task_count"]
    const fields: Record<string, number | string> = {}
    for (const key of allowed) {
      if (!(key in body) || body[key] === "") continue
      const n = Number(body[key])
      if (!Number.isFinite(n)) continue
      // level은 1 이상, 나머지 수치는 0 이상으로 캡
      const min = key === "level" ? 1 : 0
      fields[key] = Math.max(min, Math.floor(n))
    }
    if (typeof body.name === "string") {
      const trimmed = body.name.trim().slice(0, 20)
      if (trimmed) fields.name = trimmed
    }
    if (Object.keys(fields).length > 0) {
      const char = await getCharacter()
      const bcfg = await getBattleConfig()
      const merged = { ...char, ...fields } as typeof char
      const { maxHp, maxMp } = recalcHpMp(merged, bcfg)
      await updateCharacter({
        ...fields,
        max_hp: maxHp,
        max_mp: maxMp,
        current_hp: Math.min(merged.current_hp, maxHp),
        current_mp: Math.min(merged.current_mp, maxMp),
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
