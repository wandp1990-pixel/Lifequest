/**
 * @module lib/game/rewards
 * @purpose addActivityLog → incrementTaskCount → gainExp 시퀀스의 단일 진입점.
 *          route 에 12회 반복되는 패턴을 한 곳으로 모은다.
 * @add-here:
 *   - 새 보상 사이드이펙트 (예: 업적, 디스코드 알림 push) 는 여기에 통합
 *   - 새 source 종류 추가 시 union 타입 확장
 * @do-not:
 *   - gainExp 트랜잭션 본문 수정 (시맨틱 검증된 코드 — lib/game.ts:42-123)
 *   - 응답 shape 변경 (route 들이 의존)
 */

import { addActivityLog, incrementTaskCount } from "@/lib/db"
import { gainExp } from "@/lib/game"

/** 보상의 출처. activity_log.type 칼럼에 그대로 들어간다. */
export type RewardSource = "daily" | "todo" | "routine" | "project" | "quest" | "battle"

export interface RewardResult {
  leveledUp: boolean
  oldLevel: number
  newLevel: number
  rewards: { statPoints: number; skillPoints: number; drawTickets: number }
}

/**
 * 보상 적용 표준 시퀀스: activity_log 기록 → task_count 증가 → gainExp.
 *
 * 호출 순서·SQL 트랜잭션 경계는 기존 route 패턴과 동일.
 * gainExp 의 반환값을 그대로 통과시킨다 (route 응답에서 spread 가능).
 *
 * exp === 0 이어도 모두 호출한다 (기존 동작 유지 — 그룹 보너스 0 케이스 등).
 */
export async function applyReward(opts: {
  source: RewardSource
  label: string
  exp: number
  comment: string
}): Promise<RewardResult> {
  await addActivityLog(opts.label, opts.source, opts.exp, opts.comment)
  await incrementTaskCount()
  return await gainExp(opts.exp)
}
