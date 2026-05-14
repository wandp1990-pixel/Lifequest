/**
 * @module components/game/settings/ResetPanel
 * @purpose 캐릭터 초기화. 소프트(레벨/스탯/기록/장비/스킬만) vs 완전(할일/습관/루틴까지).
 *          공통 PUT /api/character RESET_VALUES → DELETE /api/character?mode=partial|full → 페이지 리로드.
 */

"use client"

import { useState } from "react"
import { RotateCcw } from "lucide-react"
import SettingsSection from "./SettingsSection"
import { apiDelete, apiPut, ApiError } from "@/hooks/useApi"

const RESET_VALUES = {
  level: "1", total_exp: "0", stat_points: "0", skill_points: "0", draw_tickets: "0",
  str: "0", vit: "0", dex: "0", int_stat: "0", luk: "0",
  current_hp: "100", max_hp: "100", current_mp: "50", max_mp: "50",
  clear_count: "0", task_count: "0",
}

interface Props {
  onClose: () => void
}

export default function ResetPanel({ onClose }: Props) {
  const [confirmFull, setConfirmFull] = useState(false)
  const [confirmPartial, setConfirmPartial] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [partialResetting, setPartialResetting] = useState(false)

  const doReset = async (mode: "partial" | "full") => {
    const setter = mode === "full" ? setResetting : setPartialResetting
    setter(true)
    try {
      await apiPut("/api/character", RESET_VALUES)
      await apiDelete(`/api/character?mode=${mode}`)
      onClose()
      window.location.reload()
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    } finally {
      setter(false)
    }
  }

  return (
    <SettingsSection title={<span className="text-red-500">캐릭터 초기화</span>}>
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/40 px-3 py-3">
          <p className="text-xs font-bold text-orange-700 mb-0.5">소프트 초기화</p>
          <p className="text-[10px] text-orange-500 mb-3">레벨·스탯·기록·장비·스킬을 초기화합니다.<br />할일·습관·루틴 항목은 유지됩니다.</p>
          {!confirmPartial ? (
            <button
              onClick={() => setConfirmPartial(true)}
              className="w-full flex items-center justify-center gap-2 py-2 bg-orange-100 text-orange-600 border border-orange-200 rounded-xl text-sm font-bold active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              소프트 초기화
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setConfirmPartial(false)} className="flex-1 py-2 bg-muted text-muted-foreground rounded-xl text-sm font-bold active:scale-95">취소</button>
              <button
                onClick={() => doReset("partial")}
                disabled={partialResetting}
                className="flex-1 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold disabled:opacity-50 active:scale-95"
              >
                {partialResetting ? "초기화 중..." : "확인"}
              </button>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-3 py-3">
          <p className="text-xs font-bold text-red-600 mb-0.5">완전 초기화</p>
          <p className="text-[10px] text-red-400 mb-3">모든 데이터를 초기화합니다.<br />할일·습관·루틴 항목도 삭제됩니다. 복구 불가.</p>
          {!confirmFull ? (
            <button
              onClick={() => setConfirmFull(true)}
              className="w-full flex items-center justify-center gap-2 py-2 bg-red-100 text-red-500 border border-red-200 rounded-xl text-sm font-bold active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              완전 초기화
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setConfirmFull(false)} className="flex-1 py-2 bg-muted text-muted-foreground rounded-xl text-sm font-bold active:scale-95">취소</button>
              <button
                onClick={() => doReset("full")}
                disabled={resetting}
                className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-bold disabled:opacity-50 active:scale-95"
              >
                {resetting ? "초기화 중..." : "확인"}
              </button>
            </div>
          )}
        </div>
      </div>
    </SettingsSection>
  )
}
