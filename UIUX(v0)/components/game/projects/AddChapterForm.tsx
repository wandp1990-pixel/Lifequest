/**
 * @module components/game/projects/AddChapterForm
 * @purpose 새 묶음(chapter) 인라인 폼. POST /api/chapters.
 *          이름 + 마감일만. onCreated 후 컨테이너가 expanded 처리.
 */

"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { apiPost, ApiError } from "@/hooks/useApi"
import type { Chapter } from "@/hooks/useProjects"

interface Props {
  onClose: () => void
  onCreated: (createdId: number | null) => void
}

export default function AddChapterForm({ onClose, onCreated }: Props) {
  const [name, setName] = useState("")
  const [endDate, setEndDate] = useState("")

  const submit = async () => {
    if (!name.trim()) return
    try {
      const data = await apiPost<{ chapters?: Chapter[] }>("/api/chapters", {
        name: name.trim(),
        end_date: endDate || null,
      })
      const newest = (data.chapters ?? []).at(-1)
      onCreated(newest?.id ?? null)
      onClose()
      setName(""); setEndDate("")
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    }
  }

  return (
    <div className="border border-border rounded-xl p-3 space-y-2 bg-card">
      <div className="flex justify-between items-center">
        <span className="text-sm font-bold">새 묶음</span>
        <button onClick={onClose}><X size={16} className="text-muted-foreground" /></button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        비슷한 프로젝트들을 한 묶음으로 관리하세요. 만든 뒤 묶음 안에서 프로젝트를 추가할 수 있습니다.
      </p>
      <input
        autoFocus
        className="w-full text-sm bg-muted border border-border rounded-lg px-3 py-2 outline-none focus:border-violet-500"
        placeholder="묶음 이름 *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] text-muted-foreground block mb-1">마감일</label>
          <input
            type="date"
            className="w-full text-xs bg-muted border border-border rounded-lg px-2 py-1.5 outline-none"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
      <button
        onClick={submit}
        disabled={!name.trim()}
        className="w-full py-2 text-sm bg-violet-500 text-white rounded-xl font-bold disabled:opacity-40"
      >
        묶음 생성
      </button>
    </div>
  )
}
