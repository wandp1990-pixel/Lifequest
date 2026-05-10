# LifeQuest MAP

이 문서는 **지도**다. 어디에 무엇이 있는지만 알려준다. 자세한 동작/수치는 명시된 파일을 직접 읽어라.

- **프로젝트 루트**: `lifequest/UIUX(v0)/` (Vercel 배포 단위)
- **상위 폴더의 다른 파일들**(`lifequest/main.py`, `pages/`, `services/` 등)은 구버전 Streamlit 시절 잔재 — 활성 코드 아님
- 디자인 디테일(hex, 이모지 매핑)은 `DESIGN_GUIDE.md`에 있음 — 이 문서에서는 포인터만 건다

---

## 1. 스택 한 줄 요약

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind · Turso(libsql) · Gemini 2.5 Flash · Vercel 자동배포

---

## 2. 디렉토리 지도

```
UIUX(v0)/
├── app/
│   ├── layout.tsx               # 전역 레이아웃
│   ├── page.tsx                 # 메인 셸 (탭 라우팅, 캐릭터 fetch)
│   ├── globals.css
│   └── api/                     # REST API → §5 모듈별 지도 참조
├── components/game/             # 모든 화면 컴포넌트 → §4 탭 지도
├── lib/
│   ├── db/
│   │   ├── client.ts            # Turso 연결
│   │   ├── schema.ts            # CREATE TABLE + 마이그레이션
│   │   ├── seed.ts              # 초기 데이터 (item, skill, prompt 등)
│   │   ├── types.ts             # Chapter, Project 등 도메인 타입
│   │   ├── index.ts             # 쿼리 재export 진입점
│   │   └── queries/             # 도메인별 쿼리 (§5)
│   ├── ai.ts                    # Gemini 판정 (judgeActivity, judgeProjectExp)
│   ├── game.ts                  # requiredExp / recalcHpMp / gainExp
│   ├── battle.ts                # generateMonster / runBattle / 패시브 계산
│   ├── regen.ts                 # calcRegen — HP/MP 시간 회복
│   └── utils.ts
├── public/                      # 정적 자산
├── styles/
├── ARCHITECTURE.md              # (deprecated, 삭제 예정)
├── IMPLEMENTATION_SPEC.md       # (deprecated, 삭제 예정)
├── DESIGN_GUIDE.md              # 색상/이모지 디테일 레퍼런스 (보존)
├── MAP.md                       # ← 이 파일
├── vercel.json
└── package.json
```

---

## 3. 데이터 흐름 (1패턴만 외워두면 됨)

```
UI(components/game/*.tsx)
  → fetch('/api/<feature>')
  → app/api/<feature>/route.ts
  → lib/<domain>.ts (게임 로직)  +  lib/db/queries/<domain>.ts (DB)
  → Response → UI 상태 갱신
```

새 기능 추가 순서: `schema.ts` → `queries/X.ts` → `api/X/route.ts` → `components/game/XTab.tsx` → `page.tsx`에 탭 등록.

---

## 4. 메인 탭 지도 (5개)

`app/page.tsx`의 `TabType = "home" | "tasks" | "battle" | "items" | "skills"`. 하단 네비는 `BottomNav.tsx`.

| 탭 | 컴포넌트 | 주요 API | 역할 |
|----|---------|---------|-----|
| home | `HomeTab.tsx` | `/api/activities`, `/api/attendance`, `/api/checklist`, `/api/todos`, `/api/routines`, `/api/projects` | 활동 입력 + 출석 + 4섹션 미니 도넛 |
| tasks | `TasksTab.tsx` (+ `ProjectsTab.tsx` 임베드) | `/api/checklist`, `/api/todos`, `/api/routines`, `/api/projects` | 루틴/습관/할일/프로젝트 통합 |
| battle | `BattleTab.tsx` | `/api/battle`, `/api/battle-config`, `/api/chapters` | 몬스터 전투 시뮬 |
| skills | `CharacterTab.tsx` (+ `SkillsTab.tsx`) | `/api/character`, `/api/skills`, `/api/skill-db` | 스탯 분배 + 스킬 |
| items | `ItemsTab.tsx` | `/api/inventory` | 가챠 + 장비 |

탭 외 공통 컴포넌트:
- `TopHeader.tsx` — 타이틀 + 햄버거(설정 드로어)
- `CharacterPanel.tsx` — HP/MP 바 (탭 무관 상단)
- `LevelBar.tsx` — 레벨/EXP/뽑기권 바
- `QuestBanner.tsx` — 데일리 진행도 (home 탭 외 표시)
- `SettingsDrawer.tsx` — 캐릭터 수치 직접 편집 + game_config 인라인 에디터
- `PushSetup.tsx` — 푸시 권한/구독 UI

---

## 5. 모듈별 지도

각 모듈마다 **DB 테이블 / 쿼리 파일 / API / 비즈니스 로직 / UI** 위치를 명시한다.

### 5.1 캐릭터 · EXP · 레벨업 · 회복

- **DB**: `character`(1행), `activity_log` (최대 30개 보존)
- **쿼리**: `lib/db/queries/character.ts`, `activity.ts`
- **로직**: `lib/game.ts` (`gainExp`, `recalcHpMp`, `requiredExp`), `lib/regen.ts` (`calcRegen`)
- **API**: `/api/character` (GET/PUT/DELETE), `/api/activities` (GET/POST)
- **UI**: `CharacterPanel.tsx`, `CharacterTab.tsx`, `LevelBar.tsx`, `SettingsDrawer.tsx`

레벨업 시 stat/skill points 지급, 뽑기권 +1, HP/MP 풀회복은 `gainExp` 안에서 처리.

### 5.2 데일리 — 습관(체크리스트)

- **DB**: `checklist_item`, `checklist_log`
- **쿼리**: `lib/db/queries/checklist.ts`
- **API**: `/api/checklist` (GET/POST/PUT/DELETE)
- **UI**: `TasksTab.tsx` 습관 섹션
- **AI 사용 안 함** (고정 EXP). streak/패널티 로직은 쿼리 파일에 있음.

### 5.3 데일리 — 루틴

- **DB**: `routine`, `routine_item`, `routine_log`, `routine_bonus_log`
- **쿼리**: `lib/db/queries/routine.ts`
- **API**: `/api/routines` (GET/POST)
- **UI**: `TasksTab.tsx` 루틴 섹션 (아코디언)
- **보상 산식 (의도된 디자인)**: 항목별 `fixed_exp` 1배 + 모든 항목 완수 시 합계만큼 추가 보너스. `deadline_time` 내 완료면 합계의 **2배** 추가 → 마감 외 총 **2배** / 마감 내 총 **3배** 적립. 루틴 완수 보상을 강하게 설계한 것이라 산식 변경 금지.
- **자정 넘김 마감**: `deadline_time < "06:00"`이고 `currentTimeKST() >= "18:00"`이면 통과(전날 저녁 시작 → 다음날 새벽 마감 의도). 그 외엔 `currentTimeKST() <= deadline_time`.

### 5.4 데일리 — 할 일(투두)

- **DB**: `todo_item`
- **쿼리**: `lib/db/queries/todo.ts`
- **API**: `/api/todos` (GET/POST/PATCH/PUT/DELETE)
- **UI**: `TasksTab.tsx` 할일 섹션
- 완료 시 `suggested_exp`가 0이면 AI 판정. 마감 내 완료 +50% 보너스.

### 5.5 프로젝트 (대형 퀘스트)

- **DB**: `project`, `project_task`
- **쿼리**: `lib/db/queries/project.ts`
- **API**: `/api/projects` (CRUD), `/api/projects/[id]` (단건), `/api/projects/[id]/tasks` (서브태스크), `/api/projects/ai-judge` (완료 EXP 판정)
- **로직**: `lib/ai.ts` `judgeProjectExp`
- **UI**: `ProjectsTab.tsx` (TasksTab 안에 임베드, 색상 violet)

### 5.6 챕터 (프로젝트 묶음 진행도)

- **DB**: `chapter`
- **쿼리**: `lib/db/queries/chapter.ts`
- **API**: `/api/chapters`, `/api/chapters/[id]`
- **UI**: `ProjectsTab.tsx` 상단 챕터 헤더

### 5.7 활동 로그 / AI 판정

- **DB**: `activity_log` (input_type: `daily` | `todo` | `ai`)
- **로직**: `lib/ai.ts` (Gemini 호출, 프롬프트는 `prompt` 테이블에서 동적 로드)
- **API**: `/api/activities`, `/api/prompt`
- **UI**: `HomeTab.tsx` 오늘의 활동 입력
- 프롬프트는 DB에 있어 재배포 없이 수정 가능 (`/api/prompt` PUT)

### 5.8 전투

- **DB**: `monster_table`, `battle_log`, `battle_config`, `chapter`(클리어 등급 추적)
- **쿼리**: `lib/db/queries/battle.ts`, `config.ts` (배틀 설정)
- **로직**: `lib/battle.ts` (`generateMonster`, `runBattle`, `buildPlayerCombatStats`, `computePassiveBonuses`)
- **API**: `/api/battle`, `/api/battle-config`, `/api/quest/reward`
- **UI**: `BattleTab.tsx`

### 5.9 아이템 · 장비 · 가챠

- **DB**: `equipment`, `item_grade_table`, `item_slot_table`, `item_ability_pool`, `item_passive_pool`
- **쿼리**: `lib/db/queries/equipment.ts`, `items.ts`
- **API**: `/api/inventory` (GET 보유 / POST 가챠 뽑기 / PATCH 장착·해제·삭제)
- **UI**: `ItemsTab.tsx`
- 등급: C/B/A/S/SR/SSR/UR — 슬롯: 무기/투구/갑옷/바지/벨트/장갑/신발/반지/목걸이

### 5.10 스킬

- **DB**: `skill_table`(정의 풀), `skill_log`(보유 인스턴스)
- **쿼리**: `lib/db/queries/skills.ts`
- **API**: `/api/skills` (GET/PUT 보유 스킬), `/api/skill-db` (정의 CRUD)
- **로직**: `lib/battle.ts` `computePassiveBonuses`, `getActiveSkills`
- **UI**: `SkillsTab.tsx`, `CharacterTab.tsx`
- 패시브(violet)와 액티브(purple) 구분 — DESIGN_GUIDE §4.9

### 5.11 출석

- **DB**: `attendance_log`
- **쿼리**: `lib/db/queries/attendance.ts`
- **API**: `/api/attendance` (GET/POST)
- **UI**: `HomeTab.tsx` 출석 카드 (스트릭, 마일스톤마다 뽑기권)

### 5.12 푸시 알림

- **DB**: `push_subscription`
- **쿼리**: `lib/db/queries/push.ts`
- **API**: `/api/push` (POST 구독 / DELETE 해제), `/api/cron/notify` (정기 알림 트리거)
- **UI**: `PushSetup.tsx` (`SettingsDrawer.tsx`에서 진입)
- 외부 cron-job.org에서 `/api/cron/notify`를 분 단위로 호출 (Hobby 플랜 Vercel Cron은 일 1회 제한이라 분 단위 알림은 외부 서비스 사용)
- Bearer 토큰: `CRON_SECRET` env로 검증

### 5.13 게임 설정 / 프롬프트

- **DB**: `game_config`(key/value/description), `prompt`
- **쿼리**: `lib/db/queries/config.ts`, `prompt.ts`
- **API**: `/api/config` (GET/PUT), `/api/prompt` (GET/PUT)
- **UI**: `SettingsDrawer.tsx` 인라인 에디터
- 모든 게임 수치는 DB에 있어 코드 수정 없이 튜닝 가능

---

## 6. DB 테이블 인덱스 (`lib/db/schema.ts`)

스키마 변경은 항상 이 파일에서. `IF NOT EXISTS` + 마이그레이션 로그(`migration_log`)로 런타임 진화.

| 테이블 | 한 줄 |
|------|-----|
| `character` | 캐릭터 (id=1 단일행) |
| `activity_log` | 활동 기록, 30개 cap |
| `checklist_item` / `checklist_log` | 습관 정의 / 완료 기록 |
| `todo_item` | 투두 |
| `routine` / `routine_item` / `routine_log` / `routine_bonus_log` | 루틴 그룹·하위·완료·보너스 |
| `project` / `project_task` | 프로젝트·서브태스크 |
| `chapter` | 프로젝트 묶음 진행도 |
| `equipment` | 보유 장비 (장착 여부 포함) |
| `item_grade_table` / `item_slot_table` / `item_ability_pool` / `item_passive_pool` | 아이템 메타·풀 |
| `skill_table` / `skill_log` | 스킬 정의 / 보유 |
| `monster_table` / `battle_log` / `battle_config` | 몬스터·전투 기록·전투 설정 |
| `prompt` | AI 프롬프트 (category 별) |
| `game_config` | 모든 게임 수치 (key/value) |
| `attendance_log` | 출석 |
| `push_subscription` | 웹푸시 구독 |
| `migration_log` | 스키마 마이그레이션 추적 |

---

## 7. 디자인 시스템 핵심 (디테일은 `DESIGN_GUIDE.md`)

### 탭별 테마색 (`BottomNav.tsx`)
home=emerald · tasks=amber · battle=red · skills=purple · items=sky

### TasksTab 섹션별 색 (의도적 분리, 통일하지 말 것)
루틴=teal · 습관=amber · 할일=violet · 프로젝트=violet

### 스탯 색 (`CharacterTab.tsx`)
STR=red · VIT=emerald · DEX=sky · INT=violet · LUK=amber  
아이콘은 모두 **lucide-react** (`Sword`/`Heart`/`Wind`/`Brain`/`Star`)

### 등급 색 (아이템과 몬스터가 다름)
- 아이템: C회색 / B초록 / A파랑 / S주황 / SR보라 / SSR금 / UR핫핑크
- 몬스터: 위협감 강조용 별도 팔레트 (DESIGN_GUIDE §4.2)

### 카드/패널 토큰
- DAILY QUEST 카드: `linear-gradient(135deg, #FFFAEF, #FFF1E0)` + `#FFE3C7` border
- HP=`#F58FA8` · MP=`#7FB3F5` · XP=`#F5C879`
- 성공/EXP 토스트=`bg-amber-400` · 패널티=`bg-red-400`

> 새 컴포넌트 만들기 전에 **DESIGN_GUIDE.md §10 체크리스트** 먼저 보기

---

## 8. 배포 · 외부 리소스

- **GitHub**: `wandp1990-pixel/Lifequest` (main 브랜치)
- **Vercel**: webhook 자동 배포 — 프로젝트 루트는 `UIUX(v0)/`
- **DB**: Turso — 환경변수 `TURSO_URL`, `TURSO_AUTH_TOKEN`
- **AI**: Gemini 2.5 Flash — `GEMINI_API_KEY`
- **Cron**: 외부 cron-job.org가 `/api/cron/notify`를 분 단위로 호출 (Bearer `CRON_SECRET`). Vercel Cron은 Hobby 플랜에서 일 1회 제한이라 미사용
- **배포 SOP**: `lifequest/DEPLOY_NOTES.md` 필독 (push 후 vercel ls 확인, webhook 미트리거 시 빈 커밋 재트리거)
- `vercel` CLI는 `lifequest/UIUX(v0)/` 루트에서만 실행

---

## 9. 이 문서의 사용법

1. **"X 기능 어디 있어?"** → §5에서 모듈 찾기 → 명시된 파일 직접 읽기
2. **"새 기능 추가"** → §3 흐름대로 schema → query → api → component
3. **"색깔/이모지 뭐 쓰지?"** → §7 요약 → `DESIGN_GUIDE.md` 디테일
4. **"DB 어떤 테이블?"** → §6 인덱스 → `lib/db/schema.ts` 직접
5. **"배포가 안 보여"** → §8 + `DEPLOY_NOTES.md`

이 문서는 **코드의 네비게이션 인덱스**다. 코드가 진실의 원천(SoT)이므로, 이 지도와 코드가 충돌하면 코드를 믿고 이 문서를 갱신하라.
