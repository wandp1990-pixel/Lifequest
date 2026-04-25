import { NextRequest, NextResponse } from "next/server"
import { initDb, getGameConfigFull, updateGameConfigValue } from "@/lib/db"

export async function GET() {
  try {
    await initDb()
    return NextResponse.json(await getGameConfigFull())
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await initDb()
    const { key, value } = await req.json()
    if (!key) return NextResponse.json({ error: "key 필요" }, { status: 400 })
    await updateGameConfigValue(key, String(value))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
