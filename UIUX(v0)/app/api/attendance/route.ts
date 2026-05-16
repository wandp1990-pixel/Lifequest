import { getTodayAttendance, checkAttendance } from "@/lib/db"
import { ok, withInit } from "@/lib/api/respond"

export const GET = withInit(async () => {
  return ok(await getTodayAttendance())
})

export const POST = withInit(async () => {
  // 이미 출석한 경우도 200 + alreadyChecked 플래그로 응답.
  // 400 으로 막으면 클라이언트가 res.ok=false 처리해 상태 동기화가 깨질 수 있음.
  return ok(await checkAttendance())
})
