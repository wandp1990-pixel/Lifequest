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

## 남은 작업 (다음 세션)

### #1: 트랜잭션 경계 (정합성 리스크)

**심각도**: 높음 — EXP 시스템 신뢰성  
**현상**: `completeTodoItem(id, exp, comment)` 성공 후 `applyReward()`의 한 단계(addActivityLog/incrementTaskCount/gainExp) 실패 가능성

```
1. completeTodoItem() — UPDATE is_completed=1 ✓
2. applyReward()
   2.1 addActivityLog()       ← 실패 가능
   2.2 incrementTaskCount()   ← 실패 가능
   2.3 gainExp()              ← 실패 가능
```

**해결 방안**:
- **A) 트랜잭션**: `completeTodoItem` + `applyReward` 의 주요 호출을 한 BEGIN...COMMIT으로 래핑 (DB 지원 필요)
- **B) 롤백 큐**: `applyReward` 실패 시 todo 자동 롤백 (별도 cron job)
- **C) 보상 재시도**: 실패한 보상을 큐에 넣어 나중에 재시도

**추천**: A + C 하이브리드 (Vercel 환경과 DB 지원 확인 필요)

**관련 파일**:
- `app/api/todos/route.ts:52-62` (PATCH)
- `lib/game/rewards.ts:34-43` (applyReward)
- `lib/db/queries/todo.ts:28-35` (completeTodoItem)

---

### #5: AI 호출 순서 (쿼터 낭비)

**심각도**: 중 — 성능/비용  
**현상**: 동시 두 PATCH 진입 → 둘 다 Gemini 호출 → 한쪽만 `completeTodoItem` 성공 → Gemini 호출 낭비

```
현재 순서:
1. getTodoItems() & validation
2. judgeActivity() ← Gemini 호출 (느림, 쿼터 사용)
3. calcDueBonus()
4. completeTodoItem() ← race 실패 가능
```

**개선 순서**:
```
1. getTodoItems() & validation
2. completeTodoItem() ← race 방어 먼저
3. if (claimed) {
     judgeActivity() ← 성공한 쪽만 호출
     ...applyReward()
   } else {
     return badRequest(..., "already_completed")
   }
```

**주의**: AI 모드일 때 exp/comment가 비동기로 UPDATE되므로 응답 shape 변경 필요
- 현재: `{ exp, comment, bonusExp, penaltyApplied, ...levelResult }`
- 변경: `{ exp?, comment?, [...기존], expediting: true }` (또는 다른 마킹)

**관련 파일**:
- `app/api/todos/route.ts:29-63` (PATCH)
- `lib/ai.ts:190-224` (judgeActivity)

---

## 다음 세션 체크리스트

- [ ] 이 문서 읽기 (context 복기)
- [ ] #1 해결 방안 검토
  - [ ] DB가 트랜잭션 지원하는지 확인 (`lib/db/client.ts`)
  - [ ] Vercel + D1 조합에서 트랜잭션 가능 여부
- [ ] #1 또는 #5 중 하나 먼저 선택 (순서: #1 권장)
- [ ] 관련 테스트 케이스 검토
  - [ ] completeTodoItem 경합 조건
  - [ ] applyReward 부분 실패 시뮬레이션

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
