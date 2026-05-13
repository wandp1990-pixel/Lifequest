# Phase 2 baseline 시나리오 캡처

Phase 2 리팩토링 전후 동일 입력에 동일 출력을 보장하기 위한 baseline JSON.

**baseline tag**: `pre-refactor-baseline` (commit `43c1ae6`)

## 캡처 방법

dev server 또는 prod URL 둘 다 가능. prod URL 예시: `https://lifequest-bice.vercel.app`

```bash
BASE=https://lifequest-bice.vercel.app
mkdir -p verification/baseline

# 1. 체크리스트 완료 (streak 0→1)
curl -s "$BASE/api/checklist" -X POST -H "Content-Type: application/json" \
  -d '{"itemId": <id>}' | tee verification/baseline/checklist-streak1.json

# 2. 투두 완료 (due_time 안에)
curl -s "$BASE/api/todos" -X PATCH -H "Content-Type: application/json" \
  -d '{"id": <id>}' | tee verification/baseline/todo-due-within.json

# 3. 투두 완료 (due_time 초과)
curl -s "$BASE/api/todos" -X PATCH -H "Content-Type: application/json" \
  -d '{"id": <id>}' | tee verification/baseline/todo-due-over.json

# 4. 루틴 완료 (마감 전, 모든 항목)
curl -s "$BASE/api/routines" -X POST -H "Content-Type: application/json" \
  -d '{"action": "check", "itemId": <id>}' | tee verification/baseline/routine-deadline-bonus.json

# 5. 가챠 1회 / 10회
curl -s "$BASE/api/inventory" -X POST -H "Content-Type: application/json" \
  -d '{"count": 1}' | tee verification/baseline/gacha-1.json
curl -s "$BASE/api/inventory" -X POST -H "Content-Type: application/json" \
  -d '{"count": 10}' | tee verification/baseline/gacha-10.json

# 6. 출석 (첫 출석)
curl -s "$BASE/api/attendance" -X POST -H "Content-Type: application/json" \
  -d '{}' | tee verification/baseline/attendance-first.json
```

## Phase 2 종료 시 검증

```bash
# 같은 명령으로 after.json 저장 후 diff
diff <(jq -S . verification/baseline/checklist-streak1.json) \
     <(jq -S . verification/after/checklist-streak1.json)
```

응답 shape 동일, `character.total_exp` 델타 동일하면 통과.
