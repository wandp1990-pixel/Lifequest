import { NextRequest, NextResponse } from "next/server"
import { initDb, getBattleConfigFull, updateBattleConfigValue } from "@/lib/db"

export async function GET() {
  try {
    await initDb()
    const rows = await getBattleConfigFull()
    const mapped = rows.map((r) => ({
      config_key: r.config_key,
      config_value: r.config_value,
      label: r.label,
      min_val: r.min_val,
      max_val: r.max_val,
      step: r.step,
    }))
    return NextResponse.json(mapped)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await initDb()
    const { key, value } = await req.json()
    if (!key) return NextResponse.json({ error: "key 필요" }, { status: 400 })
    await updateBattleConfigValue(key, String(value))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
