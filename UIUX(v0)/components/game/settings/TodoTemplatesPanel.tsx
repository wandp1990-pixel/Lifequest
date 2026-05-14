/**
 * @module components/game/settings/TodoTemplatesPanel
 * @purpose 반복 할 일 자동 생성 규칙. 리스트 + 폼 합성. 폼 자체는 TodoTemplateForm 분리.
 *          GET/POST/PUT/DELETE /api/todo-templates. 저장 후 onDataChanged 콜백.
 */

"use client"

import { useCallback, useEffect, useState } from "react"
import SettingsSection from "./SettingsSection"
import TodoTemplateForm, {
  EMPTY_TODO_TEMPLATE_FORM,
  MONTH_WEEK_OPTIONS,
  WEEKDAY_OPTIONS,
  type TodoTemplateFormState,
} from "./TodoTemplateForm"
import { apiDelete, apiGet, apiPost, apiPut, ApiError } from "@/hooks/useApi"

interface TodoTemplateRow {
  id: number
  name: string
  suggested_exp: number
  repeat_type: "weekly" | "monthly"
  weekly_days: string | null
  monthly_mode: "weekday" | "day" | null
  month_week: number | null
  month_weekday: number | null
  month_day: number | null
  notify_time: string | null
}

function formatRule(t: TodoTemplateRow): string {
  if (t.repeat_type === "weekly") {
    const labels = (t.weekly_days ?? "")
      .split(",")
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isInteger(v))
      .map((v) => WEEKDAY_OPTIONS.find((o) => o.value === v)?.label)
      .filter(Boolean)
    return `매주 ${labels.join(", ")}요일`
  }
  if (t.monthly_mode === "day") return `매달 ${t.month_day}일`
  const weekLabel = MONTH_WEEK_OPTIONS.find((o) => o.value === t.month_week)?.label ?? `${t.month_week}주`
  const dayLabel = WEEKDAY_OPTIONS.find((o) => o.value === t.month_weekday)?.label ?? ""
  return `매달 ${weekLabel} ${dayLabel}요일`
}

interface Props {
  onDataChanged?: () => void
}

export default function TodoTemplatesPanel({ onDataChanged }: Props) {
  const [templates, setTemplates] = useState<TodoTemplateRow[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<TodoTemplateFormState>(EMPTY_TODO_TEMPLATE_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await apiGet<{ templates?: TodoTemplateRow[] }>("/api/todo-templates")
      setTemplates(data.templates ?? [])
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    }
  }, [])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const resetForm = () => {
    setEditingId(null)
    setForm(EMPTY_TODO_TEMPLATE_FORM)
  }

  const fillForm = (t: TodoTemplateRow) => {
    setEditingId(t.id)
    setForm({
      name: t.name,
      suggested_exp: t.suggested_exp,
      repeat_type: t.repeat_type,
      weekly_days: t.weekly_days
        ? t.weekly_days.split(",").map((v) => Number(v.trim())).filter((v) => Number.isInteger(v))
        : [1],
      monthly_mode: t.monthly_mode ?? "weekday",
      month_week: t.month_week ?? 1,
      month_weekday: t.month_weekday ?? 1,
      month_day: t.month_day ?? 1,
      notify_time: t.notify_time ?? "",
    })
  }

  const save = async () => {
    if (!form.name.trim()) return
    if (form.repeat_type === "weekly" && form.weekly_days.length === 0) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        suggested_exp: form.suggested_exp,
        repeat_type: form.repeat_type,
        weekly_days: form.weekly_days,
        monthly_mode: form.repeat_type === "monthly" ? form.monthly_mode : null,
        month_week: form.repeat_type === "monthly" && form.monthly_mode === "weekday" ? form.month_week : null,
        month_weekday: form.repeat_type === "monthly" && form.monthly_mode === "weekday" ? form.month_weekday : null,
        month_day: form.repeat_type === "monthly" && form.monthly_mode === "day" ? form.month_day : null,
        notify_time: form.notify_time || null,
      }
      const data = editingId
        ? await apiPut<{ templates?: TodoTemplateRow[] }>("/api/todo-templates", { id: editingId, ...payload })
        : await apiPost<{ templates?: TodoTemplateRow[] }>("/api/todo-templates", payload)
      setTemplates(data.templates ?? [])
      resetForm()
      onDataChanged?.()
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: number) => {
    setDeletingId(id)
    try {
      const data = await apiDelete<{ templates?: TodoTemplateRow[] }>("/api/todo-templates", { id })
      setTemplates(data.templates ?? [])
      if (editingId === id) resetForm()
      onDataChanged?.()
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <SettingsSection title="반복 할 일 자동 생성">
      <div className="space-y-3">
        <p className="text-[11px] text-muted-foreground">
          저장한 규칙은 해당 날짜에 앱이 열릴 때 자동으로 할 일로 생성됩니다.
        </p>

        <div className="space-y-2">
          {templates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
              아직 반복 할 일 규칙이 없습니다
            </div>
          ) : (
            templates.map((t) => (
              <div key={t.id} className="rounded-xl border border-border bg-muted/40 px-3 py-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{formatRule(t)}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      XP {t.suggested_exp === 0 ? "AI 산정" : t.suggested_exp}
                      {t.notify_time ? ` · 알림 ${t.notify_time}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => fillForm(t)}
                    className="px-2 py-1 rounded-lg bg-background border border-border text-[10px] font-bold text-foreground active:scale-95"
                  >수정</button>
                  <button
                    onClick={() => remove(t.id)}
                    disabled={deletingId === t.id}
                    className="px-2 py-1 rounded-lg bg-red-50 text-red-500 text-[10px] font-bold active:scale-95 disabled:opacity-40"
                  >삭제</button>
                </div>
              </div>
            ))
          )}
        </div>

        <TodoTemplateForm
          form={form}
          setForm={setForm}
          editingId={editingId}
          resetForm={resetForm}
          saving={saving}
          onSave={save}
        />
      </div>
    </SettingsSection>
  )
}
