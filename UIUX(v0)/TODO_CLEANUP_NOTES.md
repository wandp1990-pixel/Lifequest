# 할일 체크 기능 코드 리뷰 및 개선 작업

**세션 날짜**: 2026-05-16 (1차) + 2026-05-16 (2차)  
**모델**: Claude Opus 4.7 → Haiku 4.5 → Opus 4.7  
**상태**: #1 부분 / #2 / #4 / #5 완료 — #1 완전 해결(전체 트랜잭션 통합)은 별도 RFC

---

## 배경

`TodoSection.tsx` + `/api/todos/route.ts` 에서 할일 체크 시 발생하는 4가지 잠재 문제를 식별하고 우선순위로 분류. 우선순위 1,2번을 이번 세션에서 완료, 3,4번은 별도 진행.

### 식별된 이슈 (원래 요청)

1. **#1 (높음)**: 트랜잭션 경계 부재 — `completeTodoItem` ✓ → `applyReward` 중 실패 시 EXP 부분 적용
2. **#2 (높음)**: 다른 탭/디바이스 race — 먼저 완료한 쪽은 "already_completed" 받음 → UI 롤백 → 혼란
3. **#4 (중)**: fetch 에러 토스트 없음 — 실패해도 조용히 닫힘
4. **#5 (중)**: AI 호출 순서 — PATCH 진입 시 바로 Gemini 호출 → race 발생 시 호출 낭비

---

## 이번 세션 완료 내역 (우선순위 #2, #4)

### #2: 다른 탭 race UX 개선

**파일**: `lib/api/respond.ts`, `app/api/todos/route.ts`, `components/game/TodoSection.tsx`

#### 변경 내용

1. **`lib/api/respond.ts`** — 에러 응답에 선택적 코드 필드 추가
   ```ts
   export function err(msg: string, status = 500, code?: string): NextResponse {
     return NextResponse.json(code ? { error: msg, code } : { error: msg }, { status })
   }
   
   export function badRequest(msg: string, code?: string): NextResponse {
     return err(msg, 400, code)
   }
   ```
   - 기존 호출자는 영향 없음 (모든 badRequest 호출이 여전히 작동)
   - `code` 필드는 클라이언트 분기용 식별자

2. **`app/api/todos/route.ts`** — 두 곳의 "이미 완료" 응답에 코드 부착
   ```ts
   // line 34
   if (item.is_completed) return badRequest("이미 완료된 항목입니다", "already_completed")
   
   // line 53
   if (!claimed) return badRequest("이미 완료된 항목입니다", "already_completed")
   ```

3. **`components/game/TodoSection.tsx`** — `completeTodo` 중 race 분기
   ```ts
   if (data?.code === "already_completed") {
     // DB는 이미 완료 상태 → UI도 완료 유지 (롤백 X)
     setTodoItems(prev => prev.map(t => t.id === item.id ? { ...t, is_completed: 1 } : t))
     if (isAi) setCompletedTodoCount(prev => prev + 1)
     return
   }
   ```

#### 효과

- **다중 디바이스 사용 시**: 한쪽이 완료하면 다른 쪽은 완료 상태 유지 (원치 않은 롤백 X)
- **낙관적 완료와 AI 모드**: 둘 다 올바르게 처리됨

#### 검증

```bash
curl -X PATCH https://lifequest-bice.vercel.app/api/todos \
  -H "Content-Type: application/json" \
  -d '{"id":49}'  # 이미 완료된 항목

# 응답
{"error":"이미 완료된 항목입니다","code":"already_completed"}
HTTP 400
```

---

### #4: fetch 실패 시 사용자 토스트 추가

**파일**: `components/game/TodoSection.tsx`

#### 변경 내용

- `addTodo()` — 네트워크 에러 및 4xx 응답 시 `showError()` 토스트
- `saveTodoName()` — 위와 동일
- `saveNotifyTime()` — 위와 동일
- `completeTodo()` — catch 블록과 `!res.ok` 양쪽에서 토스트

```ts
const { showExp, showPenalty, showError } = useToast()

// 예시: addTodo
try {
  const res = await fetch("/api/todos", { /* ... */ })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    showError(data?.error ?? "할 일 추가 실패")
    return
  }
  // 성공...
} catch {
  showError("네트워크 오류 — 잠시 후 다시 시도하세요")
}
```

#### 효과

- **명확한 피드백**: 사용자가 요청 실패를 즉시 인지
- **재시도 유도**: "다시 시도하세요" 메시지로 행동 제시

---

## 배포 상태

| 항목 | 값 |
|------|-----|
| 커밋 | `88a9578` (Auto-deploy: 2026-05-16 10:34) |
| URL | `https://lifequest-315ih1fy6-wandp1990-8450s-projects.vercel.app` |
| 상태 | ✓ Ready / Production |
| 빌드 시간 | 22s |

**note**: 자동 watcher가 변경 감지 후 커밋·푸시 (DEPLOY_NOTES.md 규칙)

---

## 2차 세션 완료 내역 (우선순위 #5 + #1 부분)

### #5: AI 호출 순서 — 완료

**파일**: `lib/db/queries/todo.ts`, `lib/db/index.ts`, `app/api/todos/route.ts`

#### 핵심 변경

기존 `completeTodoItem(id, exp, comment)` 단일 호출을 **claim-then-finalize** 2단계로 분리.

1. **`lib/db/queries/todo.ts`** — 2개 함수로 분리
   ```ts
   // race-guard 마킹만 (exp/comment 는 nullable 컬럼이라 null 로 둠)
   export async function claimTodoItem(id: number): Promise<boolean> {
     const res = await db.execute({
       sql: "UPDATE todo_item SET is_completed=1, completed_at=? WHERE id=? AND is_completed=0",
       args: [now(), id],
     })
     return res.rowsAffected > 0
   }

   // claim winner 만 호출. race-guard 불필요
   export async function setTodoReward(id: number, exp: number, comment: string): Promise<void> {
     await db.execute({
       sql: "UPDATE todo_item SET exp_gained=?, ai_comment=? WHERE id=?",
       args: [exp, comment, id],
     })
   }
   ```

2. **`app/api/todos/route.ts`** — PATCH 순서 재배치
   ```ts
   // 1. race-guard 를 가장 먼저
   const claimed = await claimTodoItem(id)
   if (!claimed) return badRequest("이미 완료된 항목입니다", "already_completed")

   // 2. winner 만 도달 — AI 호출 / due bonus 계산 안전
   if (baseExp === 0) {
     const aiResult = await judgeActivity(item.name)
     baseExp = aiResult.exp
     comment = aiResult.comment
   }
   const due = calcDueBonus(...)

   // 3. finalize
   await setTodoReward(id, exp, comment)

   // 4. 보상
   const levelResult = await applyReward({...})
   ```

#### 효과

- **Gemini 쿼터 절감**: race 패자는 claim 단계에서 `already_completed` 반환 후 즉시 종료. AI 호출 안 함
- **응답 shape 무변동**: `{ exp, comment, bonusExp, penaltyApplied, ...levelResult }` 동일. 클라이언트(TodoSection) 무수정
- **스키마 호환**: `exp_gained INTEGER` / `ai_comment TEXT` 가 nullable 이므로 claim 단계에서 null 로 두는 것 안전

---

### #1: 트랜잭션 경계 — 부분 해결

**진전**: race 측면은 #5 의 claim-first 패턴으로 해결. winner 가 1명으로 보장되므로 중복 보상 없음.

**남은 리스크**: `setTodoReward → applyReward(addActivityLog → incrementTaskCount → gainExp)` 시퀀스 중 일부 실패 시
- `is_completed=1` 은 이미 반영됨 (claim 단계)
- `exp_gained` 가 null 인 채로 todo 가 완료 표시될 가능성 (setTodoReward 실패)
- `addActivityLog`/`incrementTaskCount`/`gainExp` 중 일부만 적용될 가능성

**완전 해결을 위해선** lib/game.ts:42-123 `gainExp` 트랜잭션 본문을 분해해서 외부 트랜잭션과 합쳐야 함 — **보존 영역**이라 별도 RFC 필요. 현재 코드에선:
- `gainExp` 자체 트랜잭션 (레벨업 루프 + equipment 재read + max_hp 갱신)이 가장 위험한 부분
- `addActivityLog`/`incrementTaskCount` 는 각각 단일 UPDATE/INSERT — 부분 실패 가능성 낮음
- 따라서 실용적 신뢰성은 충분히 확보

**향후 RFC 항목**:
- A) `gainExp` 본문을 트랜잭션 fn 으로 받게 시그니처 변경 → 외부 트랜잭션 합치기
- C) 실패 시 retry 큐 (Vercel cron 기반)

---

## 2차 배포 상태

| 항목 | 값 |
|------|-----|
| 커밋 | `1f01767` (Auto-deploy: 2026-05-16 10:52) |
| URL | `https://lifequest-5ipk6k7qh-wandp1990-8450s-projects.vercel.app` |
| 상태 | ✓ Ready / Production (23s) |
| 변경 파일 | `lib/db/queries/todo.ts`, `lib/db/index.ts`, `app/api/todos/route.ts` |

**검증**: `npx tsc --noEmit` ✅, `npx next build` ✅ (23 routes), `/api/todos` GET 정상 응답.

---

## 참고: 원래 코드 리뷰 전체 (완료 + 미완료)

| # | 제목 | 우선순위 | 상태 | 세션 |
|----|------|----------|------|-----|
| #1 | 트랜잭션 경계 부재 | 높음 | ⏳ 미완료 | 다음 |
| #2 | 다른 탭 race UX | 높음 | ✓ 완료 | 이번 |
| #3 | PUT 응답 shape 불일치 | 낮음 | - | - |
| #4 | fetch 실패 토스트 없음 | 중 | ✓ 완료 | 이번 |
| #5 | AI 호출 순서 | 중 | ⏳ 미완료 | 다음 |
| ... | (기타 소수 이슈) | 낮음 | - | 나중 |

---

**작성자**: Claude Opus 4.7  
**최종 수정**: 2026-05-16 10:35 KST
