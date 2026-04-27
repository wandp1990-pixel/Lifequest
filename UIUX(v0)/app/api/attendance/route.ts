import { NextResponse } from "next/server"
import { initDb, getTodayAttendance, checkAttendance, getCharacter } from "@/lib/db"

export async function GET() {
  await initDb()
  const { checked, streak } = await getTodayAttendance()
  return NextResponse.json({ checked, streak })
}

export async function POST() {
  await initDb()
  const { alreadyChecked, streak, bonusTickets } = await checkAttendance()
  if (alreadyChecked) {
    return NextResponse.json({ error: "오늘 이미 출석했습니다" }, { status: 400 })
  }
  const char = await getCharacter()
  return NextResponse.json({ draw_tickets: char.draw_tickets, streak, bonusTickets })
}
