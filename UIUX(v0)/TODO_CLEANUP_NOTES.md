# 할일 체크 기능 — 남은 작업

**최종 업데이트**: 2026-05-16  
**이전 세션**: 1차(#2/#4) / 2차(#5/#1 부분) / 3차(#3) 완료

---

## 완료 요약

| # | 제목 | 상태 | 커밋 |
|----|------|------|------|
| #2 | 다른 탭 race UX 개선 | ✓ 완료 | `88a9578` |
| #3 | PUT/DELETE 응답 shape 통일 | ✓ 완료 | 3차 세션 |
| #4 | fetch 실패 토스트 없음 | ✓ 완료 | `88a9578` |
| #5 | AI 호출 순서 (claim-first 패턴) | ✓ 완료 | `1f01767` |
| #1 | 트랜잭션 경계 부재 | ◐ 부분 (race 해결, 보상 시퀀스는 RFC) | - |

---

## 남은 작업: #1 보상 시퀀스 트랜잭션 통합

### 현재 상태

`PATCH /api/todos` 의 보상 시퀀스:

```
1. claimTodoItem(id)              ← UPDATE is_completed=1 (atomic, 완료)
2. judgeActivity (winner 만)      ← Gemini AI (외부 IO)
3. calcDueBonus                   ← 순수 계산
4. setTodoReward(id, exp, comment) ← UPDATE exp_gained, ai_comment
5. applyReward({...})              ← 내부:
   5.1 addActivityLog              ← INSERT activity_log
   5.2 incrementTaskCount          ← UPDATE character.task_count
   5.3 gainExp(exp)                ← 자체 트랜잭션 (lib/game.ts)
```

**잔여 리스크**: 4~5.2 단계 중 일부 실패 시 `is_completed=1` 이 반영된 채 EXP가 누락될 수 있음. 현재까지 incident 보고 없으나 EXP 신뢰성 보강 차원에서 진행.

### 해결 방안 (옵션 A — 외부 트랜잭션 주입)

```ts
// lib/game.ts — gainExp 시그니처 확장
export async function gainExp(
  expAmount: number,
  t?: Transaction,  // 선택 인자 추가. 기존 호출자 무수정
): Promise<RewardResult> { ... }
```

`addActivityLog`, `incrementTaskCount` 도 동일하게 `t?: Transaction` 선택 인자 추가.

`applyReward` 를 `tx()` 안에서 호출:
```ts
export async function applyReward(opts) {
  return await tx(async (t) => {
    await addActivityLog(opts.label, opts.source, opts.exp, opts.comment, t)
    await incrementTaskCount(t)
    return await gainExp(opts.exp, t)
  })
}
```

route.ts 에서 `setTodoReward` + `applyReward` 를 동일 `tx()` 안에 합침.

### 다음 세션 체크리스트

- [ ] `lib/game.ts` — `gainExp(expAmount, t?: Transaction)` 선택 인자 추가
- [ ] `lib/db/queries/activity.ts` — `addActivityLog` 선택 인자 추가
- [ ] `lib/db/queries/character.ts` — `incrementTaskCount` 선택 인자 추가
- [ ] `lib/game/rewards.ts` — `applyReward` 를 `tx()` 래핑
- [ ] `app/api/todos/route.ts` — PATCH 의 `setTodoReward` + `applyReward` 를 `tx()` 안에 합치기
- [ ] 다른 보상 호출자 영향 확인 — battle / attendance / projects / checklist / routines / quest 모두 기존 `gainExp` 무수정 호출이라 영향 없음 확인
- [ ] `npx tsc --noEmit` + `npx next build` ✅

### 주의사항

- `gainExp` 본문(레벨업 루프 + equipment 재read)은 보존. 외부 트랜잭션 주입만 추가
- read-only 영역(`cfg`/`bcfg`/`skills` read)은 트랜잭션 외부 유지
- `gainExp` 본문을 직접 수정하면 레벨업 회귀 가능 → 시그니처만 변경

### 검증 시나리오 (완료 후)

1. todo 체크 → EXP/레벨업 정상
2. due time 보너스/페널티 정상
3. 두 기기에서 동일 todo 동시 체크 → 한 쪽만 EXP 지급
4. `character.total_exp` 가 activity_log 합계와 일치

---

**우선순위**: 낮음 (incident 없음, 시스템 안정). 급하지 않으면 이후 세션에서 진행.
