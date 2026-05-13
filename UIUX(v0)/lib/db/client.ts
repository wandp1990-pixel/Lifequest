import { createClient, type Client } from "@libsql/client"

// KST 시간 헬퍼는 lib/time/kst 가 단일 출처. 후방 호환을 위해 re-export.
// 후속 PR(Phase 2~)에서 모든 import 를 lib/time/kst 로 옮기고 여기 re-export 는 제거 예정.
export { now, todayKST } from "@/lib/time/kst"

let _client: Client | null = null

export function getClient(): Client {
  if (!_client) {
    _client = createClient({
      url: process.env.TURSO_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })
  }
  return _client
}
