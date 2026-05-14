/**
 * @module components/game/habit/types
 * @purpose 습관 섹션 내부에서 공유하는 타입.
 */

export interface DailyItem {
  id: number
  name: string
  fixed_exp: number
  streak?: number
  notify_time?: string | null
  days_since_last?: number | null
  group_id?: number | null
}

export type DeleteTarget = { type: "daily"; id: number; name: string }
