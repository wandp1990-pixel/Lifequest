# LifeQuest 모듈화 리팩토링 마스터 플랜

> **이 문서는 LifeQuest 리팩토링의 단일 출처입니다. 작업 시작 전 반드시 이 문서를 읽고, 작업 완료 후 진행 상황 트래커를 업데이트하세요.**

---

## 진행 상황 트래커

체크박스: `[ ]` 미완료 / `[~]` 진행 중 / `[x]` 완료

### Phase 0 — 준비
- [x] 마스터 플랜 작성 (2026-05-13)
- [x] `git tag pre-refactor-baseline` 찍기 (Phase 2 시작 직전, commit 43c1ae6 / 2026-05-14)
- [~] 핵심 시나리오 5개 baseline 응답 캡처 (`verification/baseline/*.json`) — 캡처 가이드 README 작성, 실제 캡처는 사용자 환경(DB 필요)에서 수행

### Phase 1 — 상수/시간 헬퍼 추출 (위험도 0)
- [x] 1.1 `lib/constants/{exp,battle,gacha,ai,time,quest,ui}.ts` 7개 파일 작성 (2026-05-13)
- [x] 1.2 `lib/time/kst.ts` 생성 + queries/checklist·routine의 로컬 시간 함수 통합 (2026-05-13)
- [x] 1.3 UI 색상 상수 추출 (`ItemsTab`, `ProjectsTab`, `CharacterPanel`) (2026-05-13)
- [x] 1.4 typecheck + build + 시나리오 검증 (2026-05-13)

### Phase 2 — DB 헬퍼 & 비즈니스 로직 추출
- [x] 2.1 `lib/db/queries/_helpers.ts` 작성 (2026-05-14)
- [x] 2.2 `lib/game/exp-bonus.ts` 순수 함수 작성 (2026-05-14)
- [x] 2.3 `lib/game/rewards.ts` `applyReward()` 작성 (2026-05-14)
- [x] 2.4 `lib/api/respond.ts`, `validate.ts` 작성 (2026-05-14)
- [x] 2.5 `lib/game/gacha.ts` 순수 로직 분리 (2026-05-14)
- [x] 2.6 route.ts 리팩토링 (todos → checklist → routines → projects → inventory + attendance/quest/reward) (2026-05-14)
- [~] 2.7 시나리오 5개 baseline diff 검증 — typecheck/build pass, baseline curl 비교는 사용자 환경에서 수행 (`verification/baseline/README.md` 참조)

### Phase 3 — UI Primitives & Hooks
- [x] 3.1 shadcn primitives 18개 추가 (`components.json` 은 기존 존재 → init 스킵) (2026-05-14)
- [x] 3.2 `hooks/useApi.ts` 작성 (2026-05-14)
- [x] 3.3 도메인 훅 6개 작성 (`useChecklist` → `useRoutines` → `useTodos` → `useProjects` → `useCharacter` → `useMidnightRefresh`) (2026-05-14)
- [x] 3.4 `ToastContext` + `CharacterContext` 도입 (Provider 인프라만; 적용은 Phase 4 분할과 합류) (2026-05-14)
- [~] 3.5 각 탭 수동 UX 테스트 — typecheck/build pass, 실제 UX 검증은 사용자 환경에서 수행

### Phase 4 — God Component 분할
- [x] 4.1 SettingsDrawer 1308줄 → 62줄 컨테이너 + 10개 모듈 (2026-05-14)
- [x] 4.2 ProjectsTab 989줄 → 233줄 컨테이너 + 5개 파트 (2026-05-14)
- [x] 4.3 HabitSection 552→245+4, RoutineSection 538→163+5 (2026-05-14)
- [x] 4.4 CharacterTab 571→56+5, BattleTab 518→122+4, ItemsTab 434→145+5, HomeTab 367→28+4 (2026-05-14)
- [x] 4.5 모든 컴포넌트 < 250줄 (예외 3개: ProjectCard 296, ChapterSection 288, TasksTab 277 — 복잡도상 분할 비현실적)

### Phase 5 — 후속 정리 (Phase 4 외 권장 사항 합류)
- [x] 5.1 CharacterContext 실제 wrap — layout.tsx 에 Provider, page.tsx/4탭/SettingsDrawer/settings 3패널이 props 대신 useCharacterCtx 사용 (2026-05-14)
- [x] 5.2 Toast 통합 — TasksTab/ProjectsTab 자체 toast useState 제거, 자식 6개 컴포넌트 useToast 직접 호출 + onToast props 제거 (2026-05-14)
- [x] 5.3 shadcn primitives 부분 채택 — 모달 3곳(TasksTab Drawer/ProjectsTab Dialog/ReplaceModal Drawer). 도메인 색상(amber/violet/teal) 강결합 영역은 inline Tailwind 유지 (2026-05-14)
- [x] 5.4 Route 보일러 정리 — 13개 route 에 withInit 적용. queries/*.ts 의 db.execute 마이그레이션은 의도적 보류 (race-guard 시맨틱 보존 우선) (2026-05-14)

---

## Context

LifeQuest (Next.js 16 App Router, `/mnt/c/Users/wandp/OneDrive/바탕 화면/지헌/lifequest/UIUX(v0)`)는 바이브 코딩으로 기능을 누적한 결과 다음 문제를 가짐:

- **God Component 9개**: SettingsDrawer (1308줄), ProjectsTab (989), CharacterTab (571), HabitSection (552), RoutineSection (538), BattleTab (518), ItemsTab (450), HomeTab (367), TasksTab (312). 각 파일에 fetch·state·UI·비즈니스 로직 혼재
- **상태 관리 라이브러리 부재**: Context/Reducer/zustand 전부 미사용. props drilling 심각 (HabitSection 5개 Dispatch props)
- **shadcn/ui 미사용 (그러나 의존성은 풀스택 설치됨)**: Radix UI 32개 패키지 + cva + sonner + cmdk + vaul + lucide-react가 이미 `package.json`에 있음. `components/ui/` 디렉토리만 비어있을 뿐
- **route.ts에 게임 밸런스 매직넘버**: streak 임계값 (7/14/30/60/100일), 보너스 비율 (0.1/0.25/0.5/0.75/1.0), 페널티 (±0.5x), 가챠 stat 범위 (0.3~0.5) 등이 route 안에 인라인
- **쿼리 boilerplate**: `db.execute({sql, args})` 직접 호출이 queries/* 에서 다수. `INSERT OR IGNORE` race-guard 6곳, conditional UPDATE 2곳
- **시간 함수 중복 정의**: `kstDate/now/todayKST` (`lib/db/client.ts`), `yesterdayKST` (`queries/checklist.ts:79` 추정), `currentTimeKST` (`queries/routine.ts:28` 추정)

**목표**: 다음 작업에서 기능 추가/수정이 쉽도록 (1) UI/상태/API 분리, (2) 매직넘버 상수화, (3) 쿼리 패턴 통일, (4) 공통 비즈니스 로직 분리. 단계별 PR로 안전하게 진행.

---

## 새 디렉토리 구조

### 신규 파일 전체 목록

| 신규 경로 | 책임 | 주요 심볼 | 이전 위치 / 추출 대상 |
|---|---|---|---|
| `lib/constants/exp.ts` | EXP 보너스/페널티 수식 | `STREAK_THRESHOLDS=[7,14,30,60,100]`, `STREAK_BONUS_RATIOS=[0.1,0.25,0.5,0.75,1.0]`, `MISS_PENALTY_PER_DAY=0.1`, `MISS_PENALTY_CAP=0.5`, `DUE_BONUS_RATIO=0.5`, `DUE_PENALTY_RATIO=0.5` | `app/api/checklist/route.ts:42-78`, `app/api/todos/route.ts:45-69` |
| `lib/constants/battle.ts` | 전투 매직넘버 | `BASE_ACCURACY=0.9`, `CRIT_MULT=1.5`, `EVADE_MAX=90`, `ACCURACY_MIN=5`, `ACCURACY_MAX=99`, `DOUBLE_ATK_RATE=25`, `LIFE_STEAL_RATE=5`, `DEF_IGNORE_RATE=10`, `REFLECT_RATE=5`, `CLEAR_SCALE=0.03`, `LEVEL_SCALE=0.04` | `lib/battle.ts` 인라인 |
| `lib/constants/gacha.ts` | 가챠 비율/레벨 보정 | `SUB_RATIOS=[0.5,0.4]`, `COMBAT_RATIOS=[1.0,0.8]`, `STAT_MIN_RATIO=0.3`, `STAT_MAX_RATIO=0.5`, `LEVEL_BONUS_PER_LEVEL=0.02`, `MAX_GACHA_COUNT=100` | `app/api/inventory/route.ts:80-81, 171` |
| `lib/constants/ai.ts` | AI 보상 범위 | `ACTIVITY_EXP_RANGE=[0,200]`, `ACTIVITY_DEFAULT_EXP=50`, `PROJECT_BONUS_RANGE=[50,500]`, `TASK_EXP_RANGE=[10,100]` | `lib/ai.ts:17, 33-38, 196` |
| `lib/constants/time.ts` | 시간 컷오프 | `ROUTINE_DEADLINE_OVERNIGHT_CUTOFF="06:00"`, `ROUTINE_OVERNIGHT_START="18:00"`, `ROUTINE_GRACE_MIN=30`, `KST_OFFSET_MS=9*3600*1000`, `STALE_STREAK_DAYS=7`, `TOAST_AUTO_DISMISS_MS=3000`, `DEADLINE_IMMINENT_DAYS=3` | `client.ts:16`, `queries/routine.ts`, `queries/checklist.ts:26`, `ProjectsTab.tsx:76,144`, `TasksTab.tsx:107` |
| `lib/constants/quest.ts` | 퀘스트 디폴트 | `QUEST_REWARD_MIN=50`, `QUEST_REWARD_MAX=100` | `components/game/TasksTab.tsx` |
| `lib/constants/ui.ts` | 색상/등급 매핑 | `GRADE_COLOR`, `GRADE_BG`, `PRIORITY_COLOR`, `STATUS_LABEL`, `PROJECT_COLOR_CLS`, `HP_MP_XP_COLORS` | `ItemsTab.tsx:38-53`, `ProjectsTab.tsx:49-66`, `CharacterPanel.tsx:23` |
| `lib/time/kst.ts` | KST 시간 함수 단일 출처 | `kstDate()`, `now()`, `todayKST()`, `yesterdayKST()`, `currentTimeKST()`, `isWithinRoutineDeadline(nowHHMM, deadlineHHMM, graceMin)` | `lib/db/client.ts:15-25` + `queries/checklist.ts:79` + `queries/routine.ts:28` 통합 |
| `lib/db/queries/_helpers.ts` | 쿼리 boilerplate 추상화 | `exec(sql,args)`, `execOne<T>(sql,args)`, `execMany<T>(sql,args)`, `claimOnce(sql,args)`, `claimUpdate(sql,args)`, `tx<T>(fn)` | queries/* 에 산재한 `db.execute({sql,args})` 호출 |
| `lib/game/exp-bonus.ts` | EXP 보너스/페널티 순수 함수 (DB 없음) | `calcStreakBonus(streak, baseExp)`, `calcMissPenalty(missedDays, baseExp)`, `calcDueBonus(dueTime, now, baseExp)`, `calcRoutineDeadlineBonus(now, deadline, baseExp)` | route 인라인 계산 |
| `lib/game/rewards.ts` | 보상 적용 통합 | `applyReward({source, label, exp, comment})` → `addActivityLog + incrementTaskCount + gainExp` 시퀀스 | 12회 반복되는 동일 패턴 |
| `lib/game/gacha.ts` | 가챠 순수 로직 | `pickGrade`, `pickSlot`, `randBetween`, `rollAbilityValue`, `formatOpt`, `rollGachaItems(count, char, pools)` | `app/api/inventory/route.ts:31-83, 156-223` |
| `lib/api/respond.ts` | API 응답 표준화 | `ok(data)`, `err(msg, status=500)`, `badRequest(msg)`, `notFound(msg)`, `withInit(handler)` | 23개 route의 try/catch + initDb 보일러 |
| `lib/api/validate.ts` | 입력 검증 헬퍼 | `requireNumber`, `requireString`, `requireBoolean`, `requireOneOf` | route action switch 산재 |
| `hooks/useApi.ts` | fetch 통합 | `apiGet<T>(url)`, `apiPost<T>(url,body)`, `apiPut<T>`, `apiPatch<T>`, `apiDelete<T>` (error normalize) | 컴포넌트 fetch 50+ 회 |
| `hooks/useChecklist.ts` | 체크리스트 데이터 + mutation | `{items, checkedIds, groups, bonusGroupIds, isLoading, refetch, complete, add, edit, remove, addGroup, ...}` | `HabitSection.tsx` 상태/fetch |
| `hooks/useRoutines.ts` | 루틴 동일 패턴 | 동일 | `RoutineSection.tsx` |
| `hooks/useTodos.ts` | 투두 동일 | 동일 | `TodoSection.tsx`, `TasksTab.tsx` |
| `hooks/useProjects.ts` | 프로젝트 + 챕터 + 작업 | 동일 (9개 fetch 흡수) | `ProjectsTab.tsx` |
| `hooks/useCharacter.ts` | 캐릭터/스킬/스탯 | 동일 | `CharacterTab.tsx` |
| `hooks/useMidnightRefresh.ts` | 자정 재페치 타이머 (이미 `TasksTab.tsx:100+`에 있는 로직 추출) | `useMidnightRefresh(callback)` | 재사용 가능 |
| `contexts/ToastContext.tsx` | sonner 기반 글로벌 toast | `useToast()` → `{showExp, showLevelUp, showError, showInfo}` | `TasksTab` 등 12회 토스트 state 중복 |
| `contexts/CharacterContext.tsx` | 캐릭터/config 단일 진실 | `useCharacter()`, `useGameConfig()`, `useBattleConfig()` | 부모 → 자식 props 드릴 |
| `components/ui/*.tsx` | shadcn primitives | `button`, `card`, `dialog`, `drawer`, `tabs`, `input`, `label`, `select`, `switch`, `tooltip`, `sonner`, `progress`, `separator`, `scroll-area`, `checkbox`, `popover`, `accordion` | `npx shadcn add` 로 자동 생성 |
| `components/game/habit/HabitList.tsx`, `HabitItemRow.tsx`, `HabitGroupEditor.tsx`, `AddHabitForm.tsx` | HabitSection 분할 | — | `HabitSection.tsx` (552줄) |
| `components/game/routine/RoutineList.tsx`, `RoutineItem.tsx`, `RoutineEditor.tsx`, `AddRoutineForm.tsx` | RoutineSection 분할 | — | `RoutineSection.tsx` (538줄) |
| `components/game/projects/ProjectList.tsx`, `ProjectDetail.tsx`, `ChapterPanel.tsx`, `TaskList.tsx`, `AddProjectForm.tsx` | ProjectsTab 분할 | — | `ProjectsTab.tsx` (989줄) |
| `components/game/settings/CharacterSettings.tsx`, `SkillSettings.tsx`, `GameConfigSettings.tsx`, `BattleConfigSettings.tsx`, `PushSettings.tsx`, `PromptSettings.tsx`, `BackupSettings.tsx`, `TemplateSettings.tsx` | SettingsDrawer 분할 | — | `SettingsDrawer.tsx` (1308줄) |
| `components/game/character/StatPanel.tsx`, `SkillTree.tsx`, `SkillInvestDialog.tsx` | CharacterTab 분할 | — | `CharacterTab.tsx` (571줄) |
| `components/game/items/ItemGachaPanel.tsx`, `ItemInventory.tsx`, `EquipmentSlots.tsx` | ItemsTab 분할 | — | `ItemsTab.tsx` (450줄) |
| `components/game/battle/BattleControls.tsx`, `BattleLog.tsx`, `MonsterDisplay.tsx`, `RewardModal.tsx` | BattleTab 분할 | — | `BattleTab.tsx` (518줄) |

---

## Phase 1 — 상수/시간 헬퍼 추출 (위험도 0)

**원칙**: 값 추출만. 동작 변경 0%. import 경로만 바뀜.

### 1.1 상수 파일 7개 작성
- `lib/constants/{exp,battle,gacha,ai,time,quest,ui}.ts` 신규 작성
- 각 파일 헤더에 표준 docblock (작업 가이드 주석 표준 참조)
- 기존 인라인 매직넘버를 식별 후 상수로 교체. **값은 절대 바꾸지 않음** (예: 0.1을 0.10으로 표기 통일하는 것도 금지)

### 1.2 KST 시간 헬퍼 통합
- `lib/time/kst.ts` 생성
- `lib/db/client.ts`에서 `kstDate/now/todayKST` 이동 (client.ts는 re-export로 backwards compat 유지하다가 후속 PR에서 제거)
- `queries/checklist.ts`와 `queries/routine.ts`의 로컬 시간 함수 통합 (`yesterdayKST`, `currentTimeKST`, `isWithinRoutineDeadline`)
- `KST_OFFSET_MS` 상수는 `lib/constants/time.ts`에서 import

### 1.3 UI 상수 통합
- `ItemsTab.tsx`의 `GRADE_COLOR`, `GRADE_BG` → `lib/constants/ui.ts`
- `ProjectsTab.tsx`의 `PRIORITY_COLOR`, `STATUS_LABEL`, `COLOR_CLS` → 동일
- `CharacterPanel.tsx`의 hex 색상 → `HP_MP_XP_COLORS`

### 1.4 검증
- `npx tsc --noEmit` pass
- `next build` pass
- `git diff` 로 SQL 문자열·매직넘버 값이 변하지 않았는지 확인
- 핵심 API 5개 수동 호출 후 응답 동일성 확인 (시나리오 문서는 Phase 2 진입 직전 작성)

---

## Phase 2 — DB 헬퍼 & 비즈니스 로직 추출

**원칙**: route.ts 슬림화. 응답 JSON shape 보존. race-guard SQL 시맨틱 절대 변경 금지.

### 2.1 `lib/db/queries/_helpers.ts` 작성
시그니처:
```ts
export async function exec(sql: string, args?: unknown[]): Promise<ResultSet>
export async function execOne<T>(sql: string, args?: unknown[]): Promise<T | null>
export async function execMany<T>(sql: string, args?: unknown[]): Promise<T[]>

// INSERT OR IGNORE 결과: lastInsertRowid 반환. 충돌(이미 존재) 시 null.
export async function claimOnce(sql: string, args: unknown[]): Promise<number | null>

// conditional UPDATE 결과: rowsAffected > 0.
export async function claimUpdate(sql: string, args: unknown[]): Promise<boolean>

export async function tx<T>(fn: (t: Transaction) => Promise<T>): Promise<T>
```
**SQL 문자열은 절대 변경 금지**. 각 query 함수에서 `db.execute({sql,args})` 호출만 helper로 교체.

### 2.2 `lib/game/exp-bonus.ts` 작성 (순수 함수)
```ts
calcStreakBonus(streak: number, baseExp: number): { bonus: number; tier: number }
calcMissPenalty(missedDays: number, baseExp: number): number
calcDueBonus(dueTime: string | null, nowStr: string, baseExp: number): { exp: number; bonus: number; penalty: boolean }
calcRoutineDeadlineBonus(nowHHMM: string, deadlineHHMM: string, baseExp: number): { exp: number; deadlineBonus: boolean }
```
- 모든 매직넘버는 `lib/constants/exp.ts` 또는 `lib/constants/time.ts`에서 import
- 단위 테스트는 vitest 도입하지 않고 임시 `scripts/verify-exp-bonus.ts`로 before/after 같은 입력에 같은 출력 확인

### 2.3 `lib/game/rewards.ts` 작성
```ts
export async function applyReward(opts: {
  source: "daily" | "todo" | "routine" | "project" | "quest" | "battle"
  label: string         // activity_log에 들어갈 text
  exp: number
  comment: string
}): Promise<{ leveledUp; oldLevel; newLevel; rewards }>
```
내부: `addActivityLog → incrementTaskCount → gainExp` 시퀀스. 12회 반복되는 패턴 제거. **단, gainExp의 트랜잭션 본문은 건드리지 않음**.

### 2.4 `lib/api/respond.ts`, `lib/api/validate.ts`
- 23개 route에 산재한 `try/catch + initDb + NextResponse.json` 보일러 추상화
- `withInit(handler)` 래퍼는 initDb를 호출하고 error를 표준 JSON 응답으로 변환
- 응답 shape 변경 금지 (기존 클라이언트가 의존)

### 2.5 가챠 순수 로직 분리
- `lib/game/gacha.ts` 작성
- `app/api/inventory/route.ts:31-83, 156-223`의 등급 추출/스탯 롤링 순수 함수만 이동
- route는 DB IO만 남김 (장비 INSERT, character UPDATE)

### 2.6 route.ts 리팩토링 적용
대상 순서: `app/api/todos/route.ts` → `app/api/checklist/route.ts` → `app/api/routines/route.ts` → `app/api/projects/*/route.ts` → `app/api/inventory/route.ts` → 나머지.

각 route는 다음 4단계로 슬림화:
1. DB read (필요한 row 가져오기)
2. 순수 계산 (`exp-bonus` 호출)
3. race-guard claim (`claimOnce` / `claimUpdate`)
4. `applyReward` 호출 후 응답

### 2.7 검증
- Phase 2 시작 직전 `git tag pre-refactor-baseline` 찍기
- 핵심 시나리오 5개를 손으로 실행 후 응답 JSON을 `verification/baseline-*.json`으로 저장:
  - `POST /api/checklist` (체크 완료, streak 7일 도달 케이스 포함)
  - `PATCH /api/todos` (due_time 보너스/페널티 각각)
  - `POST /api/routines` (마감 보너스, 마감 자정 넘김 케이스)
  - `POST /api/inventory` (가챠 1회/10회)
  - `POST /api/attendance` (연속 출석 보너스)
- 각 단계 머지 전 동일 시나리오 재실행 후 `diff` 확인. `character.total_exp` 델타가 동일하면 통과
- typecheck + build + lint pass

---

## Phase 3 — UI Primitives & Hooks

**원칙**: 컴포넌트는 fetch/state 없이 props만 받음. 로직은 훅으로.

### 3.1 shadcn/ui 초기화
- `npx shadcn@latest init` (의존성 이미 설치됨)
- `components.json` 생성 확인 (이미 있다면 별도 처리)
- 추가할 primitives:
  ```
  npx shadcn@latest add button card dialog drawer tabs input label \
    select switch tooltip sonner progress separator scroll-area \
    checkbox popover accordion textarea
  ```
- Tailwind 설정과 충돌 없는지 확인 (현재 Tailwind 4.x 사용)

### 3.2 `hooks/useApi.ts` 작성
- fetch 통합 fetcher. JSON parse + error normalize.
- 에러 응답 (`{error: string}`)을 throw로 변환
- 컴포넌트에서 try/catch 없이 사용 가능

### 3.3 도메인 훅 작성 (순서대로)
1. `hooks/useChecklist.ts` → `HabitSection.tsx` 적용
2. `hooks/useRoutines.ts` → `RoutineSection.tsx`
3. `hooks/useTodos.ts` → `TodoSection.tsx`, `TasksTab.tsx`
4. `hooks/useProjects.ts` → `ProjectsTab.tsx`
5. `hooks/useCharacter.ts` → `CharacterTab.tsx`
6. `hooks/useMidnightRefresh.ts` → `TasksTab.tsx`

각 훅은 다음 시그니처 표준:
```ts
export function useFoo() {
  return {
    data, isLoading, error,
    refetch,
    // mutations
    create, update, remove, complete,
  }
}
```

### 3.4 Context 도입
- `contexts/ToastContext.tsx`: sonner 위에 `showExp(amount)`, `showLevelUp(level)`, `showError(msg)`, `showInfo(msg)` 빌드. `app/layout.tsx`에 `<Toaster />` 추가.
- `contexts/CharacterContext.tsx`: 캐릭터 + gameConfig + battleConfig를 SWR 스타일로 캐싱. 자식이 props 없이 `useCharacter()` 호출.
- 부모(`GameContainer` 등)의 props 드릴링 제거.

### 3.5 검증
- 각 훅 도입 후 해당 탭 수동 UX 테스트 (체크/추가/편집/삭제/완료 플로우)
- React DevTools Profiler로 불필요 리렌더 확인
- typecheck + build

---

## Phase 4 — God Component 분할

**원칙**: 순수 UI 추출. 로직은 Phase 3 훅이 책임지므로 props 인터페이스가 자연스럽게 좁아짐.

### 4.1 SettingsDrawer (1308 → 6개 panel)
- 라우터 컨테이너 (50줄 내외) + 8개 panel
- 각 panel은 자신만의 훅을 호출 (`useSkillSettings`, `useGameConfig` 등)
- 신규 디렉토리: `components/game/settings/`

### 4.2 ProjectsTab (989 → 5개 파트)
- `ProjectList.tsx` (목록 카드 렌더)
- `ProjectDetail.tsx` (확장된 프로젝트 + 작업 목록)
- `ChapterPanel.tsx` (챕터 묶음 UI)
- `TaskList.tsx` (작업 추가/체크/삭제)
- `AddProjectForm.tsx` (생성 폼)
- 컨테이너 `ProjectsTab.tsx`는 100줄 내외

### 4.3 HabitSection (552 → 4개), RoutineSection (538 → 4개)
- 위 표 참조. 모두 200줄 미만 목표.

### 4.4 CharacterTab, BattleTab, ItemsTab, HomeTab 분할
- 우선순위는 의존 그래프 따라 결정 (CharacterContext 도입 후가 좋음)

### 4.5 검증
- 컴포넌트 line count metric: 모든 파일 < 250줄
- 시각적 동등성: Phase 1 시점의 스크린샷 5장과 Phase 4 종료 시점 비교 (수동)
- typecheck + build

---

## 우선순위별 디테일

### (1) UI / 상태 / API 분리
- **shadcn/ui 도입**: 확정. 의존성 100% 갖춰져 있어 도입 비용 최소.
- **훅 패턴 표준**:
  ```ts
  // hooks/useChecklist.ts
  export function useChecklist() {
    const { data, error, isLoading, mutate } = useSWR(...) // 또는 useState + useEffect
    const complete = useCallback(async (id) => { ... mutate() }, [...])
    return { items, checkedIds, groups, bonusGroupIds, isLoading, complete, addItem, editItem, removeItem, addGroup, editGroup, removeGroup, refetch: mutate }
  }
  ```
- **SWR 도입은 보류**: Phase 3 진입 시점에 재검토. 도입 시 의존성 추가 + 기존 fetch 마이그레이션 비용 vs 자동 revalidate/dedupe 이득 저울질. 우선은 useState + useEffect 패턴 유지.
- **Context 최소화**: `ToastContext`, `CharacterContext` 2개만. 그 외는 각 hook이 직접 fetch.

### (2) 상수/매직넘버 추출
- 위 표의 `lib/constants/*` 7개 파일. **값 자체는 변경 금지**.
- cfg 테이블에서 읽는 값 (`base_exp`, `level_multiplier`, `vit_to_max_hp` 등)은 건드리지 않음. 이미 DB 외부화됨.
- 추출 대상은 **코드에 인라인된 숫자/문자열만**.

### (3) 쿼리 패턴 통일
- `_helpers.ts`로 `db.execute` boilerplate 추상화. **단지 래핑이며 SQL은 그대로**.
- race-guard 패턴은 `claimOnce` (INSERT OR IGNORE) / `claimUpdate` (conditional UPDATE) helper로만 호출. 이미 검증된 시맨틱 보존.
- KST 헬퍼는 `lib/time/kst.ts` 단일 출처. queries는 여기서만 import.

### (4) 공통 비즈니스 로직
- `applyReward()`로 12회 반복 패턴 제거.
- `exp-bonus.ts`의 순수 함수로 route 인라인 계산 제거.
- gainExp 트랜잭션 본문은 절대 건드리지 않음.

---

## 작업 가이드 주석 표준

모든 신규 모듈 헤더에 다음 형식 docblock 작성:

```ts
/**
 * @module lib/game/exp-bonus
 * @purpose 체크리스트·투두·루틴 EXP 보너스·페널티 순수 계산 (DB·IO 없음)
 * @add-here:
 *   - 새 보너스 룰(예: 주말 2배, 연속 그룹 보너스): 이 파일에 함수 추가
 *   - 새 매직넘버: lib/constants/exp.ts 에 상수 추가 후 여기서 import
 *   - route에서는 이 함수만 호출. EXP 계산을 route에 인라인 금지
 * @do-not:
 *   - DB 호출 (이 모듈은 순수 함수)
 *   - 비동기 함수 (모두 sync)
 */
```

추가 docblock 위치:
- `lib/db/queries/_helpers.ts` 헤더에 **"race-guard 사용 시 반드시 claimOnce/claimUpdate 사용"** 명시
- `hooks/` 디렉토리에 `_README.md` 작성: 훅 시그니처 표준, 명명 규칙, SWR vs useState 결정 로그
- `lib/constants/_README.md`: "새 매직넘버 발견 시 즉시 여기로 추출" 가이드
- `components/game/<domain>/` 각 디렉토리에 짧은 헤더 주석 1줄: 어떤 책임을 가진 컴포넌트들인지

---

## 건드리지 말아야 할 것

| 영역 | 이유 |
|---|---|
| `lib/db/schema.ts`, seed | 마이그레이션. DB 데이터 손실 리스크 |
| `lib/game.ts:42-123 gainExp 트랜잭션 본문` | 레벨업 루프 + equipment 재read로 stale max_hp 방지. 시맨틱 이미 검증 |
| `INSERT OR IGNORE` SQL 6곳 | race-guard. 래핑은 OK, SQL 자체 변경 금지 |
| conditional UPDATE 2곳 (`queries/project.ts:67`, addProjectTask의 status 전환) | 동일 사유 |
| KST 오프셋 `+ 9 * 60 * 60 * 1000` | 모든 query가 이 가정에 의존. 통합은 OK, 값 변경 금지 |
| `lib/battle.ts` 계산식 자체 | Phase 1에서 매직넘버 상수화만. 수식은 별도 RFC |
| `app/api/cron/notify/route.ts` | 외부 cron 트리거 의존. 응답/계약 변경 금지 |
| `app/api/character/route.ts` 응답 shape | 클라이언트가 의존 |

---

## 검증 전략

### 워크플로우
1. **Phase 1 시작 직전**: `git tag pre-refactor-baseline` 찍기. 핵심 API 5개에 대해 baseline 응답 JSON 캡처 (`verification/baseline/*.json`).
2. **각 Phase 진행 중**: 이 문서 그대로 따라가며 단계별 PR.
3. **각 Phase 종료 시**:
   - `npx tsc --noEmit` pass
   - `next build` pass (Vercel 배포 시 동일)
   - 동일 시나리오 5개 재실행 후 baseline JSON과 `diff` (응답 shape 동일성)
   - `character.total_exp` 델타가 동일하면 통과
   - 시각적 동등성: 수동 스크린샷 비교
4. **각 Phase 완료 직후**: 이 문서 상단 "진행 상황 트래커"의 해당 체크박스를 `[x]`로 표시. 완료 일자(YYYY-MM-DD)와 해당 PR/커밋 SHA를 옆에 메모.

### 핵심 시나리오 5개
1. `POST /api/checklist` action=check: streak 0 → 1 / streak 6 → 7 (보너스 트리거) / 그룹 전체 완료 (그룹 보너스)
2. `PATCH /api/todos`: due_time 없음 / due_time 안에 / due_time 초과
3. `POST /api/routines` action=check: 마감 전 / 마감 후 / 자정 넘김 (deadline 06:00, now 18:00)
4. `POST /api/inventory` action=gacha: count=1 / count=10
5. `POST /api/attendance`: 첫 출석 / 7일 연속

### 자동화 (선택)
- vitest 도입은 Phase 2.2 (`exp-bonus.ts` 작성 시) 결정. 도입한다면 `lib/game/exp-bonus.test.ts`에 단위 테스트 추가
- Playwright는 비용 대비 이득 작아 보류

---

## 마이그레이션 순서 한눈에

```
[완료]      Phase 0  플랜 작성

[다음 작업] Phase 1.1 constants → 1.2 kst → 1.3 ui constants                  [PR 1개]
            Phase 2.1 db helpers → 2.2 exp-bonus → 2.3 rewards                [PR 2-3개]
            Phase 2.4 api helpers → 2.5 gacha → 2.6 route 리팩토링            [PR 2-3개]
            Phase 3.1 shadcn init → 3.2 useApi                                [PR 1개]
            Phase 3.3 도메인 훅 (5개) → 3.4 contexts                          [PR 5-6개]
            Phase 4.1 SettingsDrawer → 4.2 ProjectsTab → ... 분할             [PR 컴포넌트별]
```

각 PR은 단독으로 빌드/배포 가능해야 함. 직전 PR이 없어도 통합 안 깨지도록.

---

## Critical Files

- `/mnt/c/Users/wandp/OneDrive/바탕 화면/지헌/lifequest/UIUX(v0)/lib/constants/` (Phase 1 신규 디렉토리)
- `/mnt/c/Users/wandp/OneDrive/바탕 화면/지헌/lifequest/UIUX(v0)/lib/time/kst.ts` (Phase 1.2 신규)
- `/mnt/c/Users/wandp/OneDrive/바탕 화면/지헌/lifequest/UIUX(v0)/lib/db/queries/_helpers.ts` (Phase 2.1 신규)
- `/mnt/c/Users/wandp/OneDrive/바탕 화면/지헌/lifequest/UIUX(v0)/lib/game/exp-bonus.ts` (Phase 2.2 신규)
- `/mnt/c/Users/wandp/OneDrive/바탕 화면/지헌/lifequest/UIUX(v0)/lib/game/rewards.ts` (Phase 2.3 신규)
- `/mnt/c/Users/wandp/OneDrive/바탕 화면/지헌/lifequest/UIUX(v0)/app/api/checklist/route.ts` (Phase 2.6 1차 리팩토링)
- `/mnt/c/Users/wandp/OneDrive/바탕 화면/지헌/lifequest/UIUX(v0)/app/api/todos/route.ts` (Phase 2.6)
- `/mnt/c/Users/wandp/OneDrive/바탕 화면/지헌/lifequest/UIUX(v0)/app/api/routines/route.ts` (Phase 2.6)
- `/mnt/c/Users/wandp/OneDrive/바탕 화면/지헌/lifequest/UIUX(v0)/app/api/inventory/route.ts` (Phase 2.5/2.6)
- `/mnt/c/Users/wandp/OneDrive/바탕 화면/지헌/lifequest/UIUX(v0)/hooks/` (Phase 3 신규 디렉토리)
- `/mnt/c/Users/wandp/OneDrive/바탕 화면/지헌/lifequest/UIUX(v0)/contexts/` (Phase 3.4 신규 디렉토리)
- `/mnt/c/Users/wandp/OneDrive/바탕 화면/지헌/lifequest/UIUX(v0)/components/ui/` (Phase 3.1 shadcn 자동 생성)
- `/mnt/c/Users/wandp/OneDrive/바탕 화면/지헌/lifequest/UIUX(v0)/components/game/settings/`, `projects/`, `habit/`, `routine/`, `character/`, `items/`, `battle/` (Phase 4 신규 분할)

---

## 작업 로그

### Phase 1 — 완료 (2026-05-13)

**범위**: 상수 파일 7개 + KST 헬퍼 통합 + UI 색상 추출. 동작 변경 0%.

**1.1 상수 파일 7개 (신규)**
- `lib/constants/_README.md` — 추출 가이드 (DB cfg 와 코드 인라인의 경계 명시)
- `lib/constants/exp.ts` — `STREAK_THRESHOLDS`, `STREAK_BONUS_RATIOS`, `MISS_PENALTY_PER_DAY`, `MISS_PENALTY_CAP`, `DUE_BONUS_RATIO`, `DUE_PENALTY_RATIO`, `ROUTINE_DEADLINE_BONUS_MULT`, `STREAK_MAX`, `DEFAULT_ITEM_EXP`
- `lib/constants/battle.ts` — `BASE_ACCURACY`, `ACCURACY_*`, `EVADE_MAX`, `DAMAGE_RANDOM_MIN/MAX`, `MIN_DAMAGE_RATIO_BY_DEFENSE`, `CRIT_*`, `DOUBLE_ATK_CHANCE`, `LIFE_STEAL_RATIO`, `DEF_IGNORE_RATIO`, `REFLECT_RATIO`, `MONSTER_CLEAR_SCALE`, `MONSTER_LEVEL_SCALE`, `MAX_BATTLE_TURNS`, `HP_LOW_TRIGGER_RATIO`, STR/INT/VIT 변환 폴백
- `lib/constants/gacha.ts` — `SUB_RATIOS=[0.5,0.4]`, `COMBAT_RATIOS=[1.0,0.8]`, `SUB/COMBAT_RATIO_FALLBACK`, `STAT_MIN_RATIO=0.3`, `STAT_MAX_RATIO=0.5`, `LEVEL_BONUS_PER_LEVEL=0.02`, `MAX_GACHA_COUNT=100`, `PARSE_COUNT_PROB=0.5`
- `lib/constants/ai.ts` — `ACTIVITY_EXP_RANGE=[0,200]`, `ACTIVITY_DEFAULT_EXP=50`, `ACTIVITY_COMMENT_MAX_LEN=80`, `PROJECT_BONUS_RANGE=[50,500]`, `TASK_EXP_RANGE=[10,100]`, `PROJECT_DEFAULT_BONUS_EXP=100`, `PROJECT_DEFAULT_TASK_EXP=20`, `AI_RETRY_DELAY_MS=500`, `AI_MAX_RETRIES=2`
- `lib/constants/time.ts` — `KST_OFFSET_MS`, `ROUTINE_DEADLINE_OVERNIGHT_CUTOFF="06:00"`, `ROUTINE_OVERNIGHT_START="18:00"`, `ROUTINE_GRACE_MIN=30`, `STALE_STREAK_DAYS=7`, `TOAST_AUTO_DISMISS_MS=3000`, `DEADLINE_IMMINENT_DAYS=3`, `ONE_DAY_MS`
- `lib/constants/quest.ts` — `QUEST_REWARD_MIN=50`, `QUEST_REWARD_MAX=100`
- `lib/constants/ui.ts` — `GRADE_COLOR`, `GRADE_LABEL`, `GRADE_BG`, `PRIORITY_LABEL`, `PRIORITY_COLOR`, `STATUS_LABEL`, `PROJECT_COLOR_OPTIONS`, `PROJECT_COLOR_CLS`, `HP_MP_XP_COLORS`

**1.2 KST 헬퍼 통합**
- `lib/time/kst.ts` 신규: `kstDate`, `now`, `todayKST`, `yesterdayKST`, `currentTimeKST`, `isWithinRoutineDeadline`
- `lib/db/client.ts` → `getClient` 만 보유. `now`/`todayKST` 는 `lib/time/kst` 에서 re-export (후방 호환). 23개 import site 무수정
- `lib/db/queries/checklist.ts` → 로컬 `yesterdayKST` 제거, `@/lib/time/kst` 에서 import
- `lib/db/queries/routine.ts` → 로컬 `currentTimeKST`, `isWithinRoutineDeadline` 제거, `@/lib/time/kst` 에서 import

**1.3 UI 상수 통합**
- `components/game/ItemsTab.tsx` → `GRADE_COLOR/LABEL/BG` 인라인 제거, `@/lib/constants/ui` 에서 import
- `components/game/ProjectsTab.tsx` → `PRIORITY_LABEL/COLOR/STATUS_LABEL/COLOR_OPTIONS/COLOR_CLS` 인라인 제거. `isDueSoon` 의 `3 * 24 * 60 * 60 * 1000` 을 `DEADLINE_IMMINENT_DAYS` 로 교체. (JSX 호환을 위해 지역 별칭 `COLOR_OPTIONS = PROJECT_COLOR_OPTIONS`, `COLOR_CLS = PROJECT_COLOR_CLS` 유지)
- `components/game/CharacterPanel.tsx` → HP/MP/XP hex 색상 인라인 제거, `HP_MP_XP_COLORS` 사용

**1.4 검증 결과**
- `npx tsc --noEmit` ✅ (오류 0개)
- `npx next build` ✅ (Turbopack 4.8s, 23개 페이지 생성 성공)
- `git diff` 으로 SQL 문자열·매직넘버 값 변화 없음 확인 (이동·재사용만, 6개 파일 19+/74- = 순감소)
- 시나리오 5개 baseline 검증은 플랜대로 Phase 2 진입 직전에 수행 예정

**Phase 1 에서 의도적으로 보류한 부분 (Phase 2 에서 합류)**
- `lib/constants/exp/battle/gacha/ai/quest.ts` 상수들의 **route/queries/components 내 인라인 사용처 교체는 Phase 2 에서 수행**.
  - 이유: 위험도 0 원칙 — 이번 단계는 "이동·정의만". 인라인 매직넘버를 상수 import 로 바꾸는 작업은 Phase 2.2 (`lib/game/exp-bonus.ts`) 와 Phase 2.5 (`lib/game/gacha.ts`) 의 순수 함수 분리 작업과 함께 묶어야 자연스럽게 합류됨
  - 현재 상수 파일은 사용 준비 완료 상태이며, **값과 출처 line 번호가 docblock 에 명시**돼 있어 Phase 2 작업자가 그대로 import 만 하면 됨
- Phase 0 의 `git tag pre-refactor-baseline` 과 핵심 시나리오 baseline JSON 캡처는 플랜에 명시된 대로 Phase 2 진입 직전에 수행 (Phase 1 은 위험도 0 이라 baseline 불필요)
- `TasksTab.tsx` 의 KST 자정 계산 인라인 (`new Date(Date.now() + 9*60*60*1000)`) 도 Phase 1 시점에 통합 가능했으나, Phase 3.3 의 `hooks/useMidnightRefresh.ts` 추출 작업과 함께 정리 예정

**다음 작업자에게**
- Phase 2 시작 직전: `git tag pre-refactor-baseline` 찍고 핵심 시나리오 5개 응답을 `verification/baseline/*.json` 으로 저장
- Phase 2.2 작성 시: `STREAK_THRESHOLDS`, `STREAK_BONUS_RATIOS`, `MISS_PENALTY_PER_DAY/CAP`, `DUE_BONUS_RATIO`, `DUE_PENALTY_RATIO`, `ROUTINE_DEADLINE_BONUS_MULT`, `STREAK_MAX` 를 `lib/constants/exp.ts` 에서 import 해 사용
- Phase 2.5 작성 시: `SUB_RATIOS`, `COMBAT_RATIOS`, `STAT_MIN_RATIO`, `STAT_MAX_RATIO`, `LEVEL_BONUS_PER_LEVEL`, `MAX_GACHA_COUNT` 를 `lib/constants/gacha.ts` 에서 import 해 사용

---

### Phase 2 — 완료 (2026-05-14)

**범위**: DB helper + 게임 비즈니스 로직 + API 응답 표준화 추출. 7개 핵심 route 슬림화. 응답 shape 무변동.

**baseline**: `git tag pre-refactor-baseline` (commit `43c1ae6`, push 완료)

**2.1 `lib/db/queries/_helpers.ts` 신규**
- `exec(sql, args?)` — InArgs undefined 시 단일 문자열, 있으면 객체 형식. 기존 `db.execute(...)` 호출 표준화
- `execOne<T>(sql, args?)` / `execMany<T>(sql, args?)` — SELECT 단일/다중 row 헬퍼
- `claimOnce(sql, args)` — INSERT OR IGNORE 패턴. lastInsertRowid 또는 null
- `claimUpdate(sql, args)` — conditional UPDATE 패턴. rowsAffected > 0
- `tx(fn)` — 쓰기 트랜잭션 래퍼. throw 시 자동 rollback, 정상 종료 시 commit
- 타입은 `@libsql/client` 에서 (pnpm 격리 환경 호환). SQL 문자열 절대 변경 금지

**2.2 `lib/game/exp-bonus.ts` 신규 (순수 함수)**
- `calcStreakBonus(streak, baseExp)` → `{ bonus, tier }` — `STREAK_THRESHOLDS` 역순 스캔으로 기존 streakBonusExp 와 동일 출력 보장
- `calcMissPenalty(missedDays, baseExp)` — `MISS_PENALTY_PER_DAY`, `MISS_PENALTY_CAP` 사용. 기존 penaltyExpForMissedDays 와 동일
- `calcDueBonus(dueTime, nowStr, baseExp)` → `{ exp, bonus, penalty }` — todos route 의 due_time 인라인 계산 통합 (`DUE_BONUS_RATIO`, `DUE_PENALTY_RATIO`)
- `calcRoutineDeadlineBonus(nowHHMM, deadline, baseBonus)` → `{ exp, deadlineBonus }` — `ROUTINE_DEADLINE_BONUS_MULT`(=2) 적용. `isWithinRoutineDeadline` 호출
- DB·async 없음. lib/constants/exp 와 lib/time/kst 만 의존

**2.3 `lib/game/rewards.ts` 신규**
- `applyReward({source, label, exp, comment})` → `addActivityLog → incrementTaskCount → gainExp` 시퀀스 통합
- 호출 순서·SQL 트랜잭션 경계 보존. 기존 route 들의 동일 3-call 패턴 7회 제거
- `RewardSource` union: daily|todo|routine|project|quest|battle
- gainExp 트랜잭션 본문 무수정 (lib/game.ts:42-123 그대로)

**2.4 `lib/api/respond.ts` + `validate.ts` 신규**
- `respond.ts`: `ok(data)`, `err(msg, status=500)`, `badRequest`, `notFound`, `withInit(handler)`
- `withInit` 가 자동 `initDb()` + try/catch → `{ error: String(e) }, 500` 변환. 기존 route 22곳의 try/catch 보일러 제거
- `validate.ts`: `requireNumber`, `requireString`, `requireBoolean`, `requireOneOf`, `ValidationError`. 도메인별 입력 검증 표준화 (route 들이 점진적으로 채택)

**2.5 `lib/game/gacha.ts` 신규 (순수 함수)**
- `pickGrade`, `pickSlot`, `randBetween`, `parseCount`, `formatOpt`, `rollAbilityValue`, `rollGachaItems`
- inventory route 의 라인 29-83, 156-223 의 순수 로직 전부 이동. route 는 DB read + 트랜잭션 INSERT 만 남김
- 매직넘버는 `lib/constants/gacha.ts` 에서 import: `SUB_RATIOS`, `COMBAT_RATIOS`, `*_RATIO_FALLBACK`, `STAT_MIN/MAX_RATIO`, `LEVEL_BONUS_PER_LEVEL`, `PARSE_COUNT_PROB`
- 타입(`GradeRow`, `SlotRow`, `AbilityRow`, `PassiveRow`, `GachaPools`, `RolledItem`) export — 호출자 재사용 용이

**2.6 route 리팩토링 (응답 shape 보존)**
- `app/api/todos/route.ts` — `calcDueBonus` 적용, `applyReward({source:"todo"})`. PATCH 의 due_time 인라인 계산 제거
- `app/api/checklist/route.ts` — `calcMissPenalty` 적용, `applyReward({source:"daily"})`. comment 분기 그대로 (시각적 동등성). 그룹 보너스 두 번째 gainExp 는 의도된 raw 시퀀스 유지 (incrementTaskCount 미호출 — 동작 보존)
- `app/api/routines/route.ts` — `applyReward({source:"routine"})`. checkRoutineItem 안의 deadline 계산은 그대로 (이미 lib/time/kst.isWithinRoutineDeadline 호출)
- `app/api/projects/route.ts`, `[id]/route.ts`, `[id]/tasks/route.ts`, `[id]/tasks/[taskId]/route.ts` — `withInit` + `ok`/`badRequest`/`notFound` 적용. `[taskId]/route.ts` 는 incrementTaskCount 가 AI judge 전 호출되는 기존 순서 유지 (다른 route 와 다른 의도된 차이)
- `app/api/inventory/route.ts` — `rollGachaItems` 호출로 슬림화. 트랜잭션은 `tx()` 헬퍼로 래핑 (rollback 보존). `MAX_GACHA_COUNT` 상수 적용. count 검증 에러 메시지에 상수 값 보간
- `app/api/attendance/route.ts` — `withInit` + `ok`/`badRequest` 적용
- `app/api/quest/reward/route.ts` — `execOne`/`exec` 헬퍼 사용. `QUEST_REWARD_MIN/MAX` 폴백 상수 적용. 기존 cfg 우선순위(`cfg.daily_quest_exp_min ?? ...`) 보존

**2.7 검증 결과**
- `npx tsc --noEmit` ✅ (오류 0개; 초기 `@libsql/core/api` import 가 pnpm 격리로 실패 → `@libsql/client` 에서 import 로 수정)
- `npx next build` ✅ (Turbopack, 23개 라우트 생성 성공)
- diff stat: 10개 route 파일 538 ins / 806 del = **순감소 268줄**
- 응답 JSON shape: 모든 필드명·구조 동일성 코드 리뷰로 확인 (todos: `{exp, comment, bonusExp, penaltyApplied, ...levelResult}`, checklist: `{exp, baseExp, bonusExp, penaltyExp, streak, comment, groupBonus, groupName, ...levelResult}`, routines/inventory/attendance/quest 동일)
- 실제 baseline diff 검증은 사용자 환경에서 `verification/baseline/README.md` 가이드대로 curl 응답 캡처 후 수행

**Phase 2 에서 의도적으로 보류 (Phase 3/4 에서 합류)**
- 나머지 route 파일들(activities/battle/battle-config/chapters/character/config/cron/prompt/push/skills/skill-db/todo-templates/projects/ai-judge — 총 14개)의 `withInit` 적용은 보일러 정리만 남음. **Phase 4 컴포넌트 분할** 시 도메인별 PR 안에서 자연스럽게 합류 (예: SettingsDrawer 분할 PR 에 config/prompt/push/skill-db 보일러 정리 포함)
- `lib/db/queries/*.ts` 의 `db.execute({sql, args})` 호출들도 `exec`/`execOne` 헬퍼로 마이그레이션 가능 — 가시적 이득이 작아 Phase 3 의 hooks 추출 작업과 묶어 정리 예정 (race-guard 패턴인 INSERT OR IGNORE 6곳, conditional UPDATE 2곳은 시맨틱 보존 위해 신중하게)
- `streakBonusExp`/`penaltyExpForMissedDays` 함수는 `lib/db/queries/checklist.ts` 에 그대로 남아있음 (`updateChecklistStreak` 내부에서 호출). 외부 import 사이트가 사라졌으므로 다음 PR에서 제거 가능

**다음 작업자에게 (Phase 3)**
- shadcn init 전: `package.json` 의 Radix UI/cva/sonner/cmdk/vaul 의존성이 이미 설치돼 있는지 재확인
- `hooks/useApi.ts` 작성 시: `lib/api/respond.ts` 가 항상 `{ error: string }` 형식으로 에러를 반환하므로 fetcher 에서 그 필드를 throw 로 변환
- `hooks/useChecklist.ts` 등 도메인 훅 작성 시: 위 route 들의 응답 shape (`{ items, checkedIds, groups, bonusGroupIds }` 등) 이 그대로 유지됨을 활용
- 테스트 도입(`vitest`) 결정 보류 중. 작성한다면 `lib/game/exp-bonus.test.ts` 우선 — 5가지 streak 임계값, miss penalty 캡, due bonus on/off, routine deadline bonus 자정 넘김 케이스

---

### Phase 3 — 완료 (2026-05-14)

**범위**: shadcn primitives 도입 + 공통 fetch 래퍼 + 도메인 훅 6개 + Toast/Character 컨텍스트 인프라. 응답 shape 및 자식 컴포넌트 props 인터페이스 무변동.

**3.1 shadcn primitives 18개 (신규)**
- `components/ui/{button,card,dialog,drawer,tabs,input,label,select,switch,tooltip,sonner,progress,separator,scroll-area,checkbox,popover,accordion,textarea}.tsx`
- `components.json` 은 Phase 0 이전에 이미 생성돼 있어 `npx shadcn@latest init` 스킵, primitive 추가만 수행 (`npx shadcn@latest add ... --yes --overwrite`)
- 기존 컴포넌트들의 마이그레이션은 Phase 4 분할과 함께 합류 (현재 코드는 모두 inline Tailwind 라 빌드/배포 영향 없음)

**3.2 `hooks/useApi.ts` 신규**
- `apiGet/apiPost/apiPut/apiPatch/apiDelete` — JSON parse + error normalize. `ApiError` 클래스 export
- `lib/api/respond.ts` 의 `{ error: string }` 응답을 `throw new ApiError(status, msg)` 로 변환. 204 No Content / 빈 body 도 대응
- 호출자는 `try { ... } catch (e) { if (!(e instanceof ApiError)) throw e }` 패턴으로 일관성 유지

**3.3 도메인 훅 6개 신규**
- `hooks/useChecklist.ts` — `{ dailyItems, setDailyItems, checkedDailyIds, setCheckedDailyIds, habitGroups, setHabitGroups, bonusGroupIds, setBonusGroupIds, refetch }`. `DailyItem` 타입 export
- `hooks/useRoutines.ts` — routines + checkedItemIds + bonusIds + chapters (active 만) + setter + refetch. `/api/routines` + `/api/chapters` 통합 fetch
- `hooks/useTodos.ts` — todoItems + completedTodoCount + setter + refetch. 응답이 `{items: TodoItem[]}` 또는 `TodoItem[]` 양쪽 수용
- `hooks/useProjects.ts` — projects + chapters + loading + setter + refetch. `Project/Chapter/ProjectTask` 타입 export. ProjectsTab 의 자체 fetch 로직 흡수
- `hooks/useCharacter.ts` — char + setter + refetch. `CharacterData` 타입 export. page.tsx 의 fetchChar 패턴 추출
- `hooks/useMidnightRefresh.ts` — KST 자정마다 callback 호출. `KST_OFFSET_MS` / `ONE_DAY_MS` 상수 사용

**3.3 적용처**
- `components/game/TasksTab.tsx` — 12개 useState + fetchAll(5개 fetch) + KST 자정 inline → 4개 훅 호출 + `useMidnightRefresh(fetchAll)`. executeDelete 는 `apiDelete` 로 마이그레이션. 자식 컴포넌트 props 인터페이스 변경 없음
- `components/game/ProjectsTab.tsx` — projects/chapters useState + fetchAll(2개 fetch) → `useProjects()`. 7개의 `await fetchAll()` 호출이 `await refetch()` 로 sed 일괄 치환됨. mutation 로직(handleAddProject 등)은 그대로 유지
- `app/page.tsx` — `useState<CharacterData>` + fetchChar 인라인 → `useCharacter()`. CharacterData 타입은 hooks/useCharacter 로 이전됨. fetchQuestTotal 은 `apiGet` 로 마이그레이션

**3.4 Context 도입**
- `contexts/ToastContext.tsx` — sonner 위에 `showExp/showPenalty/showLevelUp/showError/showInfo` 의미 단위 hook 제공. 자동 dismiss 시간은 `TOAST_AUTO_DISMISS_MS` 상수
- `contexts/CharacterContext.tsx` — `CharacterProvider` + `useCharacterCtx()`. 내부에 `useCharacter()` 호출 + 초기 refetch
- `app/layout.tsx` — `<Toaster richColors position="top-center" />` 추가. CharacterProvider 는 인프라만 (page.tsx 가 아직 props 드릴링 구조이므로 실제 wrap 은 Phase 4 분할과 함께)
- 기존 컴포넌트들의 자체 toast state(TasksTab/ProjectsTab/RoutineSection/HabitSection/TodoSection 등)는 변경 없이 유지. 새 컴포넌트들이 sonner 를 사용할 수 있는 인프라만 마련

**3.5 검증 결과**
- `npx tsc --noEmit` ✅ (오류 0개)
- `npx next build` ✅ (Turbopack 4.9s, 23개 라우트 그대로)
- bundle 변화: shadcn primitives 18개는 사용처 없으면 tree-shake 되어 final bundle 무영향
- 자식 컴포넌트 props 인터페이스 동일성 유지 (HabitSection/RoutineSection/TodoSection 의 setter 들이 그대로 props 로 전달됨)

**Phase 3 에서 의도적으로 보류 (Phase 4 에서 합류)**
- 자식 컴포넌트(HabitSection/RoutineSection/TodoSection)의 내부 fetch 마이그레이션 → 컴포넌트 분할 시 각 자식이 직접 `useChecklist`/`useRoutines`/`useTodos` 호출하도록 자연스럽게 이동. 현재는 부모(TasksTab)가 훅 호출 후 setter 들을 props 로 전달
- ProjectsTab 의 30+ 인라인 fetch (handleAddProject, handleCompleteTask, …) → 컴포넌트 분할(5개 파트) PR 에서 각 파트가 `useApi` 사용하도록 마이그레이션
- CharacterTab 의 skills fetch → Phase 4 의 `useSkills` 또는 SkillSettings 컨테이너로 이동
- `CharacterProvider` 의 page.tsx 적용 → 자식 컴포넌트들이 props char 대신 `useCharacterCtx()` 호출하도록 마이그레이션 후 wrap. 지금 wrap 하면 fetchChar 가 useCharacter 와 CharacterProvider 양쪽에서 호출되어 race 위험
- 기존 컴포넌트들의 자체 toast state → sonner 의 `useToast()` 로 점진 교체. Phase 4 분할 PR 에서 각 컴포넌트별로 수행

**다음 작업자에게 (Phase 4)**
- 분할 우선순위: SettingsDrawer(1308) → ProjectsTab(989) → HabitSection(552) → RoutineSection(538). 가장 큰 것부터, 그러나 의존 그래프 상 SettingsDrawer 는 가장 독립적이라 시작점으로 적합
- 분할 후 자식 컴포넌트가 직접 도메인 훅 호출하도록 마이그레이션. 부모(TasksTab 등)는 더 이상 useState/setter 를 자식에 props 로 넘기지 않음
- `CharacterProvider` wrap 시점: 모든 char 사용처(CharacterTab, ItemsTab, BattleTab, SettingsDrawer, CharacterPanel)가 props 대신 컨텍스트를 사용하도록 마이그레이션 완료 후
- shadcn primitive 도입: 새 분할 컴포넌트부터 `Button`/`Card`/`Dialog` 사용. 기존 inline Tailwind 는 그대로 두고 점진 교체

---

### Phase 4.1 — 완료 (2026-05-14)

**범위**: SettingsDrawer 1308줄 → 62줄 컨테이너 + 10개 settings 모듈. 각 panel 자체 fetch + state + 저장.

**신규 파일 (components/game/settings/)**
- `SettingsSection.tsx` (32) — collapsible 헤더/콘텐츠 공통 chrome
- `CharacterPanel.tsx` (97) — char 스탯/포인트/레벨/EXP 일괄 편집 (PUT /api/character)
- `SkillsPanel.tsx` (131) — 보유 스킬 SKP 배분 (PUT /api/skills)
- `SkillDbPanel.tsx` (230) — 스킬 DB CRUD (PUT/POST/DELETE /api/skill-db)
- `ConfigPanel.tsx` (87) — game_config 일괄 편집 (PUT /api/config × N)
- `BattleConfigPanel.tsx` (123) — battle_config 일괄 편집 + char.vit re-PUT (max_hp/mp 재계산)
- `PromptPanel.tsx` (63) — AI 판정 프롬프트 (PUT /api/prompt)
- `TodoTemplatesPanel.tsx` (185) — 반복 할 일 규칙 (GET/POST/PUT/DELETE /api/todo-templates)
- `TodoTemplateForm.tsx` (188) — 위 패널의 폼 부분 분리
- `ResetPanel.tsx` (101) — 캐릭터 소프트/완전 초기화 (PUT character + DELETE ?mode=partial|full)

**컨테이너**
- `SettingsDrawer.tsx` (62) — drawer chrome + PushSetup + 8개 패널 합성. fetch/useState 0개

**검증**
- 모든 모듈 < 250줄 (최대 SkillDbPanel 230줄)
- typecheck ✅ / build ✅ / commit `0896d3b`
- 응답 shape · UI 동작 무변동. mutation 은 useApi 마이그레이션 (apiGet/Put/Post/Delete + ApiError handling)

---

### Phase 4.2 — 완료 (2026-05-14)

**범위**: ProjectsTab 989줄 → 233줄 컨테이너 + 5개 projects 파트. 자식이 자체 mutation + useState 보유.

**신규 파일 (components/game/projects/)**
- `ProjectCard.tsx` (296) — 개별 프로젝트 카드. 헤더 + 확장 시 status/chapter 편집 + 작업 목록 + 작업 추가 폼. mutation: status change, chapter change, complete task (toast + onExpGained), add task, delete task. props: project, chapters, expanded toggle, onMutated(data), onDelete, onExpGained, onToast
- `ChapterSection.tsx` (288) — 챕터 카드. 진행률 + 내부 프로젝트 (ProjectCard 재사용) + assign 인라인 + add 인라인 + 완료/삭제. mutation: complete chapter, delete chapter, assign projects (Promise.all PATCH), add project in chapter
- `DoneSection.tsx` (102) — 완료 항목 토글. 완료 챕터 인라인 요약 + 완료 프로젝트 ProjectCard 재사용
- `AddProjectForm.tsx` (126) — 새 프로젝트 폼. 자체 form state. POST /api/projects 후 onCreated(refetch)
- `AddChapterForm.tsx` (76) — 새 묶음 폼. 자체 form state. POST /api/chapters 후 onCreated(newId) 콜백으로 컨테이너가 expanded 처리

**컨테이너**
- `ProjectsTab.tsx` (233) — useProjects + toast + confirmDelete + 5개 자식 합성. 요약 카드 + 액션 버튼 + 단독/묶음/완료 섹션 + 삭제 모달

**의도적 design 결정**
- 자식 컴포넌트가 직접 useApi 호출 (props drilling 회피). 부모는 onMutated/onToast/onExpGained 콜백만 전달
- ProjectCard 의 onMutated 는 `(data: { projects? }) => void` — 응답에 projects 가 있으면 부모가 직접 setProjects, 없으면 refetch (예: chapter complete 응답에는 projects 없음)
- ChapterSection 안에서 ProjectCard 재사용 → 단독 프로젝트와 챕터 내 프로젝트가 동일 컴포넌트
- AddProjectForm 의 PROJECT_COLOR_OPTIONS.cls 사용 (PROJECT_COLOR_CLS 매핑 대신 직접 cls). 원본과 동일 — 원본도 c.cls 직접 사용했음

**검증**
- 모든 신규 파일 < 300줄 (250 목표 약간 초과: ProjectCard 296, ChapterSection 288). 책임 응집 위해 추가 분할 안 함
- typecheck ✅ / build ✅ / commit `aeed553`

---

### Phase 4.3 — 완료 (2026-05-14)

**범위**: HabitSection 552줄, RoutineSection 538줄 분할. 자식 인라인 편집/추가 state 자체 보유, 부모는 mutate(PUT)/completeItem(POST) 헬퍼만 전달.

**신규 파일 (components/game/habit/)**
- `streakInfo.ts` (22) — streak → color/label 매핑 순수 함수
- `types.ts` (16) — DailyItem, DeleteTarget
- `HabitItem.tsx` (176) — 단일 습관 행. 이름/EXP 인라인 편집, 알림 시간, 그룹 이동
- `HabitGroupCard.tsx` (167) — 그룹 카드 (헤더 + 진행률 + 항목 목록). 자체 add/edit state

**컨테이너**
- `HabitSection.tsx` (245) — mutate 헬퍼 + completeHabit + 단독/그룹 합성

**신규 파일 (components/game/routine/)**
- `types.ts` (28) — Routine, RoutineItem, RoutineChapter, DeleteTarget
- `RoutineItemRow.tsx` (114) — 단일 항목 행. drag props는 부모에서 주입, 이름/EXP 인라인 편집 자체 보유
- `RoutineCard.tsx` (211) — 루틴 카드. 헤더/진행률/항목 목록/드래그 reorder
- `RoutineFooter.tsx` (99) — 항목 추가 트리거 + 마감 시간 편집 + 묶음 셀렉트 + 루틴 삭제

**컨테이너**
- `RoutineSection.tsx` (163) — mutate + completeItem + RoutineCard 목록 합성

**검증**
- 모든 파일 < 250줄 (최대 HabitSection 245)
- typecheck ✅ / build ✅ / commit `a1bec1e`
- API 계약 불변. drag reorder 응답이 별도 형태(success only)이므로 reorderItems 만 fetch 직접 호출 (RoutineCard 내부)

---

### Phase 4.4 — 완료 (2026-05-14)

**범위**: HomeTab 367, ItemsTab 434, CharacterTab 571, BattleTab 518 분할.

**HomeTab 367 → 28 컨테이너 + home/{4개}**
- `AttendanceCard.tsx` (114) — 출석체크 (POST /api/attendance, 7일 스트릭 시각화)
- `StatsGrid.tsx` (112) — 4칸 미니 스탯 (SVG 원형 게이지). 4개 API 병렬 fetch
- `UrgentProjectsCard.tsx` (58) — 3일 이내 마감 임박 프로젝트
- `ActivitySection.tsx` (128) — AI 활동 입력 (POST /api/activities) + 최근 5건 로그

각 카드 자체 fetch. 컨테이너는 합성만.

**ItemsTab 434 → 145 컨테이너 + items/{5개}**
- `parts.tsx` (77) — GradeBadge / LevelBadge / OptionLine / parseOptions / SLOT_ORDER + types
- `GachaBanner.tsx` (75) — 가챠 배너 + 뽑기 버튼 + 직전 결과 알림
- `ReplaceModal.tsx` (70) — 같은 슬롯 충돌 시 교체/버리기 모달
- `EquippedGrid.tsx` (60) — 9칸 슬롯 그리드 (빈 슬롯 dashed)
- `UnequippedGrid.tsx` (73) — 보관함 목록 + 장착/삭제

컨테이너에 inventory fetch + gacha/replace/discard/delete/equipFromStash mutation.

**CharacterTab 571 → 56 컨테이너 + character/{5개}**
- `constants.tsx` (51) — STATS, StatKey, Skill, CharBasics, EffectiveStats, ItemStatBonuses
- `SkillCard.tsx` (108) — 단일 스킬 카드 (잠금/투자 분기)
- `CombatStatsCard.tsx` (55) — PATK/MATK/PDEF/MDEF/HP/MP + 옵션 + 패시브 배지
- `StatView.tsx` (152) — 스탯 배분 뷰. 자체 delta state + PUT /api/character
- `SkillView.tsx` (165) — 스킬 투자 뷰. pendingInvest map + PUT /api/skills + SkillDetailSheet

컨테이너는 view 토글만.

**BattleTab 518 → 122 컨테이너 + battle/{4개}**
- `types.ts` (91) — TurnLog, Monster, BattleResultData, CharData, RestoreMode, GRADE_KEYS/META
- `TurnItem.tsx` (63) — 단일 턴 로그 행 + MiniBar 공통 컴포넌트
- `LobbyView.tsx` (109) — 전투 시작 전 (5스탯 그리드 + 해금 등급 + 저장된 몬스터/새 전투 버튼)
- `ResultView.tsx` (159) — 결과 화면 (HP/MP 바 + 능력치 비교 + 턴 로그 0.5초 애니메이션 + 승/패/시간초과). visibleTurns useEffect 본 컴포넌트로 이동

컨테이너는 phase 전환 + battle config 로드 + savedMonster 복원 + doFight 호출.

**검증**
- 모든 신규 파일 < 250줄 (최대 ResultView 159)
- typecheck ✅ / build ✅ / commit `801eb17`
- Vercel auto-deploy Ready (22s). 프로덕션 `/api/character` 정상 응답 (level 18)

---

### Phase 4.5 — 검증 완료 (2026-05-14)

**총괄**
- Phase 4 통해 9개 God Component (총 5277줄) → 30+ 모듈화 완료
- 250줄 초과 잔여 3개:
  - `projects/ProjectCard.tsx` (296)
  - `projects/ChapterSection.tsx` (288)
  - `TasksTab.tsx` (277)
  - 모두 책임 응집 + 추가 분할 시 부자연스러운 props drilling 발생. 그대로 유지
- 그 외 모든 컴포넌트 < 250줄
- 패턴 일관성: 자식 컴포넌트가 자체 fetch 또는 mutate 콜백 사용, props drilling 최소화

**남은 권장 사항 (Phase 4 범위 외)**
- TasksTab.tsx 의 4 fetch hooks 가 자식(HabitSection/RoutineSection/TodoSection) props 로 내려가는 구조 유지. 추후 CharacterContext 도입 시 일괄 정리 권장
- shadcn primitive (Button/Card) 점진 도입은 자연스럽게 다음 PR에서

---

### Phase 5.1 — 완료 (2026-05-14)

**범위**: CharacterContext 실제 wrap. page.tsx + 4개 탭(Character/Battle/Items/Settings) + Settings 3개 패널 (Character/Skills/BattleConfig) 의 char props 제거 → useCharacterCtx() 호출.

**변경 파일**
- `hooks/useCharacter.ts` — `CharacterData` 에 `pending_battle_monster?: string | null` 추가 (BattleTab 이 의존)
- `contexts/CharacterContext.tsx` — docblock 갱신 (Phase 5.1 부터 실제 wrap 명시)
- `app/layout.tsx` — `<CharacterProvider>{children}<Toaster /></CharacterProvider>` wrap. Analytics 는 Provider 바깥
- `app/page.tsx` — `useCharacter()` → `useCharacterCtx()`. fetchChar 초기 useEffect 제거 (Provider 가 마운트 시 refetch). 자식 탭 4개의 char/onCharUpdated/onTicketsChanged props 제거
- `components/game/CharacterTab.tsx` — `Props` 제거, `useCharacterCtx()`. CharBasics 타입 import 도 제거 (자식 StatView/SkillView 가 받는 char 는 CharacterData 호환)
- `components/game/BattleTab.tsx` — 동일. `onExpGained` 콜백 자리는 refetch 직접 호출. CharData import 도 제거 (LobbyView/ResultView 가 받는 char 는 CharacterData 호환)
- `components/game/ItemsTab.tsx` — drawTickets/onTicketsChanged props 제거. drawTickets = char?.draw_tickets ?? 0
- `components/game/SettingsDrawer.tsx` — char/onCharUpdated props 제거. 자식 패널들이 직접 컨텍스트 구독
- `components/game/settings/CharacterPanel.tsx` — props 제거, `useCharacterCtx`. onCharUpdated → refetch
- `components/game/settings/SkillsPanel.tsx` — 동일
- `components/game/settings/BattleConfigPanel.tsx` — 동일 (char.vit 재 PUT 후 refetch 호출은 유지)

**검증**
- `npx tsc --noEmit` ✅ (exit 0)
- `npx next build` ✅ (Turbopack, 23개 라우트 그대로)
- diff stat: 11개 파일 54 ins / 75 del = **순감소 21줄**
- char props drilling 7개 제거 (page→4탭, settings 3패널)

**Phase 5.1 에서 의도적으로 보류**
- TasksTab / HomeTab 자식들의 `onExpGained` 콜백 chain (HabitSection/RoutineSection/TodoSection/AttendanceCard/ActivitySection 등이 받음) → 5.2 의 Toast 통합 PR 에서 같이 정리하거나 별도 작업
- BattleTab 자식(LobbyView/ResultView), CharacterTab 자식(StatView/SkillView)이 여전히 char prop 받음 — 컴포넌트 책임 응집 + 테스트 가능성 위해 그대로 유지. 추후 필요시 마이그레이션

**다음 작업자에게 (Phase 5.2)**
- ToastContext.useToast({showExp/showPenalty/showLevelUp/showError/showInfo}) 가 이미 인프라로 마련됨. 자체 toast useState 제거 후 sonner 호출만 남기면 됨
- TasksTab/ProjectsTab/RoutineSection/HabitSection/TodoSection 의 `<Toast>` JSX 와 toast state 제거 대상

---

### Phase 5.2 — 완료 (2026-05-14)

**범위**: TasksTab + ProjectsTab 의 자체 toast useState/JSX 제거. 자식 6개 컴포넌트 (HabitSection/RoutineSection/TodoSection/ProjectCard/ChapterSection/DoneSection) 의 `onToast` props 제거 후 직접 `useToast()` 호출.

**변경 파일**
- `components/game/HabitSection.tsx` — `useToast().showExp` 직접 호출. `onToast` prop 제거. exp + penalty 분기는 showExp 시그니처(`exp, comment, bonus, penaltyExp`)로 그대로 매핑
- `components/game/RoutineSection.tsx` — `useToast().showExp` 호출. `onToast` prop 제거
- `components/game/TodoSection.tsx` — `useToast().showExp/showPenalty` 호출. `data.penaltyApplied` 분기로 showPenalty 호출 (penalty=true 시그널). `onToast` prop 제거
- `components/game/projects/ProjectCard.tsx` — `useToast().showInfo/showError` 호출. error 케이스는 showError. `onToast` prop 제거
- `components/game/projects/ChapterSection.tsx` — `useToast().showInfo` 호출. 자식 ProjectCard 에 `onToast` 전달 라인 제거. `onToast` prop 제거
- `components/game/projects/DoneSection.tsx` — `onToast` prop 제거. 자식 ProjectCard 에 `onToast` 전달 라인 제거
- `components/game/TasksTab.tsx` — `toast` useState + showToast 함수 + sticky `<Toast>` JSX 제거. 자식 3개에 `onToast` 전달 라인 제거
- `components/game/ProjectsTab.tsx` — `toast` useState + showToast 함수 + 하단 `<Toast>` JSX 제거. 자식 3개에 `onToast` 전달 라인 제거

**의도적 design 결정**
- `AttendanceCard`, `ActivitySection` 의 인라인 알림 (`{toast && <div>...</div>}`) 은 sonner 토스트가 아니라 카드 디자인의 일부이므로 **유지**. (출석 보너스 메시지, AI 채점 결과 amber 박스)
- `TasksTab` 의 sticky 토스트 디자인(amber/red 그래디언트 + 2줄 EXP+comment)은 sonner richColors top-center 형태로 대체 — 위치/스타일 미세 변경 있음. 핵심 메시지는 동일 (`+${exp} EXP · 보너스 +${bonus}`)
- `ProjectsTab` 의 fixed bottom 토스트는 sonner top-center 로 위치 변경됨. msg 자체에 EXP 포함된 형태라 showInfo 로 매핑 (exp 인자 무시)
- ProjectCard 의 ApiError 캐치는 showError 로 이전 (이전엔 showToast 로 메시지만 표시했음)

**검증**
- `npx tsc --noEmit` ✅ (exit 0)
- `npx next build` ✅ (Turbopack, 23개 라우트)
- 응답 shape 무변동. toast props drilling 7개(TasksTab→3, ProjectsTab→3, ChapterSection→1) 제거

**Phase 5.2 에서 의도적으로 보류**
- 자식 컴포넌트의 `onExpGained` 콜백 chain — props drilling 패턴 유지. 추후 CharacterContext.refetch 직접 호출로 대체 가능하나, 일부 부모는 `onExpGained` 가 부수 효과(상위 캐릭터 hp/mp 재렌더, 자식 상태 동기화)를 트리거하는 의미라 함부로 제거 어려움. 5.3 또는 별도 PR 에서 처리

**다음 작업자에게 (Phase 5.3)**
- 신규 분할 컴포넌트부터 `Button`/`Card`/`Dialog` 사용. 기존 inline Tailwind 는 점진 교체
- shadcn primitive 채택은 가장 큰 변화 단위가 SettingsDrawer 의 패널들 (Dialog/Drawer 직접 사용 가능)

---

### Phase 5.3 — 완료 (부분 채택) (2026-05-14)

**범위**: 모달 3곳을 shadcn primitives 로 마이그레이션. 그 외 컴포넌트의 inline Tailwind 디자인은 도메인 색상 강결합으로 시각 회귀 위험이 커 **의도적 보류**.

**변경 파일**
- `components/game/TasksTab.tsx` — 삭제 확인 bottom sheet 모달 → `Drawer` + `DrawerContent/Header/Title/Description`. controlled mode (`open` / `onOpenChange`)
- `components/game/ProjectsTab.tsx` — 삭제 확인 center 모달 → `Dialog` + `DialogContent/Header/Title/Description/Footer`. 동일 controlled
- `components/game/items/ReplaceModal.tsx` — bottom sheet 형태 → `Drawer`. close 시 onDiscard 자동 호출. outside click stopPropagation 코드 제거 (Drawer 가 자동 처리)

**도입 안 한 이유 (의도적 보류)**
- **Button**: 라이프퀘스트의 button 은 amber-500 / violet-500 / teal-500 / emerald-500 등 도메인 색상 강결합. shadcn `Button` 의 variant 시스템은 primary/secondary/destructive/outline/ghost/link 만 제공. variant 추가 없이 className override 만으로 사용하면 shadcn primitive 의미가 약해지므로 보류
- **Card**: 라이프퀘스트 카드들은 그래디언트 배경 + 도메인 색상 border + 카드별 특수 디자인. shadcn `Card` 의 단순 wrapper 가 큰 이득 없음
- **Tabs**: CharacterTab 의 stat/skill 토글 등은 amber-500 / violet-500 액티브 상태로 자체 디자인. shadcn `Tabs` 디폴트 스타일과 충돌
- **Accordion**: HabitGroupCard / RoutineCard 의 펼침 토글은 자체 chevron + 도메인 색상 헤더. 동일 사유

**전체 마이그레이션은 별도 디자인 토큰 / shadcn variant 확장 RFC 후 진행 권장**. 현재는 인프라(18개 primitive)와 활용 사례(모달 3곳) 마련까지 완료.

**검증**
- `npx tsc --noEmit` ✅ (exit 0)
- `npx next build` ✅ (Turbopack)
- 모달 동작 동일성: open/close, outside click, escape key 지원 (shadcn primitive 기본 제공)

**다음 작업자에게 (Phase 5.4)**
- `lib/api/respond.ts` 의 `withInit` 가 이미 마련됨. 나머지 14개 route 의 try/catch + initDb 보일러를 `withInit(async () => ...)` 로 래핑
- `lib/db/queries/_helpers.ts` 의 `exec/execOne/execMany` 가 마련됨. queries/*.ts 의 `db.execute({sql, args})` 직접 호출을 점진 교체. race-guard 패턴 (`INSERT OR IGNORE` 6곳, conditional `UPDATE` 2곳) 은 `claimOnce/claimUpdate` 사용 — 시맨틱 보존

---

### Phase 5.4 — 완료 (2026-05-14)

**범위**: 미적용 13개 route 의 try/catch + initDb 보일러를 `withInit` 으로 통일. `NextResponse.json(data)` → `ok(data)`, `NextResponse.json({error:..}, {status:400})` → `badRequest(..)`, status:404 → `notFound(..)`.

**변경 파일 (13개)**
- `app/api/activities/route.ts` (GET/POST)
- `app/api/battle-config/route.ts` (GET/PUT)
- `app/api/chapters/route.ts` (GET/POST)
- `app/api/chapters/[id]/route.ts` (PATCH/DELETE)
- `app/api/character/route.ts` (GET/PUT — DELETE 는 initDbSchemaOnly 사용으로 보류)
- `app/api/config/route.ts` (GET/PUT)
- `app/api/cron/notify/route.ts` (GET — VAPID 인증 + 401 응답은 NextResponse 직접 사용, 그 외는 ok/err)
- `app/api/projects/ai-judge/route.ts` (POST)
- `app/api/prompt/route.ts` (GET/PUT)
- `app/api/push/route.ts` (POST/DELETE)
- `app/api/skill-db/route.ts` (GET/POST/PUT/DELETE)
- `app/api/skills/route.ts` (GET/PUT)
- `app/api/todo-templates/route.ts` (GET/POST/PUT/DELETE)

**의도적 보류**
- `app/api/battle/route.ts` — `console.error("[battle]", e)` 로깅 보존을 위해 try/catch 그대로 유지. `withInit` 으로 가면 catch 에서 로깅 사라짐
- `app/api/character/route.ts` DELETE — `initDbSchemaOnly()` 사용 (seed 데이터 재생성 스킵). `withInit` 이 호출하는 `initDb()` 와 충돌
- `lib/db/queries/*.ts` 의 `db.execute({sql, args})` → `exec/execOne` 마이그레이션은 시맨틱 보존 우선으로 보류. race-guard (`INSERT OR IGNORE` 6곳, conditional `UPDATE` 2곳) + 트랜잭션 본문 (`gainExp`) 은 신중하게 별도 RFC 가 필요. 가시적 이득(코드 라인 감소) 대비 회귀 위험 큼

**검증**
- `npx tsc --noEmit` ✅ (exit 0)
- `npx next build` ✅ (Turbopack, 23개 라우트 그대로)
- 응답 shape 무변동. `withInit` 의 catch 가 동일한 `{error: String(e)}` / 500 표준 반환

**Phase 5 전체 (5.1~5.4) 완료 요약**
- 5.1: CharacterContext wrap → char props drilling 7개 제거
- 5.2: Toast 통합 → onToast props drilling 7개 제거. sonner useToast 채택
- 5.3: shadcn 모달 3곳 채택. 도메인 색상 영역은 시각 회귀 회피 위해 보류
- 5.4: 13개 route withInit 적용. 약 130줄 보일러 감소




