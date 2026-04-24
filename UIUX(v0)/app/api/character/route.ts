import { NextResponse } from "next/server"
import { initDb, getCharacter, getGameConfig } from "@/lib/db"
import { requiredExp } from "@/lib/game"

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
