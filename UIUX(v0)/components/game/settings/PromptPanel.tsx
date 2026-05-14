/**
 * @module components/game/settings/PromptPanel
 * @purpose AI 판정 프롬프트 편집 + 저장. GET/PUT /api/prompt.
 */

"use client"

import { useEffect, useState } from "react"
import { FileText, Save } from "lucide-react"
import SettingsSection from "./SettingsSection"
import { apiGet, apiPut, ApiError } from "@/hooks/useApi"

export default function PromptPanel() {
  const [content, setContent] = useState("")
  const [input, setInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    apiGet<{ content: string }>("/api/prompt")
      .then((d) => { setContent(d.content ?? ""); setInput(d.content ?? "") })
      .catch((e) => { if (!(e instanceof ApiError)) throw e })
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await apiPut("/api/prompt", { content: input })
      setContent(input)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsSection title={<span className="flex items-center gap-2"><FileText className="w-4 h-4 text-violet-400" />AI 판정 프롬프트</span>}>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full text-xs text-foreground bg-muted border border-border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-violet-300 resize-none leading-relaxed"
        rows={10}
      />
      <div className="flex justify-between items-center mt-2">
        {saved
          ? <span className="text-[10px] text-violet-500 font-bold">저장 완료!</span>
          : <span className="text-[10px] text-muted-foreground">재배포 후에도 유지됩니다</span>
        }
        <button
          onClick={save}
          disabled={saving || input === content}
          className="flex items-center gap-1 px-3 py-1.5 bg-violet-500 text-white rounded-lg text-xs font-bold disabled:opacity-40 active:scale-95"
        >
          <Save className="w-3 h-3" />
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </SettingsSection>
  )
}
