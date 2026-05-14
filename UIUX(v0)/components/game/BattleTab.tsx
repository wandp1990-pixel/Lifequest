/**
 * @module components/game/BattleTab
 * @purpose 전투 탭 컨테이너. phase(lobby/loading/result) 전환 + battle config + 저장된 몬스터 복원.
 *          POST /api/battle. 결과는 ResultView로 전달.
 *          char/refetch 는 CharacterContext 에서 직접 구독 (Phase 5.1).
 */

"use client"

import { useState, useEffect } from "react"
import LobbyView from "./battle/LobbyView"
import ResultView from "./battle/ResultView"
import {
  GRADE_KEYS,
  type BattleResultData,
  type Monster,
  type RestoreMode,
} from "./battle/types"
import { useCharacterCtx } from "@/contexts/CharacterContext"

type BattleScales = { clearScale: number; levelScale: number }
const DEFAULT_SCALES: BattleScales = { clearScale: 0.03, levelScale: 0.04 }

export default function BattleTab() {
  const { char, refetch } = useCharacterCtx()
  const [phase, setPhase]   = useState<"lobby" | "loading" | "result">("lobby")
  const [result, setResult] = useState<BattleResultData | null>(null)
  const [error, setError]   = useState<string | null>(null)
  const [savedMonster, setSavedMonster] = useState<Monster | null>(null)
  const [scales, setScales] = useState<BattleScales>(DEFAULT_SCALES)
  const [restoreMode, setRestoreMode] = useState<RestoreMode>("full")

  useEffect(() => {
    try {
      const raw = char?.pending_battle_monster
      if (!raw) { setSavedMonster(null); return }
      const m: Monster = JSON.parse(raw)
      const maxClearedIdx = char?.max_cleared_grade ? GRADE_KEYS.indexOf(char.max_cleared_grade) : -1
      const gradeIdx = GRADE_KEYS.indexOf(m.grade_code)
      setSavedMonster(gradeIdx >= 0 && gradeIdx <= maxClearedIdx + 1 ? m : null)
    } catch {
      setSavedMonster(null)
    }
  }, [char?.pending_battle_monster, char?.max_cleared_grade])

  useEffect(() => {
    let cancelled = false
    async function loadScales() {
      try {
        const [bcRes, gcRes] = await Promise.all([
          fetch("/api/battle-config"),
          fetch("/api/config"),
        ])
        const next: BattleScales = { ...DEFAULT_SCALES }
        if (bcRes.ok) {
          const rows: { config_key: string; config_value: string }[] = await bcRes.json()
          const byKey = Object.fromEntries(rows.map((r) => [r.config_key, r.config_value]))
          const rm = (byKey.restore_hp_after_battle ?? "full").toLowerCase()
          if (!cancelled && (rm === "full" || rm === "none" || rm === "half")) setRestoreMode(rm)
        }
        if (gcRes.ok) {
          const rows: { config_key: string; config_value: string }[] = await gcRes.json()
          const byKey = Object.fromEntries(rows.map((r) => [r.config_key, r.config_value]))
          next.clearScale = parseFloat(byKey.monster_clear_scale ?? String(DEFAULT_SCALES.clearScale))
          next.levelScale = parseFloat(byKey.monster_level_scale ?? String(DEFAULT_SCALES.levelScale))
        }
        if (!cancelled) setScales(next)
      } catch {}
    }
    loadScales()
    return () => { cancelled = true }
  }, [])

  async function doFight() {
    setPhase("loading")
    setError(null)
    try {
      const res = await fetch("/api/battle", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "전투 오류")
      setResult(data)
      setSavedMonster(data.winner === "플레이어" ? null : data.monster)
      setPhase("result")
      refetch()
    } catch (e) {
      setError(String(e))
      setPhase("lobby")
    }
  }

  function newBattle() {
    setPhase("lobby")
    setResult(null)
    refetch()
  }

  if (phase !== "result" || !result) {
    return (
      <LobbyView
        char={char}
        scales={scales}
        savedMonster={savedMonster}
        loading={phase === "loading"}
        error={error}
        onFight={doFight}
      />
    )
  }

  return (
    <ResultView
      result={result}
      char={char}
      restoreMode={restoreMode}
      onFight={doFight}
      onNewBattle={newBattle}
    />
  )
}
