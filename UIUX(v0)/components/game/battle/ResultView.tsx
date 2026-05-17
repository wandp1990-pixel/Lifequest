/**
 * @module components/game/battle/ResultView
 * @purpose 전투 결과 화면. HP/MP 바 + 능력치 비교 + 턴 로그(0.5초 애니메이션) + 승/패/시간초과 분기.
 *          visibleTurns 애니메이션은 본 컴포넌트에서 setInterval로 진행.
 */

"use client"

import { useEffect, useRef, useState } from "react"
import { Sword, Brain, Wind, Shield, Zap, Star } from "lucide-react"
import TurnItem, { MiniBar } from "./TurnItem"
import type { BattleResultData, CharData, RestoreMode } from "./types"

interface Props {
  result: BattleResultData
  char: CharData | null
  scales: { clearScale: number; levelScale: number; accPerDex: number; critPerLuk: number }
  restoreMode: RestoreMode
  onFight: () => void
  onNewBattle: () => void
}

export default function ResultView({ result, scales, restoreMode, onFight, onNewBattle }: Props) {
  const [visibleTurns, setVisibleTurns] = useState(0)
  const logEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (visibleTurns >= result.logs.length) return
    const t = setTimeout(() => setVisibleTurns((n) => n + 1), 500)
    return () => clearTimeout(t)
  }, [visibleTurns, result.logs.length])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [visibleTurns])

  const { monster, logs, winner, ticket_reward, first_strike, player_max_hp, player_max_mp, monster_max_hp, char_after } = result

  const visibleLogs = logs.slice(0, visibleTurns)
  const lastLog     = visibleLogs[visibleLogs.length - 1]
  const pFinal      = lastLog?.player_hp  ?? result.player_start_hp
  const pMpFinal    = lastLog?.player_mp  ?? result.player_start_mp
  const mFinal      = lastLog?.monster_hp ?? monster_max_hp
  const animDone    = visibleTurns >= logs.length

  return (
    <div className="flex flex-col gap-0">
      <div className="px-4 py-2.5 bg-background border-b border-border flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground font-bold">VS</span>
        <div className="text-center flex-1 mx-2">
          <p className="text-sm font-bold" style={{ color: monster.color }}>{monster.full_name}</p>
          <p className="text-[10px] text-muted-foreground">{monster.grade_code}({monster.grade_name}) · {monster.race_emoji} {monster.race_name}</p>
        </div>
        <span className="text-[10px] text-muted-foreground">클리어 {char_after.clear_count}회</span>
      </div>

      <div className="px-4 py-3 bg-background border-b border-border">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] text-muted-foreground w-10 shrink-0">내 HP</span>
          <MiniBar current={pFinal} max={player_max_hp} color="#ef4444" />
          <span className="text-[10px] text-muted-foreground w-16 text-right">{pFinal}/{player_max_hp}</span>
        </div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] text-muted-foreground w-10 shrink-0">내 MP</span>
          <MiniBar current={pMpFinal} max={player_max_mp} color="#3b82f6" />
          <span className="text-[10px] text-muted-foreground w-16 text-right">{pMpFinal}/{player_max_mp}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-10 shrink-0">적 HP</span>
          <MiniBar current={mFinal} max={monster_max_hp} color="#f97316" />
          <span className="text-[10px] text-muted-foreground w-16 text-right">{mFinal}/{monster_max_hp}</span>
        </div>
      </div>

      <div className="px-4 py-3 bg-background border-b border-border">
        <p className="text-[10px] text-muted-foreground font-bold mb-2">전투 능력치 비교 · 몬스터 강도 ×{monster.total_coeff.toFixed(2)}</p>
        {([
          { icon: <Sword  className="w-3 h-3" />, label: "물리공격", pv: result.player_stats.patk,                          mv: monster.stats.patk,                          display: (v: number) => `${Math.round(v)}` },
          { icon: <Brain  className="w-3 h-3" />, label: "마법공격", pv: result.player_stats.matk,                          mv: monster.stats.matk,                          display: (v: number) => `${Math.round(v)}` },
          { icon: <Shield className="w-3 h-3" />, label: "물리방어", pv: result.player_stats.pdef,                          mv: monster.stats.pdef,                          display: (v: number) => `${Math.round(v)}` },
          { icon: <Zap    className="w-3 h-3" />, label: "마법방어", pv: result.player_stats.mdef,                          mv: monster.stats.mdef,                          display: (v: number) => `${Math.round(v)}` },
          { icon: <Wind   className="w-3 h-3" />, label: "명중률",   pv: result.player_stats.dex * scales.accPerDex * 100,  mv: monster.stats.dex * scales.accPerDex * 100,  display: (v: number) => `${v.toFixed(1)}%` },
          { icon: <Star   className="w-3 h-3" />, label: "치명타율", pv: result.player_stats.luk * scales.critPerLuk * 100, mv: monster.stats.luk * scales.critPerLuk * 100, display: (v: number) => `${v.toFixed(1)}%` },
        ]).map(({ icon, label, pv, mv, display }) => {
          const total = pv + mv
          const pPct  = total > 0 ? Math.round((pv / total) * 100) : 50
          const pWin  = pv >= mv
          return (
            <div key={label} className="flex items-center gap-1.5 my-1">
              <span className="text-[10px] text-muted-foreground w-16 shrink-0 flex items-center gap-1">{icon} {label}</span>
              <span className={`text-[10px] w-10 text-right shrink-0 ${pWin ? "font-bold text-foreground" : "text-gray-300"}`}>{display(pv)}</span>
              <div className="flex-1 h-2 overflow-hidden rounded-full flex bg-muted">
                <div className="bg-blue-400 rounded-l-full" style={{ width: `${pPct}%` }} />
                <div className="bg-orange-400 rounded-r-full" style={{ width: `${100 - pPct}%` }} />
              </div>
              <span className={`text-[10px] w-10 shrink-0 ${!pWin ? "font-bold text-foreground" : "text-gray-300"}`}>{display(mv)}</span>
            </div>
          )
        })}
      </div>

      <div className="mx-4 mt-3 border border-border rounded-2xl overflow-hidden">
        <p className="text-[10px] font-bold text-muted-foreground px-3 py-2 bg-muted border-b border-border">
          📜 전투 로그 · 선공: {first_strike} · 총 {result.turns}턴
        </p>
        <div>
          {visibleLogs.map((log, index) => (
            <TurnItem key={`${log.turn}-${index}-${log.attacker}-${log.result}`} log={log} pMax={player_max_hp} mMax={monster_max_hp} />
          ))}
          <div ref={logEndRef} />
        </div>
        {!animDone && (
          <div className="px-3 py-2 bg-muted border-t border-border text-center">
            <span className="text-[11px] text-muted-foreground font-bold">⚔️ 전투 중... ({visibleTurns}/{logs.length})</span>
          </div>
        )}
      </div>

      {animDone && (
        <div className="px-4 pt-3 pb-4 flex flex-col gap-2">
          {winner === "플레이어" ? (
            <>
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
                <div className="text-amber-600 font-bold text-base mb-3">🏆 승리!</div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">🎫 뽑기권</span>
                  <span className="text-amber-500 font-black text-xl">+{ticket_reward}장</span>
                </div>
              </div>
              <button onClick={onNewBattle} className="w-full py-4 rounded-2xl font-bold text-white bg-amber-500 active:scale-95 transition-all shadow-sm">✅ 확인</button>
            </>
          ) : winner === "몬스터" ? (
            <>
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl p-4">
                <div className="text-red-500 font-bold text-base mb-1">💀 패배</div>
                <div className="text-muted-foreground text-sm">
                  {restoreMode === "full"
                    ? "HP가 회복됩니다. 다시 도전!"
                    : restoreMode === "half"
                    ? "HP가 절반 회복됩니다. 다시 도전!"
                    : "HP가 회복되지 않습니다. 신중하게 도전!"}
                </div>
              </div>
              <button onClick={onFight} className="w-full py-4 rounded-2xl font-bold text-white bg-red-500 active:scale-95 transition-all shadow-sm">🔄 재도전</button>
            </>
          ) : (
            <>
              <div className="bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-2xl p-4">
                <div className="text-orange-500 font-bold text-base mb-1">⏰ 시간 초과</div>
                <div className="text-muted-foreground text-sm">전투가 끝나지 않았습니다.</div>
              </div>
              <button onClick={onFight} className="w-full py-4 rounded-2xl font-bold text-white bg-red-500 active:scale-95 transition-all shadow-sm">🔄 재도전</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
