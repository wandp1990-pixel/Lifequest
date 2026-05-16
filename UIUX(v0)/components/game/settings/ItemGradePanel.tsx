"use client"

import { useCallback, useEffect, useState } from "react"
import { Save } from "lucide-react"
import SettingsSection from "./SettingsSection"
import { apiGet, apiPut, ApiError } from "@/hooks/useApi"

interface GradeRow {
  grade: string
  name: string
  weight: number
  stat_min: number
  stat_max: number
}

const GRADE_COLOR: Record<string, string> = {
  C: "bg-gray-400",
  B: "bg-green-500",
  A: "bg-blue-500",
  S: "bg-red-500",
  SR: "bg-purple-500",
  SSR: "bg-yellow-500",
  UR: "bg-orange-500",
}

export default function ItemGradePanel() {
  const [grades, setGrades] = useState<GradeRow[]>([])
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const fetchGrades = useCallback(async () => {
    try {
      const data = await apiGet<GradeRow[]>("/api/item-grades")
      // 등급 순서: C → UR
      const ORDER = ["C", "B", "A", "S", "SR", "SSR", "UR"]
      const sorted = [...data].sort((a, b) => ORDER.indexOf(a.grade) - ORDER.indexOf(b.grade))
      setGrades(sorted)
      const map: Record<string, string> = {}
      sorted.forEach((r) => { map[r.grade] = String(r.weight) })
      setEdits(map)
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    }
  }, [])

  useEffect(() => { fetchGrades() }, [fetchGrades])

  const totalWeight = grades.reduce((sum, g) => {
    const w = parseFloat(edits[g.grade] ?? String(g.weight))
    return sum + (isNaN(w) || w < 0 ? 0 : w)
  }, 0)

  const pct = (grade: string) => {
    if (totalWeight <= 0) return "0.00"
    const w = parseFloat(edits[grade] ?? "0")
    return ((isNaN(w) || w < 0 ? 0 : w) / totalWeight * 100).toFixed(2)
  }

  const saveAll = async () => {
    setSaving(true)
    try {
      await Promise.all(
        grades.map((g) => apiPut("/api/item-grades", { grade: g.grade, weight: edits[g.grade] }))
      )
      await fetchGrades()
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsSection title={<span className="text-emerald-600">아이템 등급 확률 에디터</span>}>
      {grades.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">불러오는 중...</p>
      ) : (
        <div className="rounded-xl overflow-hidden border border-border">
          {/* 헤더 */}
          <div className="flex items-center gap-2 px-3 py-2 bg-muted border-b border-border">
            <span className="flex-1 text-[10px] font-bold text-muted-foreground">등급</span>
            <span className="w-20 text-right text-[10px] font-bold text-muted-foreground">가중치</span>
            <span className="w-14 text-right text-[10px] font-bold text-muted-foreground">확률</span>
          </div>
          {grades.map((g, i) => (
            <div
              key={g.grade}
              className={`flex items-center gap-2 px-3 py-2.5 bg-background ${i < grades.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${GRADE_COLOR[g.grade] ?? "bg-gray-400"}`} />
                <span className="text-xs font-bold text-foreground">{g.grade}</span>
                <span className="text-[10px] text-muted-foreground">{g.name}</span>
              </div>
              <input
                type="number"
                min={0}
                step={0.1}
                value={edits[g.grade] ?? String(g.weight)}
                onChange={(e) => setEdits((p) => ({ ...p, [g.grade]: e.target.value }))}
                className="w-20 text-right text-xs font-bold bg-muted border border-border rounded-lg px-1.5 py-1 outline-none focus:ring-2 focus:ring-emerald-300"
              />
              <span className="w-14 text-right text-xs text-muted-foreground tabular-nums">
                {pct(g.grade)}%
              </span>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={saveAll}
        disabled={saving || grades.length === 0}
        className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold disabled:opacity-50 active:scale-95"
      >
        <Save className="w-4 h-4" />
        {saving ? "저장 중..." : "일괄 저장"}
      </button>
    </SettingsSection>
  )
}
