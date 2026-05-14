/**
 * @module components/game/settings/SettingsSection
 * @purpose collapsible 헤더 + 콘텐츠 박스. SettingsDrawer 의 각 panel 공통 chrome.
 *          panel 들이 자체적으로 toggle state 보유 → 컨테이너는 단순 합성만.
 */

"use client"

import { ChevronDown, ChevronRight } from "lucide-react"
import { useState, type ReactNode } from "react"

interface SettingsSectionProps {
  title: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}

export default function SettingsSection({ title, defaultOpen = false, children }: SettingsSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border active:bg-muted"
      >
        <span className="text-sm font-bold text-foreground">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pt-3 pb-4">{children}</div>}
    </>
  )
}
