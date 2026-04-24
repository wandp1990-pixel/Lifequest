"use client"

import { useState, useEffect } from "react"
import { Send } from "lucide-react"

interface ActivityLog {
  id: number
  input_text: string
  exp_gained: number
  ai_comment: string
  created_at: string
}

interface TodosTabProps {
  onExpGained?: () => void
}

export default function TodosTab({ onExpGained }: TodosTabProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ exp: number; comment: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/activities")
      .then((r) => r.json())
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

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
      if (!res.ok) {
        setError(data.error ?? "오류가 발생했습니다")
        return
      }
      setToast({ exp: data.exp, comment: data.comment })
      setText("")
      onExpGained?.()
      // 로그 갱신
      const logsRes = await fetch("/api/activities")
      if (logsRes.ok) setLogs(await logsRes.json())
      setTimeout(() => setToast(null), 3000)
    } catch {
      setError("서버 연결 오류")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-0">
      {/* 입력 영역 */}
      <div className="px-3 py-3 border-b border-gray-100 bg-white sticky top-0 z-10">
        {toast && (
          <div className="mb-2 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2">
            <p className="text-sm font-bold text-violet-700">+{toast.exp} EXP 획득!</p>
            <p className="text-xs text-violet-500">{toast.comment}</p>
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
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="오늘 한 일을 입력하세요..."
            className="flex-1 text-sm bg-gray-100 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-violet-300 transition"
            disabled={submitting}
          />
          <button
            onClick={submit}
            disabled={submitting || !text.trim()}
            className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-white disabled:opacity-50 active:scale-95 transition flex-shrink-0"
          >
            {submitting ? (
              <span className="text-[10px] font-black animate-pulse">AI</span>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        {submitting && (
          <p className="text-[11px] text-violet-400 mt-1.5 text-center animate-pulse">
            AI 게임 마스터가 판정 중...
          </p>
        )}
      </div>

      {/* 로그 목록 */}
      {logs.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-400 text-sm">활동을 입력하면 AI가 EXP를 판정합니다</p>
        </div>
      )}
      {logs.map((log) => (
        <div key={log.id} className="flex items-stretch bg-white border-b border-gray-100">
          <div className="w-14 flex items-center justify-center flex-shrink-0 bg-[#7c3aed] rounded-l-xl my-1 ml-1">
            <div className="w-8 h-8 rounded-full bg-[#9b59b6]/40 border-2 border-[#9b59b6] flex items-center justify-center">
              <span className="text-[10px] font-black text-white leading-none">+{log.exp_gained}</span>
            </div>
          </div>
          <div className="flex-1 py-3 px-3">
            <p className="text-sm font-semibold text-gray-800 leading-snug mb-0.5">{log.input_text}</p>
            <p className="text-xs text-violet-400">{log.ai_comment}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
