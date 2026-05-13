/**
 * @module lib/constants/ui
 * @purpose UI 색상·등급 라벨·우선순위 표시 등 시각 상수
 * @add-here:
 *   - 새 등급/슬롯/상태의 색상 매핑
 *   - 컴포넌트에 박혀있는 hex 색상은 의미 있는 이름과 함께 여기로 추출
 * @do-not:
 *   - 값 변경 (Phase 1 = 위치 이동만)
 */

/** 장비 등급별 강조 색상. 출처: components/game/ItemsTab.tsx:32-35 */
export const GRADE_COLOR: Record<string, string> = {
  C: "#9CA3AF", B: "#4FBF8F", A: "#4FA8E8",
  S: "#F5A524", SR: "#9B7BE8", SSR: "#FFD700", UR: "#FF1493",
}

/** 장비 등급별 한글 라벨. 출처: components/game/ItemsTab.tsx:36-38 */
export const GRADE_LABEL: Record<string, string> = {
  C: "일반", B: "고급", A: "희귀", S: "영웅", SR: "전설", SSR: "고대", UR: "신화",
}

/** 장비 등급별 카드 배경 색상. 출처: components/game/ItemsTab.tsx:39-47 */
export const GRADE_BG: Record<string, string> = {
  C:   "#F3F4F6",
  B:   "#E3F5EC",
  A:   "#E1EFFB",
  S:   "#FFF1D6",
  SR:  "#ECE5FA",
  SSR: "#FFFDE6",
  UR:  "rgba(255,20,147,0.08)",
}

/** 프로젝트 우선순위 한글 라벨. 출처: components/game/ProjectsTab.tsx:49 */
export const PRIORITY_LABEL: Record<string, string> = { high: "높음", medium: "보통", low: "낮음" }

/** 프로젝트 우선순위 Tailwind 색상 클래스. 출처: components/game/ProjectsTab.tsx:50-54 */
export const PRIORITY_COLOR: Record<string, string> = {
  high:   "text-red-400 bg-red-400/10",
  medium: "text-yellow-400 bg-yellow-400/10",
  low:    "text-slate-400 bg-slate-400/10",
}

/** 프로젝트 상태 한글 라벨. 출처: components/game/ProjectsTab.tsx:55 */
export const STATUS_LABEL: Record<string, string> = { todo: "시작 전", in_progress: "진행 중", done: "완료" }

/** 프로젝트 색상 옵션 선택지. 출처: components/game/ProjectsTab.tsx:56-62 */
export const PROJECT_COLOR_OPTIONS: { value: string; label: string; cls: string }[] = [
  { value: "violet",  label: "보라",  cls: "bg-violet-500" },
  { value: "blue",    label: "파랑",  cls: "bg-blue-500" },
  { value: "emerald", label: "초록",  cls: "bg-emerald-500" },
  { value: "amber",   label: "노랑",  cls: "bg-amber-500" },
  { value: "rose",    label: "빨강",  cls: "bg-rose-500" },
]

/** 프로젝트 색상 키 → Tailwind 클래스. 출처: components/game/ProjectsTab.tsx:63-66 */
export const PROJECT_COLOR_CLS: Record<string, string> = {
  violet: "bg-violet-500", blue: "bg-blue-500", emerald: "bg-emerald-500",
  amber: "bg-amber-500", rose: "bg-rose-500",
}

/**
 * 캐릭터 패널의 HP/MP/XP 바 색상.
 * 출처: components/game/CharacterPanel.tsx:26-28
 */
export const HP_MP_XP_COLORS = {
  HP: "#F58FA8",
  MP: "#7FB3F5",
  XP: "#F5C879",
} as const
