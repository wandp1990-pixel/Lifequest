// HP/MP 자연 회복 계산 (서버/클라이언트 공통)
// last_regen_at은 KST 형식 "YYYY-MM-DD HH:MM:SS" (lib/db/client.ts now() 참고)
export function calcRegen(
  current: number,
  max: number,
  stat: number,
  lastRegenAt: string | null | undefined,
): number {
  if (!lastRegenAt || current >= max) return Math.min(current, max)
  const lastMs = new Date(lastRegenAt.replace(" ", "T") + "+09:00").getTime()
  const elapsedMin = (Date.now() - lastMs) / 60000
  if (!Number.isFinite(elapsedMin) || elapsedMin <= 0) return Math.min(current, max)
  const regenPerMin = Math.floor(max * 0.10) + Math.floor(stat / 10)
  return Math.min(max, Math.round(current + elapsedMin * regenPerMin))
}
