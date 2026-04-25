import { NextRequest, NextResponse } from "next/server"
import { initDb, getCharacter, getGameConfig, updateCharacter, getBattleConfig, getClient } from "@/lib/db"
import { requiredExp, recalcHpMp } from "@/lib/game"

export async function GET() {
  try {
    await initDb()
    const char = await getCharacter()
    if (!char) {
      return NextResponse.json({ error: "캐릭터 데이터 없음" }, { status: 404 })
    }
    const cfg = await getGameConfig()
    const nextExp = requiredExp(char.level, cfg)
    return NextResponse.json({ ...char, next_exp: nextExp })
  } catch (e) {
    console.error("[character]", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    await initDb()
    const db = getClient()
    await db.execute("DELETE FROM activity_log")
    await db.execute("DELETE FROM checklist_log")
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
      if (key in body && body[key] !== "" && !isNaN(Number(body[key]))) {
        fields[key] = Number(body[key])
      }
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
