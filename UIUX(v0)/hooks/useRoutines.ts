/**
 * @module hooks/useRoutines
 * @purpose /api/routines 데이터(routines, checkedItemIds, bonusRoutineIds) + /api/chapters (active) 상태 + refetch.
 *          호출자는 setter 도 받아서 자식 컴포넌트(RoutineSection) 의 mutation 응답을 직접 반영 가능.
 * @add-here:
 *   - routine 전용 mutation 헬퍼가 모일 자리. 우선은 데이터/refetch 만 담당.
 */

import { useCallback, useState } from "react"
import type { Routine, RoutineChapter } from "@/components/game/RoutineSection"
import { apiGet, ApiError } from "./useApi"

interface RoutinesResponse {
  routines?: Routine[]
  checkedItemIds?: number[]
  bonusRoutineIds?: number[]
}

interface ChaptersResponse {
  chapters?: (RoutineChapter & { status: string })[]
}

export function useRoutines() {
  const [routines, setRoutines] = useState<Routine[]>([])
  const [checkedRoutineItemIds, setCheckedRoutineItemIds] = useState<Set<number>>(new Set())
  const [bonusRoutineIds, setBonusRoutineIds] = useState<Set<number>>(new Set())
  const [chapters, setChapters] = useState<RoutineChapter[]>([])

  const refetch = useCallback(async () => {
    try {
      const [routinesData, chaptersData] = await Promise.all([
        apiGet<RoutinesResponse>("/api/routines"),
        apiGet<ChaptersResponse>("/api/chapters"),
      ])
      setRoutines(routinesData.routines ?? [])
      setCheckedRoutineItemIds(new Set(routinesData.checkedItemIds ?? []))
      setBonusRoutineIds(new Set(routinesData.bonusRoutineIds ?? []))
      setChapters((chaptersData.chapters ?? []).filter((c) => c.status === "active"))
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    }
  }, [])

  return {
    routines, setRoutines,
    checkedRoutineItemIds, setCheckedRoutineItemIds,
    bonusRoutineIds, setBonusRoutineIds,
    chapters,
    refetch,
  }
}
