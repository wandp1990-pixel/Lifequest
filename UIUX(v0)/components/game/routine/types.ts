/**
 * @module components/game/routine/types
 * @purpose 루틴 섹션 공유 타입.
 */

export interface RoutineItem {
  id: number
  routine_id: number
  name: string
  fixed_exp: number
}

export interface Routine {
  id: number
  name: string
  deadline_time: string | null
  chapter_id: number | null
  items: RoutineItem[]
}

export interface RoutineChapter {
  id: number
  name: string
}

export type DeleteTarget =
  | { type: "routine"; id: number; name: string }
  | { type: "routineItem"; id: number; name: string }
