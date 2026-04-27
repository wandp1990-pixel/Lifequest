"use client"

import { useState, useEffect, useRef } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

type TurnLog = {
  turn: number
  attacker: "플레이어" | "몬스터"
  attack_type: "normal" | "skill"
  result: string
  damage: number
  crit: boolean
  double: boolean
  life_steal: number
  mp_cost: number
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
  name?: string
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function monsterBaseStats(m: Monster) {
  return {
    str: Math.round(m.stats.patk / 2.0),
    vit: Math.round(m.stats.HP   / 10.0),
    dex: m.stats.dex,
    int: Math.round(m.stats.matk / 2.0),
    luk: m.stats.luk,
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MiniBar({ current, max, color }: { current: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0
  return (
    <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function TurnItem({ log, pMax, mMax }: { log: TurnLog; pMax: number; mMax: number }) {
  const isPlayer = log.attacker === "플레이어"
  const isSkill  = log.attack_type === "skill"

  let icon = isSkill ? "🔮" : "⚔️"
  let kindLabel = isSkill ? "스킬" : "일반"
  let text = ""

  if (log.result === "accuracy_fail" || log.result === "evaded") {
    icon = "💨"
    kindLabel = isSkill ? "스킬" : "일반"
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

const MONSTER_STORAGE_KEY = "lq_last_monster"

export default function BattleTab({ char, onExpGained }: BattleTabProps) {
  const [phase, setPhase]   = useState<"lobby" | "loading" | "result">("lobby")
  const [result, setResult] = useState<BattleResultData | null>(null)
  const [error, setError]   = useState<string | null>(null)
  const [visibleTurns, setVisibleTurns] = useState(0)
  const [keepMonster, setKeepMonster] = useState<Monster | null>(null)
  const [savedMonster, setSavedMonster] = useState<Monster | null>(null)
  const logEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MONSTER_STORAGE_KEY)
      if (raw) setSavedMonster(JSON.parse(raw))
    } catch {}
  }, [])

  // 0.5초/턴 애니메이션
  useEffect(() => {
    if (phase !== "result" || !result) return
    if (visibleTurns >= result.logs.length) return
    const t = setTimeout(() => setVisibleTurns((n) => n + 1), 500)
    return () => clearTimeout(t)
  }, [phase, result, visibleTurns])

  // 새 턴 노출될 때마다 로그 끝으로 스크롤
  useEffect(() => {
    if (phase !== "result") return
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [visibleTurns, phase])

  async function doFight(reuseMonster?: Monster) {
    setPhase("loading")
    setError(null)
    setVisibleTurns(0)
    try {
      const res = await fetch("/api/battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reuseMonster ? { monster: reuseMonster } : {}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "전투 오류")
      setResult(data)
      setKeepMonster(data.monster)
      if (data.winner === "플레이어") {
        // 승리 시 즉시 초기화 — 새로고침해도 이미 이긴 몬스터 안 나옴
        setSavedMonster(null)
        try { localStorage.removeItem(MONSTER_STORAGE_KEY) } catch {}
      } else {
        setSavedMonster(data.monster)
        try { localStorage.setItem(MONSTER_STORAGE_KEY, JSON.stringify(data.monster)) } catch {}
      }
      setPhase("result")
    } catch (e) {
      setError(String(e))
      setPhase("lobby")
    }
  }

  function newBattle() {
    setPhase("lobby")
    setResult(null)
    setKeepMonster(null)
    setSavedMonster(null)
    try { localStorage.removeItem(MONSTER_STORAGE_KEY) } catch {}
    setVisibleTurns(0)
    onExpGained()
  }

  const clearCount = char?.clear_count ?? 0
  const level      = char?.level ?? 1
  const coeff      = ((1 + clearCount * 0.03) * (1 + Math.max(0, level - 1) * 0.04)).toFixed(2)

  // ── Lobby / Loading ──────────────────────────────────────────────────────────
  if (phase !== "result") {
    return (
      <div className="flex flex-col gap-0">
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

        {/* 저장된 몬스터 카드 */}
        {savedMonster && phase !== "loading" && (
          <div className="px-4 pt-3">
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
              <p className="text-[10px] text-orange-400 font-bold mb-2">마지막 상대</p>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold" style={{ color: savedMonster.color }}>{savedMonster.full_name}</p>
                  <p className="text-[10px] text-gray-400">{savedMonster.grade_name} · {savedMonster.race_emoji} {savedMonster.race_name}</p>
                </div>
                <span className="text-[10px] text-gray-400">강도 ×{savedMonster.total_coeff.toFixed(2)}</span>
              </div>
              <button
                onClick={() => doFight(savedMonster)}
                className="w-full py-3 rounded-xl font-bold text-white bg-red-500 active:scale-95 text-sm"
              >
                🔄 재도전
              </button>
            </div>
          </div>
        )}

        {/* 새 전투 버튼 — 저장된 상대 없을 때만 */}
        {!savedMonster && (
          <div className="px-4 pt-3 pb-4">
            <button
              onClick={() => doFight()}
              disabled={phase === "loading"}
              className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-95 disabled:opacity-60 bg-red-500 shadow-sm"
            >
              {phase === "loading" ? "⚔️ 전투 중..." : "⚔️ 전투 시작"}
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Result ───────────────────────────────────────────────────────────────────
  if (!result) return null
  const { monster, logs, winner, ticket_reward, exp_gained, leveled_up, first_strike, player_max_hp, player_max_mp, monster_max_hp, char_after } = result

  const visibleLogs = logs.slice(0, visibleTurns)
  const lastLog     = visibleLogs[visibleLogs.length - 1]
  const pFinal      = lastLog?.player_hp  ?? player_max_hp
  const pMpFinal    = lastLog?.player_mp  ?? player_max_mp
  const mFinal      = lastLog?.monster_hp ?? monster_max_hp
  const animDone    = visibleTurns >= logs.length

  const monStats = monsterBaseStats(monster)

  return (
    <div className="flex flex-col gap-0">

      {/* 몬스터 정보 */}
      <div className="px-4 py-2.5 bg-white border-b border-gray-100 flex items-center justify-between">
        <span className="text-[10px] text-gray-400 font-bold">VS</span>
        <div className="text-center flex-1 mx-2">
          <p className="text-sm font-bold" style={{ color: monster.color }}>{monster.full_name}</p>
          <p className="text-[10px] text-gray-400">{monster.grade_name} · {monster.race_emoji} {monster.race_name}</p>
        </div>
        <span className="text-[10px] text-gray-400">클리어 {char_after.clear_count}회</span>
      </div>

      {/* HP/MP 바 (실시간 업데이트) */}
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

      {/* 스탯 비교 (STR/VIT/DEX/INT/LUK) */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <p className="text-[10px] text-gray-400 font-bold mb-2">스탯 비교 · 몬스터 강도 ×{monster.total_coeff.toFixed(2)}</p>
        {([
          ["💪", "힘",   char?.str      ?? 0, monStats.str],
          ["🛡️", "체력", char?.vit      ?? 0, monStats.vit],
          ["🏃", "민첩", char?.dex      ?? 0, monStats.dex],
          ["🧠", "지능", char?.int_stat ?? 0, monStats.int],
          ["🍀", "운",   char?.luk      ?? 0, monStats.luk],
        ] as [string, string, number, number][]).map(([icon, label, pv, mv]) => {
          const total = pv + mv
          const pPct  = total > 0 ? Math.round((pv / total) * 100) : 50
          const pWin  = pv >= mv
          return (
            <div key={label} className="flex items-center gap-1.5 my-1">
              <span className="text-[10px] text-gray-500 w-12 shrink-0">{icon} {label}</span>
              <span className={`text-[10px] w-8 text-right shrink-0 ${pWin ? "font-bold text-gray-700" : "text-gray-300"}`}>{pv}</span>
              <div className="flex-1 h-2 overflow-hidden rounded-full flex bg-gray-100">
                <div className="bg-blue-400 rounded-l-full" style={{ width: `${pPct}%` }} />
                <div className="bg-orange-400 rounded-r-full" style={{ width: `${100 - pPct}%` }} />
              </div>
              <span className={`text-[10px] w-8 shrink-0 ${!pWin ? "font-bold text-gray-700" : "text-gray-300"}`}>{mv}</span>
            </div>
          )
        })}
      </div>

      {/* 결과 배너 (애니메이션 끝난 뒤만 표시) */}
      {animDone && (winner === "플레이어" ? (
        <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="text-amber-600 font-bold text-base mb-2">🏆 승리!</div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">🎫 뽑기권</span>
            <span className="text-amber-500 font-black text-xl">+{ticket_reward}장</span>
          </div>
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
      ))}

      {!animDone && (
        <div className="mx-4 mt-3 bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center">
          <div className="text-gray-500 font-bold text-sm">⚔️ 전투 중... ({visibleTurns}/{logs.length})</div>
        </div>
      )}

      {/* 전투 로그 */}
      <div className="mx-4 mt-3 border border-gray-100 rounded-2xl overflow-hidden">
        <p className="text-[10px] font-bold text-gray-400 px-3 py-2 bg-gray-50 border-b border-gray-100">
          📜 전투 로그 · 선공: {first_strike} · 총 {result.turns}턴
        </p>
        <div>
          {visibleLogs.map((log) => (
            <TurnItem key={log.turn} log={log} pMax={player_max_hp} mMax={monster_max_hp} />
          ))}
          <div ref={logEndRef} />
        </div>
      </div>

      {/* 액션 버튼 */}
      {animDone && (
        <div className="px-4 pt-3 pb-4">
          {winner === "플레이어" ? (
            <button
              onClick={newBattle}
              className="w-full py-4 rounded-2xl font-bold text-white bg-amber-500 active:scale-95 transition-all shadow-sm"
            >
              ✅ 확인
            </button>
          ) : (
            <button
              onClick={() => doFight(keepMonster ?? undefined)}
              className="w-full py-4 rounded-2xl font-bold text-white bg-red-500 active:scale-95 transition-all shadow-sm"
            >
              🔄 재도전
            </button>
          )}
        </div>
      )}
    </div>
  )
}
