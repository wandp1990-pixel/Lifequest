"use client"

import { useState } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

type TurnLog = {
  turn: number
  attacker: "플레이어" | "몬스터"
  result: string
  damage: number
  crit: boolean
  double: boolean
  life_steal: number
  player_hp: number
  player_mp: number
  monster_hp: number
}

type Monster = {
  full_name: string
  grade_code: string
  grade_name: string
  race_name: string
  race_emoji: string
  stats: { HP: number; patk: number; matk: number; pdef: number; mdef: number; dex: number; luk: number }
  ticket_reward: number
  color: string
  total_coeff: number
}

type BattleResultData = {
  monster: Monster
  logs: TurnLog[]
  winner: "플레이어" | "몬스터" | "시간초과"
  turns: number
  ticket_reward: number
  exp_gained: number
  leveled_up: boolean
  first_strike: string
  player_max_hp: number
  player_max_mp: number
  monster_max_hp: number
  player_stats: {
    patk: number; matk: number; pdef: number; mdef: number
    dex: number; luk: number; max_hp: number; max_mp: number
  }
  char_after: {
    level: number
    draw_tickets: number
    clear_count: number
  }
}

type CharData = {
  level: number
  max_hp: number
  max_mp: number
  str: number
  vit: number
  dex: number
  int_stat: number
  luk: number
  draw_tickets: number
  clear_count?: number
}

interface BattleTabProps {
  char: CharData | null
  onExpGained: () => void
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBar({ label, current, max, color }: { label: string; current: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0
  return (
    <div className="flex items-center gap-2 my-1">
      <span className="text-[11px] text-gray-400 w-8 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] text-gray-500 w-14 text-right shrink-0">{current}/{max}</span>
    </div>
  )
}

function TurnItem({ log, pMax, mMax }: { log: TurnLog; pMax: number; mMax: number }) {
  const isPlayer = log.attacker === "플레이어"
  const color    = isPlayer ? "#60a5fa" : "#fb923c"

  let icon = "⚔️"
  let text = ""
  if (log.result === "accuracy_fail") {
    icon = "💨"; text = `${log.attacker}의 공격이 빗나갔다!`
  } else if (log.result === "evaded") {
    icon = "💨"; text = `${log.attacker}의 공격이 회피됐다!`
  } else {
    if      (log.result === "crit_double") icon = "💥💥"
    else if (log.result === "crit")        icon = "💥"
    else if (log.result === "double")      icon = "⚡⚡"
    const tags = []
    if (log.crit)   tags.push("치명타!")
    if (log.double) tags.push("더블!")
    const dmgColor = isPlayer ? "#86efac" : "#fca5a5"
    text = `${log.attacker} → ${log.damage} 피해${tags.length ? ` [${tags.join(" ")}]` : ""}${log.life_steal > 0 ? ` (흡혈 +${log.life_steal})` : ""}`
    void dmgColor
  }

  const pPct = pMax > 0 ? Math.min(100, Math.round((log.player_hp / pMax) * 100)) : 0
  const mPct = mMax > 0 ? Math.min(100, Math.round((log.monster_hp / mMax) * 100)) : 0

  return (
    <div className="py-2 border-b border-gray-800 last:border-0">
      <div className="text-[11px] mb-1">
        <span className="text-blue-400 font-bold mr-1.5">턴{log.turn}</span>
        <span>{icon} </span>
        <span style={{ color }}>{text}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[9px] text-gray-600 mt-0.5">
        <span className="w-5">나</span>
        <div className="flex-1 bg-gray-800 rounded h-1 overflow-hidden">
          <div className="h-full bg-red-500" style={{ width: `${pPct}%` }} />
        </div>
        <span className="w-10 text-right">{log.player_hp}/{pMax}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[9px] text-gray-600 mt-0.5">
        <span className="w-5">적</span>
        <div className="flex-1 bg-gray-800 rounded h-1 overflow-hidden">
          <div className="h-full bg-orange-500" style={{ width: `${mPct}%` }} />
        </div>
        <span className="w-10 text-right">{log.monster_hp}/{mMax}</span>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BattleTab({ char, onExpGained }: BattleTabProps) {
  const [phase, setPhase]   = useState<"lobby" | "loading" | "result">("lobby")
  const [result, setResult] = useState<BattleResultData | null>(null)
  const [error, setError]   = useState<string | null>(null)

  async function doFight() {
    setPhase("loading")
    setError(null)
    try {
      const res  = await fetch("/api/battle", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "전투 오류")
      setResult(data)
      setPhase("result")
      onExpGained()
    } catch (e) {
      setError(String(e))
      setPhase("lobby")
    }
  }

  const clearCount = char?.clear_count ?? 0
  const level      = char?.level ?? 1
  const coeff      = ((1 + clearCount * 0.03) * (1 + Math.max(0, level - 1) * 0.04)).toFixed(2)

  // ── Lobby / Loading ──────────────────────────────────────────────────────────
  if (phase !== "result") {
    return (
      <div className="min-h-full bg-gray-950 px-4 pt-4 pb-6 flex flex-col gap-3">
        {/* 플레이어 카드 */}
        <div className="bg-gray-900 rounded-2xl p-4 text-white border border-gray-800">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-full bg-yellow-500 flex items-center justify-center text-[11px] font-black text-gray-900 shrink-0">
              Lv.{level}
            </div>
            <span className="font-bold text-sm">🧑 전사</span>
            <div className="ml-auto text-right">
              <div className="text-[10px] text-gray-400">⚔️ {clearCount}회 클리어</div>
              <div className="text-[10px] text-gray-400">🎫 {char?.draw_tickets ?? 0}장 보유</div>
            </div>
          </div>

          {char && (
            <>
              <StatBar label="HP" current={char.max_hp} max={char.max_hp} color="#ef4444" />
              <StatBar label="MP" current={char.max_mp} max={char.max_mp} color="#3b82f6" />
            </>
          )}

          {/* 스탯 그리드 */}
          <div className="grid grid-cols-5 gap-1 mt-3">
            {([ ["💪","STR",char?.str], ["🛡️","VIT",char?.vit], ["🏃","DEX",char?.dex], ["🧠","INT",char?.int_stat], ["🍀","LUK",char?.luk] ] as [string,string,number|undefined][]).map(([icon,label,val]) => (
              <div key={label} className="text-center bg-gray-800 rounded-lg py-2">
                <div className="text-[9px] text-gray-500">{icon}</div>
                <div className="text-[9px] text-gray-400 mb-0.5">{label}</div>
                <div className="text-sm font-bold">{val ?? 0}</div>
              </div>
            ))}
          </div>

          <div className="mt-2 text-right text-[10px] text-gray-600">
            몬스터 강도 ×{coeff}
          </div>
        </div>

        {error && <p className="text-red-400 text-xs text-center bg-red-950 rounded-xl px-3 py-2">{error}</p>}

        <button
          onClick={doFight}
          disabled={phase === "loading"}
          className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-95 disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #dc2626, #991b1b)" }}
        >
          {phase === "loading" ? "⚔️ 전투 중..." : "⚔️ 전투 시작"}
        </button>
      </div>
    )
  }

  // ── Result ───────────────────────────────────────────────────────────────────
  if (!result) return null
  const { monster, logs, winner, ticket_reward, exp_gained, leveled_up, first_strike, player_max_hp, player_max_mp, monster_max_hp, player_stats, char_after } = result
  const lastLog = logs[logs.length - 1]
  const pFinal  = lastLog?.player_hp  ?? 0
  const pMpFinal= lastLog?.player_mp  ?? 0
  const mFinal  = lastLog?.monster_hp ?? 0

  return (
    <div className="min-h-full bg-gray-950 px-4 pt-4 pb-6 flex flex-col gap-3">

      {/* VS 패널 */}
      <div className="bg-gray-900 rounded-2xl p-4 text-white border border-gray-800">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="font-bold text-sm">🧑 전사</div>
            <div className="text-[10px] text-gray-400">Lv.{char_after.level}</div>
          </div>
          <div className="text-gray-700 font-black text-xs self-center">VS</div>
          <div className="text-right">
            <div className="font-bold text-sm" style={{ color: monster.color }}>{monster.full_name}</div>
            <div className="text-[10px] text-gray-400">{monster.grade_name} · {monster.race_emoji} {monster.race_name}</div>
          </div>
        </div>

        <StatBar label="내 HP" current={pFinal}   max={player_max_hp}  color="#ef4444" />
        <StatBar label="내 MP" current={pMpFinal}  max={player_max_mp}  color="#3b82f6" />
        <StatBar label="적 HP" current={mFinal}    max={monster_max_hp} color="#f97316" />

        {/* 스탯 비교 */}
        <div className="mt-3 border-t border-gray-800 pt-3">
          <div className="flex justify-between text-[9px] text-gray-700 mb-2">
            <span>나</span><span>스탯 비교</span><span>몬스터</span>
          </div>
          {([
            ["❤️","HP",     player_stats.max_hp, monster.stats.HP],
            ["⚔️","물리ATK", player_stats.patk,   monster.stats.patk],
            ["🔮","마법ATK", player_stats.matk,   monster.stats.matk],
            ["🛡️","물리DEF", player_stats.pdef,   monster.stats.pdef],
            ["🏃","민첩",    player_stats.dex,    monster.stats.dex],
          ] as [string,string,number,number][]).map(([icon,label,pv,mv]) => {
            const total = pv + mv
            const pPct  = total > 0 ? Math.round((pv / total) * 100) : 50
            const pWin  = pv >= mv
            return (
              <div key={label} className="flex items-center gap-1 my-1">
                <span className="text-[9px] text-gray-600 w-14 shrink-0">{icon} {label}</span>
                <span className={`text-[10px] w-6 text-right shrink-0 ${pWin ? "font-bold text-white" : "text-gray-600"}`}>{pv}</span>
                <div className="flex-1 h-1.5 overflow-hidden rounded flex">
                  <div className="bg-blue-600" style={{ width: `${pPct}%` }} />
                  <div className="bg-orange-600" style={{ width: `${100 - pPct}%` }} />
                </div>
                <span className={`text-[10px] w-6 shrink-0 ${!pWin ? "font-bold text-white" : "text-gray-600"}`}>{mv}</span>
              </div>
            )
          })}
        </div>
        <div className="text-right mt-1 text-[9px] text-gray-600">
          몬스터 강도 ×{monster.total_coeff.toFixed(2)}
        </div>
      </div>

      {/* 전투 로그 */}
      <div className="bg-gray-900 rounded-2xl p-4 text-white border border-gray-800">
        <p className="text-xs font-bold text-gray-300 mb-2">📜 전투 로그</p>
        <div className="max-h-52 overflow-y-auto">
          {logs.map((log) => (
            <TurnItem key={log.turn} log={log} pMax={player_max_hp} mMax={monster_max_hp} />
          ))}
        </div>
      </div>

      {/* 결과 배너 */}
      {winner === "플레이어" ? (
        <div className="bg-green-950 border border-green-700 rounded-2xl p-4">
          <div className="text-green-400 font-bold text-base mb-2">🏆 승리!</div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300 text-sm">🎫 뽑기권</span>
            <span className="text-yellow-400 font-black text-xl">+{ticket_reward}장</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-gray-300 text-sm">✨ EXP</span>
            <span className="text-blue-400 font-bold text-lg">+{exp_gained}</span>
          </div>
          {leveled_up && (
            <div className="mt-2 text-yellow-300 text-sm font-bold text-center animate-pulse">🎉 레벨업!</div>
          )}
          <div className="mt-2 text-[10px] text-gray-600">
            보유: {char_after.draw_tickets}장 · 클리어: {char_after.clear_count}회
          </div>
        </div>
      ) : winner === "몬스터" ? (
        <div className="bg-red-950 border border-red-800 rounded-2xl p-4">
          <div className="text-red-400 font-bold text-base">💀 패배</div>
          <div className="text-gray-500 text-sm mt-1">HP가 회복됩니다. 다시 도전!</div>
        </div>
      ) : (
        <div className="bg-orange-950 border border-orange-700 rounded-2xl p-4">
          <div className="text-orange-400 font-bold text-base">⏰ 시간 초과</div>
          <div className="text-gray-500 text-sm mt-1">전투가 끝나지 않았습니다.</div>
        </div>
      )}

      <p className="text-[10px] text-gray-700 text-center">
        선공: {first_strike} | 총 {result.turns}턴
      </p>

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        {winner !== "플레이어" && (
          <button
            onClick={doFight}
            className="flex-1 py-3 rounded-2xl font-bold text-white active:scale-95"
            style={{ background: "linear-gradient(135deg, #dc2626, #991b1b)" }}
          >
            🔄 재도전
          </button>
        )}
        <button
          onClick={() => { setPhase("lobby"); setResult(null); onExpGained() }}
          className="flex-1 py-3 rounded-2xl font-bold active:scale-95"
          style={{
            background: winner === "플레이어"
              ? "linear-gradient(135deg, #dc2626, #991b1b)"
              : "#1f2937",
            color: "white",
          }}
        >
          {winner === "플레이어" ? "⚔️ 다음 전투" : "🏠 로비로"}
        </button>
      </div>
    </div>
  )
}
