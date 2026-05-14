/**
 * @module components/game/character/StatView
 * @purpose 스탯 배분 뷰. 5개 스탯 ▽△ 조작 + 전투 스탯 카드 + 저장.
 *          statDelta/saving은 자체 보유. 저장 시 baseStats + delta 합산 후 PUT /api/character.
 */

"use client"

import { useState } from "react"
import { ChevronUp, ChevronDown, Save, Loader2 } from "lucide-react"
import { STATS, type StatKey, type CharBasics, type EffectiveStats, type ItemStatBonuses } from "./constants"
import CombatStatsCard from "./CombatStatsCard"

interface Props {
  char: CharBasics | null
  itemStatBonuses?: ItemStatBonuses
  effectiveStats?: EffectiveStats
  onCharUpdated: () => void
}

export default function StatView({ char, itemStatBonuses, effectiveStats, onCharUpdated }: Props) {
  const baseStats: Record<StatKey, number> = {
    str: char?.str ?? 0, vit: char?.vit ?? 0,
    dex: char?.dex ?? 0, int_stat: char?.int_stat ?? 0, luk: char?.luk ?? 0,
  }
  const [delta, setDelta] = useState<Record<StatKey, number>>(
    { str: 0, vit: 0, dex: 0, int_stat: 0, luk: 0 }
  )
  const [saving, setSaving] = useState(false)

  const totalSpent = Object.values(delta).reduce((a, b) => a + b, 0)
  const remaining = (char?.stat_points ?? 0) - totalSpent

  const add = (key: StatKey, d: number) => {
    if (d > 0 && remaining <= 0) return
    if (d < 0 && delta[key] <= 0) return
    setDelta((p) => ({ ...p, [key]: p[key] + d }))
  }

  const save = async () => {
    if (totalSpent === 0) return
    setSaving(true)
    try {
      const body: Record<string, string | number> = { stat_points: (char?.stat_points ?? 0) - totalSpent }
      STATS.forEach(({ key }) => { body[key] = baseStats[key] + delta[key] })
      const res = await fetch("/api/character", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setDelta({ str: 0, vit: 0, dex: 0, int_stat: 0, luk: 0 })
        onCharUpdated()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="px-4 pb-3 shrink-0">
        <div className="flex items-center justify-between rounded-2xl px-4 py-3 border border-dashed border-amber-300 bg-amber-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <span className="text-amber-500 text-sm">✦</span>
            </div>
            <div>
              <p className="text-xs text-amber-600 font-medium">배분 가능 스탯 포인트</p>
              <p className="text-xl font-extrabold leading-none mt-0.5 text-amber-500">
                {remaining} <span className="text-sm font-medium">SP</span>
              </p>
            </div>
          </div>
          {totalSpent > 0 && (
            <div className="text-right">
              <p className="text-xs text-amber-500 opacity-80">이번에 배분</p>
              <p className="text-lg font-bold text-amber-600">+{totalSpent}</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 flex flex-col gap-2.5 flex-1 overflow-y-auto pb-2">
        {STATS.map(({ key, label, desc, icon: Icon, color, bar, bg, border }) => {
          const base = baseStats[key]
          const added = delta[key]
          const itemBonus = itemStatBonuses?.[key] ?? 0
          const total = base + added
          const hasItemBonus = itemBonus > 0
          const isHighlighted = base > 0 || added > 0 || hasItemBonus
          return (
            <div key={key} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${isHighlighted ? `${bg} ${border}` : "bg-background border-border"}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isHighlighted ? `${bg}` : "bg-muted"}`}>
                <Icon className={`w-5 h-5 ${isHighlighted ? color : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className={`text-xs font-bold ${isHighlighted ? color : "text-muted-foreground"}`}>{label}</span>
                  <span className="text-xs text-muted-foreground">{desc}</span>
                  {hasItemBonus && (
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">
                      🗡+{itemBonus} → {total + itemBonus}
                    </span>
                  )}
                </div>
                <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${Math.min(100, ((total + itemBonus) / 100) * 100)}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => add(key, -1)}
                  disabled={added <= 0}
                  className="w-7 h-7 rounded-full bg-muted hover:bg-muted disabled:opacity-30 flex items-center justify-center"
                >
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
                <div className="w-10 text-center">
                  <span className={`text-base font-extrabold ${isHighlighted ? color : "text-foreground"}`}>{total}</span>
                  {added > 0 && <span className={`block text-[10px] font-bold ${color}`}>+{added}</span>}
                </div>
                <button
                  onClick={() => add(key, +1)}
                  disabled={remaining <= 0}
                  className={`w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-30 ${remaining > 0 ? "bg-amber-100 hover:bg-amber-200" : "bg-muted"}`}
                >
                  <ChevronUp className="w-4 h-4 text-amber-600" />
                </button>
              </div>
            </div>
          )
        })}

        {effectiveStats && <CombatStatsCard s={effectiveStats} />}
      </div>

      <div className="px-4 pt-4 pb-4 shrink-0">
        <button
          onClick={save}
          disabled={saving || totalSpent === 0}
          className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 text-white rounded-xl text-sm font-bold disabled:opacity-40 active:scale-95 transition-all shadow-sm"
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> 저장 중...</>
            : <><Save className="w-4 h-4" /> 스탯 적용</>
          }
        </button>
      </div>
    </div>
  )
}
