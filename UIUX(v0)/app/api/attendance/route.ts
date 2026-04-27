import { NextResponse } from "next/server"
import { initDb, getTodayAttendance, checkAttendance, getCharacter } from "@/lib/db"

export async function GET() {
  await initDb()
  const checked = await getTodayAttendance()
  return NextResponse.json({ checked })
}

export async function POST() {
  await initDb()
  const { alreadyChecked } = await checkAttendance()
  if (alreadyChecked) {
    return NextResponse.json({ error: "오늘 이미 출석했습니다" }, { status: 400 })
  }
  const char = await getCharacter()
  return NextResponse.json({ draw_tickets: char.draw_tickets })
}
