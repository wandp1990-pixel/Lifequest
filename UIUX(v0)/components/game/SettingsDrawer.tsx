/**
 * @module components/game/SettingsDrawer
 * @purpose 설정 drawer 컨테이너. drawer chrome + 8개 patch panel 합성.
 *          각 panel 은 자체 fetch + state 보유 (components/game/settings/* 참조).
 *          char/refetch 는 CharacterContext 에서 각 panel 이 직접 구독 (Phase 5.1).
 *          onDataChanged: 데이터 트리 변경(todo template) 후 호출 (TasksTab refresh 트리거)
 */

"use client"

import { X } from "lucide-react"
import PushSetup from "./PushSetup"
import TodoTemplatesPanel from "./settings/TodoTemplatesPanel"
import PromptPanel from "./settings/PromptPanel"
import CharacterPanel from "./settings/CharacterPanel"
import SkillsPanel from "./settings/SkillsPanel"
import SkillDbPanel from "./settings/SkillDbPanel"
import ConfigPanel from "./settings/ConfigPanel"
import BattleConfigPanel from "./settings/BattleConfigPanel"
import ItemGradePanel from "./settings/ItemGradePanel"
import ResetPanel from "./settings/ResetPanel"

interface SettingsDrawerProps {
  onDataChanged?: () => void
  onClose: () => void
}

export default function SettingsDrawer({ onDataChanged, onClose }: SettingsDrawerProps) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div
        className="fixed inset-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-background z-50 flex flex-col"
        style={{ maxHeight: "100dvh" }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <h2 className="text-base font-bold text-foreground">설정</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-muted active:scale-95">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-6">
          <div className="px-4 py-1 border-b border-border">
            <PushSetup />
          </div>

          <TodoTemplatesPanel onDataChanged={onDataChanged} />
          <PromptPanel />
          <CharacterPanel />
          <SkillsPanel />
          <SkillDbPanel />
          <ConfigPanel />
          <BattleConfigPanel />
          <ItemGradePanel />
          <ResetPanel onClose={onClose} />
        </div>
      </div>
    </>
  )
}
