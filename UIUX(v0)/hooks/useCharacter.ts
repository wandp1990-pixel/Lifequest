/**
 * @module hooks/useCharacter
 * @purpose /api/character 데이터(레벨/스탯/장비 효과 포함) + refetch.
 *          page.tsx 의 fetchChar 패턴을 추출해 GameContainer/탭들이 동일 hook 사용 가능.
 *          gainExp 후 갱신 트리거는 호출자가 refetch() 를 명시적으로 호출.
 */

import { useCallback, useState } from "react"
import { apiGet, ApiError } from "./useApi"

export type CharacterData = {
  name: string
  level: number
  total_exp: number
  next_exp: number
  current_hp: number
  max_hp: number
  current_mp: number
  max_mp: number
  draw_tickets: number
  clear_count: number
  task_count: number
  stat_points: number
  skill_points: number
  str: number
  vit: number
  dex: number
  int_stat: number
  luk: number
  last_regen_at?: string | null
  effective?: {
    patk: number; matk: number; pdef: number; mdef: number
    dex: number; luk: number; vit: number; int: number
    max_hp: number; max_mp: number
    crit_rate: number; crit_dmg: number
    accuracy_bonus: number; evasion_bonus: number
    double_attack: number; life_steal: number; def_ignore: number; reflect: number
  }
  item_stat_bonuses?: { str: number; vit: number; dex: number; int_stat: number; luk: number }
  max_cleared_grade?: string | null
  pending_battle_monster?: string | null
}

export function useCharacter() {
  const [char, setChar] = useState<CharacterData | null>(null)

  const refetch = useCallback(async () => {
    try {
      const data = await apiGet<CharacterData>("/api/character")
      setChar(data)
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    }
  }, [])

  return { char, setChar, refetch }
}
