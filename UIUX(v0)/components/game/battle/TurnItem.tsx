/**
 * @module components/game/battle/TurnItem
 * @purpose 단일 턴 로그 행. result/crit/double/skill/회피/빗나감을 텍스트 + 미니바로 표시.
 */

"use client"

import type { TurnLog } from "./types"

export function MiniBar({ current, max, color }: { current: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0
  return (
    <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

export default function TurnItem({ log, pMax, mMax }: { log: TurnLog; pMax: number; mMax: number }) {
  const isPlayer = log.attacker === "플레이어"
  const isSkill = log.attack_type === "skill"

  let icon = isSkill ? "🔮" : "⚔️"
  const kindLabel = isSkill ? "스킬" : "일반"
  let text = ""

  if (log.result === "accuracy_fail" || log.result === "evaded") {
    icon = "💨"
    text = `${log.attacker}의 ${kindLabel}공격이 ${log.result === "evaded" ? "회피됐다" : "빗나갔다"}!`
  } else {
    if      (log.result === "crit_double") icon = isSkill ? "💥🔮" : "💥💥"
    else if (log.result === "crit")        icon = "💥"
    else if (log.result === "double")      icon = "⚡⚡"
    const tags = []
    if (log.crit)   tags.push("치명타!")
    if (log.double) tags.push("더블!")
    if (log.mp_cost > 0) tags.push(`-MP ${log.mp_cost}`)
    text = `${log.attacker} [${kindLabel}] → ${log.damage} 피해${tags.length ? ` [${tags.join(" ")}]` : ""}${log.life_steal > 0 ? ` (흡혈 +${log.life_steal})` : ""}`
  }

  return (
    <div className="flex items-stretch bg-background border-b border-border last:border-0">
      <div className={`w-1 flex-shrink-0 rounded-l ${isPlayer ? "bg-blue-400" : "bg-red-400"}`} />
      <div className="flex-1 px-3 py-2">
        <div className="text-[11px] mb-1.5">
          <span className="text-blue-500 font-bold mr-1.5">턴{log.turn}</span>
          <span>{icon} </span>
          <span className={isPlayer ? "text-blue-600" : "text-red-500"}>{text}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
          <span className="w-4">나</span>
          <MiniBar current={log.player_hp} max={pMax} color="#ef4444" />
          <span className="w-12 text-right text-muted-foreground">{log.player_hp}/{pMax}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mt-0.5">
          <span className="w-4">적</span>
          <MiniBar current={log.monster_hp} max={mMax} color="#f97316" />
          <span className="w-12 text-right text-muted-foreground">{log.monster_hp}/{mMax}</span>
        </div>
      </div>
    </div>
  )
}
