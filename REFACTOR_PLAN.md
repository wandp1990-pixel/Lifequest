# LifeQuest 모듈화 리팩토링 마스터 플랜

> **이 문서는 LifeQuest 리팩토링의 단일 출처입니다. 작업 시작 전 반드시 이 문서를 읽고, 작업 완료 후 진행 상황 트래커를 업데이트하세요.**

---

## 진행 상황 트래커

체크박스: `[ ]` 미완료 / `[~]` 진행 중 / `[x]` 완료

### Phase 0 — 준비
- [x] 마스터 플랜 작성 (2026-05-13)
- [ ] `git tag pre-refactor-baseline` 찍기 (Phase 1 시작 직전)
- [ ] 핵심 시나리오 5개 baseline 응답 캡처 (`verification/baseline/*.json`)

### Phase 1 — 상수/시간 헬퍼 추출 (위험도 0)
- [x] 1.1 `lib/constants/{exp,battle,gacha,ai,time,quest,ui}.ts` 7개 파일 작성 (2026-05-13)
- [x] 1.2 `lib/time/kst.ts` 생성 + queries/checklist·routine의 로컬 시간 함수 통합 (2026-05-13)
- [x] 1.3 UI 색상 상수 추출 (`ItemsTab`, `ProjectsTab`, `CharacterPanel`) (2026-05-13)
- [x] 1.4 typecheck + build + 시나리오 검증 (2026-05-13)

### Phase 2 — DB 헬퍼 & 비즈니스 로직 추출
- [ ] 2.1 `lib/db/queries/_helpers.ts` 작성
- [ ] 2.2 `lib/game/exp-bonus.ts` 순수 함수 작성
- [ ] 2.3 `lib/game/rewards.ts` `applyReward()` 작성
- [ ] 2.4 `lib/api/respond.ts`, `validate.ts` 작성
- [ ] 2.5 `lib/game/gacha.ts` 순수 로직 분리
- [ ] 2.6 route.ts 리팩토링 (todos → checklist → routines → projects → inventory → 나머지)
- [ ] 2.7 시나리오 5개 baseline diff 검증

### Phase 3 — UI Primitives & Hooks
- [ ] 3.1 `npx shadcn@latest init` + primitives 추가
- [ ] 3.2 `hooks/useApi.ts` 작성
- [ ] 3.3 도메인 훅 6개 작성 (`useChecklist` → `useRoutines` → `useTodos` → `useProjects` → `useCharacter` → `useMidnightRefresh`)
- [ ] 3.4 `ToastContext` + `CharacterContext` 도입
- [ ] 3.5 각 탭 수동 UX 테스트

### Phase 4 — God Component 분할
- [ ] 4.1 SettingsDrawer (1308줄) → 8개 panel 분할
- [ ] 4.2 ProjectsTab (989줄) → 5개 파트 분할
- [ ] 4.3 HabitSection (552줄) + RoutineSection (538줄) 분할
- [ ] 4.4 CharacterTab, BattleTab, ItemsTab, HomeTab 분할
- [ ] 4.5 모든 컴포넌트 < 250줄 확인

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
