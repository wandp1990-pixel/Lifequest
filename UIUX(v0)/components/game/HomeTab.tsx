"use client"

import { useState, useEffect, useCallback } from "react"
import { Send } from "lucide-react"

interface ActivityLog {
  id: number
  input_text: string
  exp_gained: number
  ai_comment: string
}

interface HomeTabProps {
  onExpGained: () => void
}

export default function HomeTab({ onExpGained }: HomeTabProps) {
  const [actText, setActText] = useState("")
  const [actSubmitting, setActSubmitting] = useState(false)
  const [actLogs, setActLogs] = useState<ActivityLog[]>([])
  const [actToast, setActToast] = useState<{ exp: number; comment: string } | null>(null)
  const [actError, setActError] = useState<string | null>(null)

  const fetchActLogs = useCallback(async () => {
    const res = await fetch("/api/activities?type=ai&limit=5")
    if (res.ok) setActLogs(await res.json())
  }, [])

  useEffect(() => {
    fetchActLogs()
  }, [fetchActLogs])

  const submitActivity = async () => {
    if (!actText.trim() || actSubmitting) return
    setActSubmitting(true)
    setActError(null)
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: actText }),
      })
      const data = await res.json()
      if (!res.ok) { setActError(data.error ?? "오류"); return }
      setActText("")
      setActToast({ exp: data.exp, comment: data.comment })
      setTimeout(() => setActToast(null), 3000)
      onExpGained()
      fetchActLogs()
    } finally {
      setActSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-0 pb-6">
      <div className="mx-4 mt-4 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-3 bg-white">
          <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">✍️ 오늘의 활동</p>

          {actToast && (
            <div className="mb-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex justify-between items-center">
              <span className="text-sm font-black text-amber-600">+{actToast.exp} EXP!</span>
              <span className="text-xs text-amber-500 ml-2 truncate">{actToast.comment}</span>
            </div>
          )}
          {actError && (
            <div className="mb-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <p className="text-xs text-red-600">{actError}</p>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={actText}
              onChange={(e) => setActText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitActivity()}
              placeholder="오늘 한 일을 입력하세요..."
              className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-300 transition"
              disabled={actSubmitting}
            />
            <button
              onClick={submitActivity}
              disabled={actSubmitting || !actText.trim()}
              className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center text-white disabled:opacity-40 active:scale-95 flex-shrink-0"
            >
              {actSubmitting ? (
                <span className="text-[9px] font-black animate-pulse">AI</span>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          {actSubmitting && (
            <p className="text-[11px] text-amber-400 mt-1.5 text-center animate-pulse">
              AI 게임 마스터가 판정 중...
            </p>
          )}
        </div>

        {actLogs.length > 0 && (
          <div className="border-t border-gray-100">
            {actLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 px-4 py-2.5 border-b border-gray-50 last:border-0 bg-white">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700 truncate">{log.input_text}</p>
                  <p className="text-[10px] text-gray-400 leading-snug">{log.ai_comment}</p>
                </div>
                <span className="text-xs font-black text-amber-500 flex-shrink-0">+{log.exp_gained}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
