/**
 * @module contexts/ToastContext
 * @purpose sonner 기반 글로벌 toast. exp/levelup/error/info 의미 단위 helper 제공.
 *          기존 컴포넌트들은 자체 toast state 를 유지하는 상태라 본 컨텍스트는 Phase 4 분할 시 자식 컴포넌트들이 점진적으로 사용.
 *          layout 에는 <Toaster /> 만 추가하고 본 hook 사용은 호출자가 결정.
 * @add-here:
 *   - 새 toast 종류 (예: showAchievement)
 * @do-not:
 *   - 기존 컴포넌트의 inline toast 를 일괄 교체. Phase 4 의 컴포넌트 분할과 함께 점진 마이그레이션.
 */

"use client"

import { toast } from "sonner"
import { TOAST_AUTO_DISMISS_MS } from "@/lib/constants/time"

export function useToast() {
  return {
    showExp: (exp: number, comment?: string, bonus?: number, penaltyExp?: number) => {
      const title =
        penaltyExp
          ? `+${exp} EXP · 패널티 -${penaltyExp}`
          : bonus
          ? `+${exp} EXP · 보너스 +${bonus}`
          : `+${exp} EXP!`
      toast(title, { description: comment, duration: TOAST_AUTO_DISMISS_MS })
    },
    showPenalty: (exp: number, comment?: string) => {
      toast(`${exp} EXP (기한 초과 절반)`, { description: comment, duration: TOAST_AUTO_DISMISS_MS })
    },
    showLevelUp: (level: number) => {
      toast(`레벨 업! Lv.${level}`, { duration: TOAST_AUTO_DISMISS_MS })
    },
    showError: (msg: string) => {
      toast.error(msg, { duration: TOAST_AUTO_DISMISS_MS })
    },
    showInfo: (msg: string, description?: string) => {
      toast(msg, { description, duration: TOAST_AUTO_DISMISS_MS })
    },
  }
}
