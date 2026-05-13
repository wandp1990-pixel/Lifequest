import { getTodayAttendance, checkAttendance, getCharacter } from "@/lib/db"
import { ok, badRequest, withInit } from "@/lib/api/respond"

export const GET = withInit(async () => {
  const { checked, streak } = await getTodayAttendance()
  return ok({ checked, streak })
})

export const POST = withInit(async () => {
  const { alreadyChecked, streak, bonusTickets } = await checkAttendance()
  if (alreadyChecked) return badRequest("오늘 이미 출석했습니다")
  const char = await getCharacter()
  return ok({ draw_tickets: char.draw_tickets, streak, bonusTickets })
})
