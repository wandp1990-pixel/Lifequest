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

function MiniBar({ current, max, color }: { current: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0
  return (
    <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function TurnItem({ log, pMax, mMax }: { log: TurnLog; pMax: number; mMax: number }) {
  const isPlayer = log.attacker === "플레이어"

  let icon = "⚔️"
  let text = ""
  if (log.result === "accuracy_fail" || log.result === "evaded") {
    icon = "💨"
    text = `${log.attacker}의 공격이 ${log.result === "evaded" ? "회피됐다" : "빗나갔다"}!`
  } else {
    if      (log.result === "crit_double") icon = "💥💥"
    else if (log.result === "crit")        icon = "💥"
    else if (log.result === "double")      icon = "⚡⚡"
    const tags = []
    if (log.crit)   tags.push("치명타!")
    if (log.double) tags.push("더블!")
    text = `${log.attacker} → ${log.damage} 피해${tags.length ? ` [${tags.join(" ")}]` : ""}${log.life_steal > 0 ? ` (흡혈 +${log.life_steal})` : ""}`
  }

  return (
    <div className="flex items-stretch bg-white border-b border-gray-100 last:border-0">
      <div className={`w-1 flex-shrink-0 rounded-l ${isPlayer ? "bg-blue-400" : "bg-red-400"}`} />
      <div className="flex-1 px-3 py-2">
        <div className="text-[11px] mb-1.5">
          <span className="text-blue-500 font-bold mr-1.5">턴{log.turn}</span>
          <span>{icon} </span>
          <span className={isPlayer ? "text-blue-600" : "text-red-500"}>{text}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-gray-400">
          <span className="w-4">나</span>
          <MiniBar current={log.player_hp} max={pMax} color="#ef4444" />
          <span className="w-12 text-right text-gray-400">{log.player_hp}/{pMax}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-gray-400 mt-0.5">
          <span className="w-4">적</span>
          <MiniBar current={log.monster_hp} max={mMax} color="#f97316" />
          <span className="w-12 text-right text-gray-400">{log.monster_hp}/{mMax}</span>
        </div>
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
      <div className="flex flex-col gap-0">
        {/* 플레이어 정보 */}
        <div className="flex items-stretch bg-white border-b border-gray-100">
          <div className="w-14 flex items-center justify-center flex-shrink-0 bg-red-500 rounded-l-xl my-1 ml-1">
            <div className="text-center">
              <div className="text-[9px] text-red-100 font-bold leading-none">Lv</div>
              <div className="text-base font-black text-white leading-none">{level}</div>
            </div>
          </div>
          <div className="flex-1 py-3 px-3">
            <p className="text-sm font-bold text-gray-800 mb-1">🧑 전사</p>
            <div className="flex gap-3 text-xs text-gray-500">
              <span>⚔️ {clearCount}회 클리어</span>
              <span>🎫 {char?.draw_tickets ?? 0}장</span>
            </div>
          </div>
        </div>

        {/* 스탯 */}
        <div className="px-4 py-3 bg-white border-b border-gray-100">
          <p className="text-[10px] text-gray-400 font-bold mb-2">캐릭터 스탯</p>
          <div className="grid grid-cols-5 gap-1.5">
            {([
              ["💪", "STR", char?.str],
              ["🛡️", "VIT", char?.vit],
              ["🏃", "DEX", char?.dex],
              ["🧠", "INT", char?.int_stat],
              ["🍀", "LUK", char?.luk],
            ] as [string, string, number | undefined][]).map(([icon, label, val]) => (
              <div key={label} className="text-center bg-gray-50 rounded-xl py-2 border border-gray-100">
                <div className="text-[10px] mb-0.5">{icon}</div>
                <div className="text-[9px] text-gray-400 mb-0.5">{label}</div>
                <div className="text-sm font-bold text-gray-800">{val ?? 0}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-right text-[10px] text-gray-400">
            몬스터 강도 ×{coeff}
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <p className="text-xs text-red-500">{error}</p>
          </div>
        )}

        {/* 전투 시작 버튼 */}
        <div className="px-4 pt-3 pb-4">
          <button
            onClick={doFight}
            disabled={phase === "loading"}
            className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-95 disabled:opacity-60 bg-red-500 shadow-sm"
          >
            {phase === "loading" ? "⚔️ 전투 중..." : "⚔️ 전투 시작"}
          </button>
        </div>
      </div>
    )
  }

  // ── Result ───────────────────────────────────────────────────────────────────
  if (!result) return null
  const { monster, logs, winner, ticket_reward, exp_gained, leveled_up, first_strike, player_max_hp, player_max_mp, monster_max_hp, player_stats, char_after } = result
  const lastLog  = logs[logs.length - 1]
  const pFinal   = lastLog?.player_hp  ?? 0
  const pMpFinal = lastLog?.player_mp  ?? 0
  const mFinal   = lastLog?.monster_hp ?? 0

  return (
    <div className="flex flex-col gap-0">

      {/* VS 헤더 */}
      <div className="flex items-stretch bg-white border-b border-gray-100">
        <div className="w-14 flex items-center justify-center flex-shrink-0 bg-red-500 rounded-l-xl my-1 ml-1">
          <span className="text-xl">⚔️</span>
        </div>
        <div className="flex-1 py-3 px-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-800">🧑 전사 Lv.{char_after.level}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">클리어 {char_after.clear_count}회 · 🎫 {char_after.draw_tickets}장</p>
          </div>
          <div className="text-gray-300 font-black text-xs px-2">VS</div>
          <div className="text-right">
            <p className="text-sm font-bold" style={{ color: monster.color }}>{monster.full_name}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{monster.grade_name} · {monster.race_emoji} {monster.race_name}</p>
          </div>
        </div>
      </div>

      {/* HP/MP 바 비교 */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] text-gray-400 w-10 shrink-0">내 HP</span>
          <MiniBar current={pFinal} max={player_max_hp} color="#ef4444" />
          <span className="text-[10px] text-gray-400 w-16 text-right">{pFinal}/{player_max_hp}</span>
        </div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] text-gray-400 w-10 shrink-0">내 MP</span>
          <MiniBar current={pMpFinal} max={player_max_mp} color="#3b82f6" />
          <span className="text-[10px] text-gray-400 w-16 text-right">{pMpFinal}/{player_max_mp}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 w-10 shrink-0">적 HP</span>
          <MiniBar current={mFinal} max={monster_max_hp} color="#f97316" />
          <span className="text-[10px] text-gray-400 w-16 text-right">{mFinal}/{monster_max_hp}</span>
        </div>
      </div>

      {/* 스탯 비교 */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <p className="text-[10px] text-gray-400 font-bold mb-2">스탯 비교 · 몬스터 강도 ×{monster.total_coeff.toFixed(2)}</p>
        {([
          ["❤️", "HP",      player_stats.max_hp, monster.stats.HP],
          ["⚔️", "물리ATK", player_stats.patk,   monster.stats.patk],
          ["🔮", "마법ATK", player_stats.matk,   monster.stats.matk],
          ["🛡️", "물리DEF", player_stats.pdef,   monster.stats.pdef],
          ["🏃", "민첩",    player_stats.dex,    monster.stats.dex],
        ] as [string, string, number, number][]).map(([icon, label, pv, mv]) => {
          const total = pv + mv
          const pPct  = total > 0 ? Math.round((pv / total) * 100) : 50
          const pWin  = pv >= mv
          return (
            <div key={label} className="flex items-center gap-1.5 my-1">
              <span className="text-[9px] text-gray-400 w-14 shrink-0">{icon} {label}</span>
              <span className={`text-[10px] w-6 text-right shrink-0 ${pWin ? "font-bold text-gray-700" : "text-gray-300"}`}>{pv}</span>
              <div className="flex-1 h-2 overflow-hidden rounded-full flex bg-gray-100">
                <div className="bg-blue-400 rounded-l-full" style={{ width: `${pPct}%` }} />
                <div className="bg-orange-400 rounded-r-full" style={{ width: `${100 - pPct}%` }} />
              </div>
              <span className={`text-[10px] w-6 shrink-0 ${!pWin ? "font-bold text-gray-700" : "text-gray-300"}`}>{mv}</span>
            </div>
          )
        })}
      </div>

      {/* 결과 배너 */}
      {winner === "플레이어" ? (
        <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="text-amber-600 font-bold text-base mb-2">🏆 승리!</div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">🎫 뽑기권</span>
            <span className="text-amber-500 font-black text-xl">+{ticket_reward}장</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-gray-600 text-sm">✨ EXP</span>
            <span className="text-violet-500 font-bold text-lg">+{exp_gained}</span>
          </div>
          {leveled_up && (
            <div className="mt-2 text-amber-500 text-sm font-bold text-center animate-pulse">🎉 레벨업!</div>
          )}
        </div>
      ) : winner === "몬스터" ? (
        <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="text-red-500 font-bold text-base">💀 패배</div>
          <div className="text-gray-500 text-sm mt-1">HP가 회복됩니다. 다시 도전!</div>
        </div>
      ) : (
        <div className="mx-4 mt-3 bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <div className="text-orange-500 font-bold text-base">⏰ 시간 초과</div>
          <div className="text-gray-500 text-sm mt-1">전투가 끝나지 않았습니다.</div>
        </div>
      )}

      {/* 전투 로그 */}
      <div className="mx-4 mt-3 border border-gray-100 rounded-2xl overflow-hidden">
        <p className="text-[10px] font-bold text-gray-400 px-3 py-2 bg-gray-50 border-b border-gray-100">
          📜 전투 로그 · 선공: {first_strike} · 총 {result.turns}턴
        </p>
        <div className="max-h-52 overflow-y-auto">
          {logs.map((log) => (
            <TurnItem key={log.turn} log={log} pMax={player_max_hp} mMax={monster_max_hp} />
          ))}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2 px-4 pt-3 pb-4">
        {winner !== "플레이어" && (
          <button
            onClick={doFight}
            className="flex-1 py-3 rounded-2xl font-bold text-white bg-red-500 active:scale-95 transition-all shadow-sm"
          >
            🔄 재도전
          </button>
        )}
        <button
          onClick={() => { setPhase("lobby"); setResult(null); onExpGained() }}
          className={`flex-1 py-3 rounded-2xl font-bold active:scale-95 transition-all shadow-sm ${
            winner === "플레이어" ? "bg-red-500 text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          {winner === "플레이어" ? "⚔️ 다음 전투" : "🏠 로비로"}
        </button>
      </div>
    </div>
  )
}
