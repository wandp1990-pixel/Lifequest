/**
 * @module components/game/home/ActivitySection
 * @purpose 오늘의 활동 입력 + AI 채점 결과 토스트 + 최근 5건 로그. POST /api/activities, GET /api/activities?type=ai&limit=5.
 */

"use client"

import { useEffect, useState, useCallback } from "react"
import { Send } from "lucide-react"

interface ActivityLog {
  id: number
  input_text: string
  exp_gained: number
  ai_comment: string
}

interface Props {
  refreshTick?: number
  onExpGained: () => void
}

export default function ActivitySection({ refreshTick, onExpGained }: Props) {
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [toast, setToast] = useState<{ exp: number; comment: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    const res = await fetch("/api/activities?type=ai&limit=5")
    if (res.ok) setLogs(await res.json())
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs, refreshTick])

  const submit = async () => {
    if (!text.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "오류"); return }
      setText("")
      setToast({ exp: data.exp ?? 0, comment: data.comment ?? "" })
      setTimeout(() => setToast(null), 3000)
      onExpGained()
      fetchLogs()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-4 mt-3 rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-4 pt-3 pb-3 bg-background">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-black text-muted-foreground uppercase tracking-wide">✍️ 오늘의 활동</p>
          {logs.length > 0 ? (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-amber-500" style={{ background: "#FEF3C7" }}>
              +{logs.reduce((sum, log) => sum + log.exp_gained, 0)} EXP
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#EFEAFE", color: "#6E59F2" }}>🤖 AI 자동 채점</span>
          )}
        </div>

        {toast && (
          <div className="mb-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex flex-col gap-0.5">
            <span className="text-sm font-black text-amber-600">+{toast.exp} EXP!</span>
            <span className="text-xs text-amber-500 leading-snug">{toast.comment}</span>
          </div>
        )}
        {error && (
          <div className="mb-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return
              // 한글 IME 조합 중 Enter는 조합 확정용 — submit으로 흘리지 않는다
              if (e.nativeEvent.isComposing) return
              submit()
            }}
            maxLength={1000}
            placeholder="오늘 한 일을 입력하세요..."
            style={{ fontSize: "16px" }}
            className="flex-1 min-w-0 bg-muted border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-300 transition"
            disabled={submitting}
          />
          <button
            onClick={submit}
            disabled={submitting || !text.trim()}
            className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center text-white disabled:opacity-40 active:scale-95 flex-shrink-0"
          >
            {submitting ? (
              <span className="text-[9px] font-black animate-pulse">AI</span>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        {submitting && (
          <p className="text-[11px] text-amber-400 mt-1.5 text-center animate-pulse">AI 게임 마스터가 판정 중...</p>
        )}
      </div>

      {logs.length > 0 && (
        <div className="border-t border-border">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 px-4 py-2.5 border-b border-border last:border-0 bg-background">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{log.input_text}</p>
                <p className="text-[10px] text-muted-foreground leading-snug break-keep">{log.ai_comment}</p>
              </div>
              <span className="text-xs font-black text-amber-500 flex-shrink-0">+{log.exp_gained}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
