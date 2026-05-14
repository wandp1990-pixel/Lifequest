/**
 * @module components/game/character/CombatStatsCard
 * @purpose 전투 능력치 요약 카드(PATK/MATK/PDEF/MDEF/HP/MP/DEX/LUK + 조건부 옵션/패시브).
 */

"use client"

import type { EffectiveStats } from "./constants"

function CombatStatRow({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="flex items-center justify-between gap-1 min-w-0">
      <span className="text-[10px] text-muted-foreground truncate">{label}</span>
      <span className={`text-[11px] font-bold shrink-0 ${color}`}>{value}</span>
    </div>
  )
}

function PassiveBadge({ label }: { label: string }) {
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700/50">
      ✦ {label}
    </span>
  )
}

export default function CombatStatsCard({ s }: { s: EffectiveStats }) {
  return (
    <div className="mt-1 rounded-xl border border-border bg-muted/30 px-4 py-3">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5">⚔ 전투 스탯</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <CombatStatRow label="물리 공격력" value={s.patk} color="text-red-500" />
        <CombatStatRow label="마법 공격력" value={s.matk} color="text-violet-500" />
        <CombatStatRow label="물리 방어력" value={s.pdef} color="text-emerald-500" />
        <CombatStatRow label="마법 방어력" value={s.mdef} color="text-sky-500" />
        <CombatStatRow label="최대 HP" value={s.max_hp} color="text-red-400" />
        <CombatStatRow label="최대 MP" value={s.max_mp} color="text-blue-400" />
        <CombatStatRow label="DEX" value={s.dex} color="text-cyan-500" />
        <CombatStatRow label="LUK" value={s.luk} color="text-amber-500" />
        {s.crit_rate       > 0 && <CombatStatRow label="치명타율"     value={`+${s.crit_rate}%`}        color="text-orange-500" />}
        {s.crit_dmg        > 0 && <CombatStatRow label="치명타 피해" value={`+${s.crit_dmg}%`}         color="text-rose-500" />}
        {s.accuracy_bonus  > 0 && <CombatStatRow label="명중 보너스" value={`+${s.accuracy_bonus}%`}   color="text-teal-500" />}
        {s.evasion_bonus   > 0 && <CombatStatRow label="회피 보너스" value={`+${s.evasion_bonus}%`}    color="text-lime-500" />}
      </div>
      {(s.double_attack > 0 || s.life_steal > 0 || s.def_ignore > 0 || s.reflect > 0) && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {s.double_attack > 0 && <PassiveBadge label={`더블어택 ${s.double_attack}%`} />}
          {s.life_steal    > 0 && <PassiveBadge label={`생명흡수 ${s.life_steal}%`} />}
          {s.def_ignore    > 0 && <PassiveBadge label={`방어무시 ${s.def_ignore}%`} />}
          {s.reflect       > 0 && <PassiveBadge label={`반사 ${s.reflect}%`} />}
        </div>
      )}
    </div>
  )
}
