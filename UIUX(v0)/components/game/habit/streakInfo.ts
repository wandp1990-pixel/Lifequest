/**
 * @module components/game/habit/streakInfo
 * @purpose 습관 streak 값에 따른 색상/라벨 분류.
 */

export function streakInfo(streak: number) {
  const color =
    streak >= 100 ? "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800" :
    streak >= 30 ? "text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800" :
    streak >= 7 ? "text-orange-600 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800" :
    streak >= 1 ? "text-orange-500 bg-orange-50 dark:bg-orange-950/40 border-orange-100 dark:border-orange-800" :
    "text-muted-foreground bg-muted border-border"
  const label =
    streak >= 100 ? "🏆 완전 습관" :
    streak >= 90 ? `💫 ${streak}일 (루틴 완성)` :
    streak >= 60 ? `🔥 ${streak}일 (습관 완성!)` :
    streak >= 30 ? `🔥 ${streak}일 (자리잡는 중)` :
    streak >= 14 ? `🔥 ${streak}일 (유지 중)` :
    streak >= 7 ? `🔥 ${streak}일 (적응 중)` :
    streak >= 1 ? `🌱 ${streak}일 (시작)` : "아직 시작 전"
  return { color, label }
}
