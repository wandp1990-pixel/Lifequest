/**
 * @module hooks/useChecklist
 * @purpose /api/checklist 데이터(items, checkedIds, groups, bonusGroupIds) 상태 + refetch.
 *          호출자는 setter 도 받아서 자식 컴포넌트(HabitSection) 의 mutation 응답을 부분 업데이트 가능.
 * @add-here:
 *   - checklist 전용 mutation 헬퍼 (예: complete, add, addGroup) 가 필요해지면 이 훅에 모아 추가
 * @do-not:
 *   - 응답 shape 변환 (API 응답을 그대로 state 로 옮김)
 */

import { useCallback, useState } from "react"
import type { HabitGroup } from "@/lib/db"
import { apiGet, ApiError } from "./useApi"

export interface DailyItem {
  id: number
  name: string
  fixed_exp: number
  streak?: number
  notify_time?: string | null
  days_since_last?: number | null
  group_id?: number | null
}

interface ChecklistResponse {
  items?: DailyItem[]
  checkedIds?: number[]
  groups?: HabitGroup[]
  bonusGroupIds?: number[]
}

export function useChecklist() {
  const [dailyItems, setDailyItems] = useState<DailyItem[]>([])
  const [checkedDailyIds, setCheckedDailyIds] = useState<Set<number>>(new Set())
  const [habitGroups, setHabitGroups] = useState<HabitGroup[]>([])
  const [bonusGroupIds, setBonusGroupIds] = useState<Set<number>>(new Set())

  const refetch = useCallback(async () => {
    try {
      const data = await apiGet<ChecklistResponse>("/api/checklist")
      setDailyItems(data.items ?? [])
      setCheckedDailyIds(new Set(data.checkedIds ?? []))
      setHabitGroups(data.groups ?? [])
      setBonusGroupIds(new Set(data.bonusGroupIds ?? []))
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    }
  }, [])

  return {
    dailyItems, setDailyItems,
    checkedDailyIds, setCheckedDailyIds,
    habitGroups, setHabitGroups,
    bonusGroupIds, setBonusGroupIds,
    refetch,
  }
}
