/**
 * @module hooks/useMidnightRefresh
 * @purpose KST 자정마다 callback 호출. 사용자가 앱을 24h+ 켜놓아도 매일 자정에 데이터 갱신.
 *          재귀적으로 다음 자정 timer 를 다시 예약하므로 setTimeout 의 32-bit overflow 우려도 없음.
 * @do-not:
 *   - KST 오프셋 상수 하드코딩. lib/constants/time.ts 의 KST_OFFSET_MS 사용.
 */

import { useEffect } from "react"
import { KST_OFFSET_MS, ONE_DAY_MS } from "@/lib/constants/time"

export function useMidnightRefresh(callback: () => void) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const kstNow = () => new Date(Date.now() + KST_OFFSET_MS)
    const msUntilMidnight = () => {
      const n = kstNow()
      return ONE_DAY_MS - ((n.getUTCHours() * 3600 + n.getUTCMinutes() * 60 + n.getUTCSeconds()) * 1000 + n.getUTCMilliseconds())
    }
    const schedule = () => {
      timer = setTimeout(() => {
        callback()
        schedule()
      }, msUntilMidnight())
    }
    schedule()
    return () => clearTimeout(timer)
  }, [callback])
}
