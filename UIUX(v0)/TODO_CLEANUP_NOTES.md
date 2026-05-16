# 할일 체크 기능 — 완료

**최종 업데이트**: 2026-05-16  
**상태**: 모든 작업 완료. 이 문서는 보존 차원의 아카이브.

---

## 완료 요약

| # | 제목 | 상태 |
|----|------|------|
| #1 | 트랜잭션 경계 부재 | ✓ 완료 (claim-first + 보상 시퀀스 통합 tx) |
| #2 | 다른 탭 race UX 개선 | ✓ 완료 |
| #3 | PUT/DELETE 응답 shape 통일 | ✓ 완료 |
| #4 | fetch 실패 토스트 없음 | ✓ 완료 |
| #5 | AI 호출 순서 (claim-first 패턴) | ✓ 완료 |

---

## #1 최종 해결 (이번 세션)

### 변경 파일

- `lib/db/queries/activity.ts` — `addActivityLog(... , t?: Transaction)` 선택 인자 추가
- `lib/db/queries/character.ts` — `incrementTaskCount(t?: Transaction)` 선택 인자 추가
- `lib/db/queries/todo.ts` — `setTodoReward(... , t?: Transaction)` 선택 인자 추가
- `lib/game.ts` — `gainExp(expAmount, externalTx?: Transaction)` 외부 트랜잭션 주입
- `lib/game/rewards.ts` — `applyReward` 를 `tx()` 안에서 실행. `externalTx` 받으면 호출자 트랜잭션에 합류
- `app/api/todos/route.ts` — PATCH 에서 `setTodoReward` + `applyReward` 를 동일 `tx()` 안에 통합

### 핵심 설계

- `gainExp` 본문(레벨업 루프 + equipment 재read)은 보존. 외부 트랜잭션 주입만 추가
- `ownsTx = !externalTx` 패턴으로 commit/rollback 을 owner 만 수행 — 외부 트랜잭션 사용 시 호출자가 관리
- read-only 영역(`cfg`/`bcfg`/`skills` read)은 트랜잭션 외부 유지 (기존 주석 그대로)
- 기존 호출자(battle/attendance/projects/checklist/routines/quest/activities) 는 모두 `t` 생략 호출이라 무수정 동작

### 트랜잭션 경계 결과

`PATCH /api/todos` 보상 시퀀스:

```
1. claimTodoItem(id)              ← atomic race-guard (별도)
2. judgeActivity (winner 만)      ← 외부 IO
3. calcDueBonus                   ← 순수 계산
4. tx() {
     4.1 setTodoReward            ← UPDATE exp_gained, ai_comment
     4.2 applyReward {
       4.2.1 addActivityLog       ← INSERT activity_log
       4.2.2 incrementTaskCount   ← UPDATE character.task_count
       4.2.3 gainExp              ← SELECT character + UPDATE (레벨업 처리)
     }
   }
```

4.1~4.2.3 중 한 단계라도 실패하면 전체 rollback. `is_completed=1`(claim) 만 남고 EXP/activity_log 는 일관성 유지.

### 검증

- `npx tsc --noEmit` ✅
- `npx next build` ✅ (27 routes)
- 자동 배포 commit `7cc951e` → `https://lifequest-lfploo1zu-...vercel.app` Ready
- `curl /api/character` 정상 응답

---

## 참고: 이전 세션 작업

| # | 세션 | 커밋 |
|----|------|------|
| #2, #4 | 1차 | `88a9578` |
| #5, #1 부분 | 2차 | `1f01767` |
| #3 | 3차 | (자동) |
| #1 완전 | 4차 (이번) | `7cc951e` |

---

**다음 잠재 작업** (현재 우선순위 없음):
- Retry queue (옵션 C) — applyReward 실패 시 재시도. 현재 incident 없어 보류
