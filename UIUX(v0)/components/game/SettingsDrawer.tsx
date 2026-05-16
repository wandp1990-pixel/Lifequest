/**
 * @module components/game/SettingsDrawer
 * @purpose 설정 drawer 컨테이너. drawer chrome + 8개 patch panel 합성.
 *          각 panel 은 자체 fetch + state 보유 (components/game/settings/* 참조).
 *          char/refetch 는 CharacterContext 에서 각 panel 이 직접 구독 (Phase 5.1).
 *          onDataChanged: 데이터 트리 변경(todo template) 후 호출 (TasksTab refresh 트리거)
 *
 *          관리자 섹션(인라인): admin 보호된 라우트(/api/skill-db CUD, /api/battle-config PUT)
 *          호출 시 사용할 토큰을 localStorage 에 저장. lib/admin/token.ts 의 헬퍼와 연동.
 */

"use client"

import { useEffect, useState } from "react"
import { Eye, EyeOff, KeyRound, X } from "lucide-react"
import PushSetup from "./PushSetup"
import SettingsSection from "./settings/SettingsSection"
import TodoTemplatesPanel from "./settings/TodoTemplatesPanel"
import PromptPanel from "./settings/PromptPanel"
import CharacterPanel from "./settings/CharacterPanel"
import SkillsPanel from "./settings/SkillsPanel"
import SkillDbPanel from "./settings/SkillDbPanel"
import ConfigPanel from "./settings/ConfigPanel"
import BattleConfigPanel from "./settings/BattleConfigPanel"
import ItemGradePanel from "./settings/ItemGradePanel"
import ResetPanel from "./settings/ResetPanel"
import { getAdminToken, setAdminToken } from "@/lib/admin/token"

interface SettingsDrawerProps {
  onDataChanged?: () => void
  onClose: () => void
}

/**
 * Admin 토큰 입력 섹션. localStorage 에만 저장.
 * onChange 즉시 저장(별도 저장 버튼 없이) — 패널 측 fetch 가 호출 시점에 getAdminToken() 으로 읽음.
 * SSR 안전: 초기 state 는 빈 문자열, useEffect 에서 localStorage 동기화.
 */
function AdminTokenSection() {
  const [token, setToken] = useState("")
  const [show, setShow] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    setToken(getAdminToken())
  }, [])

  const handleChange = (value: string) => {
    setToken(value)
    setAdminToken(value)
    setSavedAt(Date.now())
  }

  return (
    <SettingsSection
      title={<span className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-amber-500" />관리자</span>}
    >
      <div className="flex flex-col gap-2">
        <label className="text-[10px] text-muted-foreground">
          ADMIN_SECRET (스킬 DB / 전투 상수 편집용)
        </label>
        <div className="flex items-center gap-1.5">
          <input
            type={show ? "text" : "password"}
            value={token}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Bearer 토큰 (배포 환경의 ADMIN_SECRET 값)"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 min-w-0 text-xs font-mono bg-background border border-border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-amber-300"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-muted text-muted-foreground active:scale-95"
            aria-label={show ? "토큰 숨기기" : "토큰 보기"}
          >
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground leading-snug">
          이 토큰은 브라우저 localStorage 에만 저장되며 서버로 전송되지 않습니다(Authorization 헤더 제외).
          비워 두면 admin 보호 라우트 호출 시 401 이 반환됩니다.
        </p>
        {savedAt && (
          <p className="text-[10px] text-emerald-500">저장됨</p>
        )}
      </div>
    </SettingsSection>
  )
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

          <AdminTokenSection />
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
