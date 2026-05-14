/**
 * @module components/game/settings/TodoTemplateForm
 * @purpose 반복 할 일 규칙 폼(주간/월간). 부모(TodoTemplatesPanel) 가 form state 와 save/reset 핸들러 주입.
 */

"use client"

import type { Dispatch, SetStateAction } from "react"

export type TodoTemplateFormState = {
  name: string
  suggested_exp: number
  repeat_type: "weekly" | "monthly"
  weekly_days: number[]
  monthly_mode: "weekday" | "day"
  month_week: number
  month_weekday: number
  month_day: number
  notify_time: string
}

export const WEEKDAY_OPTIONS = [
  { value: 0, label: "일" },
  { value: 1, label: "월" },
  { value: 2, label: "화" },
  { value: 3, label: "수" },
  { value: 4, label: "목" },
  { value: 5, label: "금" },
  { value: 6, label: "토" },
]

export const MONTH_WEEK_OPTIONS = [
  { value: 1, label: "1주" },
  { value: 2, label: "2주" },
  { value: 3, label: "3주" },
  { value: 4, label: "4주" },
  { value: 5, label: "5주" },
]

export const EMPTY_TODO_TEMPLATE_FORM: TodoTemplateFormState = {
  name: "", suggested_exp: 0, repeat_type: "weekly", weekly_days: [1],
  monthly_mode: "weekday", month_week: 1, month_weekday: 1, month_day: 1, notify_time: "",
}

interface Props {
  form: TodoTemplateFormState
  setForm: Dispatch<SetStateAction<TodoTemplateFormState>>
  editingId: number | null
  resetForm: () => void
  saving: boolean
  onSave: () => void
}

export default function TodoTemplateForm({ form, setForm, editingId, resetForm, saving, onSave }: Props) {
  const toggleWeekday = (day: number) => {
    setForm((prev) => {
      const exists = prev.weekly_days.includes(day)
      const nextDays = exists ? prev.weekly_days.filter((v) => v !== day) : [...prev.weekly_days, day].sort((a, b) => a - b)
      return { ...prev, weekly_days: nextDays }
    })
  }

  return (
    <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 px-3 py-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-violet-700">{editingId ? "반복 규칙 수정" : "반복 규칙 추가"}</p>
        {editingId !== null && (
          <button onClick={resetForm} className="text-[10px] text-muted-foreground">새로 작성</button>
        )}
      </div>

      <input
        type="text"
        value={form.name}
        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        placeholder="할 일 이름"
        className="w-full text-sm text-gray-900 dark:text-gray-100 bg-background border border-violet-200 dark:border-violet-800 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300"
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-muted-foreground mb-1">경험치</label>
          <input
            type="number"
            min={0}
            value={form.suggested_exp}
            onChange={(e) => setForm((prev) => ({ ...prev, suggested_exp: Number(e.target.value) }))}
            className="w-full text-sm text-gray-900 dark:text-gray-100 bg-background border border-violet-200 dark:border-violet-800 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
        <div>
          <label className="block text-[10px] text-muted-foreground mb-1">알림 시간</label>
          <input
            type="time"
            value={form.notify_time}
            onChange={(e) => setForm((prev) => ({ ...prev, notify_time: e.target.value }))}
            className="w-full text-sm text-gray-900 dark:text-gray-100 bg-background border border-violet-200 dark:border-violet-800 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] text-muted-foreground mb-1">반복 방식</label>
        <div className="flex gap-2">
          <button
            onClick={() => setForm((prev) => ({ ...prev, repeat_type: "weekly" }))}
            className={`flex-1 py-2 rounded-xl text-xs font-bold ${form.repeat_type === "weekly" ? "bg-violet-500 text-white" : "bg-background border border-violet-200 dark:border-violet-800 text-muted-foreground"}`}
          >주간 반복</button>
          <button
            onClick={() => setForm((prev) => ({ ...prev, repeat_type: "monthly" }))}
            className={`flex-1 py-2 rounded-xl text-xs font-bold ${form.repeat_type === "monthly" ? "bg-violet-500 text-white" : "bg-background border border-violet-200 dark:border-violet-800 text-muted-foreground"}`}
          >월간 반복</button>
        </div>
      </div>

      {form.repeat_type === "weekly" && (
        <div>
          <label className="block text-[10px] text-muted-foreground mb-1">생성 요일</label>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_OPTIONS.map((option) => {
              const active = form.weekly_days.includes(option.value)
              return (
                <button
                  key={option.value}
                  onClick={() => toggleWeekday(option.value)}
                  className={`py-2 rounded-lg text-xs font-bold ${active ? "bg-violet-500 text-white" : "bg-background border border-violet-200 dark:border-violet-800 text-muted-foreground"}`}
                >{option.label}</button>
              )
            })}
          </div>
        </div>
      )}

      {form.repeat_type === "monthly" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setForm((prev) => ({ ...prev, monthly_mode: "weekday" }))}
              className={`flex-1 py-2 rounded-xl text-xs font-bold ${form.monthly_mode === "weekday" ? "bg-violet-500 text-white" : "bg-background border border-violet-200 dark:border-violet-800 text-muted-foreground"}`}
            >n주차 요일</button>
            <button
              onClick={() => setForm((prev) => ({ ...prev, monthly_mode: "day" }))}
              className={`flex-1 py-2 rounded-xl text-xs font-bold ${form.monthly_mode === "day" ? "bg-violet-500 text-white" : "bg-background border border-violet-200 dark:border-violet-800 text-muted-foreground"}`}
            >날짜</button>
          </div>

          {form.monthly_mode === "weekday" ? (
            <div className="grid grid-cols-2 gap-2">
              <select
                value={form.month_week}
                onChange={(e) => setForm((prev) => ({ ...prev, month_week: Number(e.target.value) }))}
                className="w-full text-sm text-gray-900 dark:text-gray-100 bg-background border border-violet-200 dark:border-violet-800 rounded-xl px-3 py-2 outline-none"
              >
                {MONTH_WEEK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select
                value={form.month_weekday}
                onChange={(e) => setForm((prev) => ({ ...prev, month_weekday: Number(e.target.value) }))}
                className="w-full text-sm text-gray-900 dark:text-gray-100 bg-background border border-violet-200 dark:border-violet-800 rounded-xl px-3 py-2 outline-none"
              >
                {WEEKDAY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}요일</option>)}
              </select>
            </div>
          ) : (
            <input
              type="number"
              min={1}
              max={31}
              value={form.month_day}
              onChange={(e) => setForm((prev) => ({ ...prev, month_day: Number(e.target.value) }))}
              className="w-full text-sm text-gray-900 dark:text-gray-100 bg-background border border-violet-200 dark:border-violet-800 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300"
            />
          )}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">XP를 0으로 두면 생성된 할 일은 완료 시 AI가 경험치를 산정합니다.</p>

      <button
        onClick={onSave}
        disabled={saving || !form.name.trim() || (form.repeat_type === "weekly" && form.weekly_days.length === 0)}
        className="w-full py-2.5 bg-violet-500 text-white rounded-xl text-sm font-bold disabled:opacity-40 active:scale-95"
      >
        {saving ? "저장 중..." : editingId ? "규칙 저장" : "규칙 추가"}
      </button>
    </div>
  )
}
