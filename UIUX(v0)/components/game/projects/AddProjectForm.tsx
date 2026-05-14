/**
 * @module components/game/projects/AddProjectForm
 * @purpose 새 프로젝트 인라인 폼. POST /api/projects.
 *          묶음(chapter) 선택 가능. 작업/색상/마감일/우선순위.
 */

"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { PROJECT_COLOR_OPTIONS } from "@/lib/constants/ui"
import { apiPost, ApiError } from "@/hooks/useApi"
import type { Chapter } from "@/hooks/useProjects"

interface Props {
  chapters: Chapter[]
  onClose: () => void
  onCreated: () => void
}

export default function AddProjectForm({ chapters, onClose, onCreated }: Props) {
  const [name, setName] = useState("")
  const [desc, setDesc] = useState("")
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium")
  const [dueDate, setDueDate] = useState("")
  const [color, setColor] = useState("violet")
  const [chapterId, setChapterId] = useState<number | null>(null)

  const submit = async () => {
    if (!name.trim()) return
    try {
      await apiPost("/api/projects", {
        name: name.trim(), description: desc, priority,
        due_date: dueDate || null, color, chapter_id: chapterId,
      })
      onCreated()
      onClose()
      setName(""); setDesc(""); setPriority("medium")
      setDueDate(""); setColor("violet"); setChapterId(null)
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    }
  }

  return (
    <div className="border border-border rounded-xl p-3 space-y-2 bg-card">
      <div className="flex justify-between items-center">
        <span className="text-sm font-bold">새 프로젝트</span>
        <button onClick={onClose}><X size={16} className="text-muted-foreground" /></button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        작업 완료 시 고정 XP를 받고, 프로젝트 완료 시 작업 XP 합계만큼 추가 보너스를 받습니다.
      </p>
      <input
        autoFocus
        className="w-full text-sm bg-muted border border-border rounded-lg px-3 py-2 outline-none focus:border-violet-500"
        placeholder="프로젝트 이름 *"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="w-full text-xs bg-muted border border-border rounded-lg px-3 py-2 outline-none focus:border-violet-500"
        placeholder="설명 (선택)"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] text-muted-foreground block mb-1">우선순위</label>
          <select
            className="w-full text-xs bg-muted border border-border rounded-lg px-2 py-1.5 outline-none"
            value={priority}
            onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
          >
            <option value="high">높음</option>
            <option value="medium">보통</option>
            <option value="low">낮음</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="text-[11px] text-muted-foreground block mb-1">마감일</label>
          <input
            type="date"
            className="w-full text-xs bg-muted border border-border rounded-lg px-2 py-1.5 outline-none"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>
      {chapters.length > 0 && (
        <div>
          <label className="text-[11px] text-muted-foreground block mb-1">묶음 (선택)</label>
          <select
            className="w-full text-xs bg-muted border border-border rounded-lg px-2 py-1.5 outline-none"
            value={chapterId ?? ""}
            onChange={(e) => setChapterId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">없음 (단독)</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="text-[11px] text-muted-foreground block mb-1">색상</label>
        <div className="flex gap-2">
          {PROJECT_COLOR_OPTIONS.map((c) => (
            <button
              key={c.value}
              onClick={() => setColor(c.value)}
              className={`w-6 h-6 rounded-full ${c.cls} ${color === c.value ? "ring-2 ring-white ring-offset-1 ring-offset-background" : ""}`}
            />
          ))}
        </div>
      </div>
      <button
        onClick={submit}
        disabled={!name.trim()}
        className="w-full py-2 text-sm bg-violet-500 text-white rounded-xl font-bold disabled:opacity-40"
      >
        프로젝트 생성
      </button>
    </div>
  )
}
