# 라이프퀘스트 구현 명세 (2026-05-05)

**지금 코드 기준으로 작성된 현재 시스템 명세서**

---

## 1. 시스템 개요

### 스택
- **프레임워크**: Next.js 16 (App Router) + React 19
- **언어**: TypeScript
- **스타일**: Tailwind CSS
- **데이터베이스**: Turso (libsql)
- **AI**: Google Gemini 1.5 Flash
- **배포**: Vercel (UIUX(v0) root)
- **라이브러리**: 
  - `@libsql/client` (DB)
  - `@google/generative-ai` (AI)
  - `lucide-react` (아이콘)

### 환경변수
- `TURSO_URL`: Turso 데이터베이스 URL
- `TURSO_AUTH_TOKEN`: Turso 인증 토큰
- `GEMINI_API_KEY`: Google Gemini API 키

---

## 2. 탭 구조 (메인 네비게이션)

**5개 탭 + 하단 네비게이션 (`BottomNav`)**

| 탭 ID | 한글명 | 컴포넌트 | 설명 |
|---|---|---|---|
| `home` | 홈 | `HomeTab` | 오늘의 활동 입력 + 최근 로그 |
| `tasks` | 할일 | `TasksTab` | 데일리 + 투두 통합 관리 |
| `battle` | 전투 | `BattleTab` | 몬스터 전투 시뮬레이션 |
| `skills` | 캐릭터 | `SkillsTab` / `CharacterTab` | 스킬 + 캐릭터 정보 |
| `items` | 아이템 | `ItemsTab` | 가챠 뽑기 + 장비 관리 |

**기본 탭**: `home`

---

## 3. 캐릭터 시스템

### CharacterData 구조

```typescript
{
  name: string
  level: number
  total_exp: number
  next_exp: number (=nextLevelExp - currentExp)
  
  // HP/MP
  current_hp: number
  max_hp: number
  current_mp: number
  max_mp: number
  
  // 스탯 (기본)
  str: number          // 물리공격력
  vit: number          // 생명력 → maxHP
  dex: number          // 회피
  int_stat: number     // 마법공격력
  luk: number          // 행운
  
  // 포인트/자원
  stat_points: number
  skill_points: number
  draw_tickets: number  // 가챠 뽑기권
  clear_count: number   // 클리어한 전투 횟수
  task_count: number    // 완료한 할일 수
  
  // 회복 시스템
  last_regen_at?: string | null  // 마지막 회복 시간
  
  // 계산된 스탯 (아이템 보너스 포함)
  effective?: {
    patk, matk, pdef, mdef, dex, luk, vit, int
    max_hp, max_mp
    crit_rate, accuracy_bonus, evasion_bonus
    double_attack, life_steal, def_ignore, reflect  // 특수 능력
  }
  item_stat_bonuses?: { str, vit, dex, int_stat, luk }
  max_cleared_grade?: string | null
}
```

### EXP/레벨업 로직
- `/api/character` GET으로 현재 EXP 진행도 조회
- 활동 완료 → AI 판정 → EXP 획득 → 자동 레벨업 처리
- 레벨업 시: stat_points/skill_points 지급, draw_tickets 1장 지급, HP/MP 풀 회복

### 회복 시스템
- `lib/regen.ts`의 `calcRegen()` 함수
- 분당 10% + (stat/10)의 빠른 회복
- 마지막 회복 시간 기반으로 계산

---

## 4. API 라우트

### 캐릭터
| 라우트 | 메서드 | 기능 |
|---|---|---|
| `/api/character` | GET | 캐릭터 정보 + next_exp 반환 |
| `/api/character` | PUT | 스탯 직접 편집 |
| `/api/character` | DELETE | 캐릭터 초기화 (스키마 리셋) |

### 할일 시스템
| 라우트 | 메서드 | 기능 |
|---|---|---|
| `/api/checklist` | GET | 데일리 목록 조회 |
| `/api/checklist` | POST | 데일리 완료 (AI 판정 + EXP + task_count++) |
| `/api/checklist` | PUT | 데일리 항목 추가 |
| `/api/checklist` | DELETE | 데일리 항목 삭제 |
| `/api/todos` | GET | 투두 목록 조회 |
| `/api/todos` | POST | 투두 항목 추가 |
| `/api/todos` | PATCH | 투두 완료 (AI 판정 + EXP + task_count++) |
| `/api/todos` | DELETE | 투두 항목 삭제 |

### 활동 로그
| 라우트 | 메서드 | 기능 |
|---|---|---|
| `/api/activities` | GET | 최근 활동 로그 (`?type=ai&limit=5`) |
| `/api/activities` | POST | 활동 직접 입력 → AI 판정 |

### 게임 설정
| 라우트 | 메서드 | 기능 |
|---|---|---|
| `/api/config` | GET | 모든 게임 설정 (key/value/description) |
| `/api/config` | PUT | 단일 설정 값 업데이트 |
| `/api/prompt` | GET | AI 판정 프롬프트 내용 |
| `/api/prompt` | PUT | AI 프롬프트 수정 (DB 저장) |

### 전투 시스템
| 라우트 | 메서드 | 기능 |
|---|---|---|
| `/api/battle` | POST | 전투 처리 (히트율/회피 계산 포함) |
| `/api/battle-config` | GET | 전투 설정 조회 |
| `/api/chapters` | GET | 챕터 목록 |
| `/api/chapters` | POST | 챕터 추가/수정 |

### 아이템 시스템
| 라우트 | 메서드 | 기능 |
|---|---|---|
| `/api/inventory` | GET | 보유 장비 목록 |
| `/api/inventory` | POST | 가챠 뽑기 (draw_tickets 소비) |
| `/api/inventory` | PATCH | 장비 장착/해제/삭제 |
| `/api/skill-db` | GET | 스킬 데이터베이스 |
| `/api/skill-db` | POST | 스킬 추가/수정 |
| `/api/skills` | GET | 보유 스킬 목록 |
| `/api/skills` | PUT | 스킬 수정 |

### 루틴 시스템
| 라우트 | 메서드 | 기능 |
|---|---|---|
| `/api/routines` | GET | 루틴 목록 |
| `/api/routines` | POST | 루틴 추가 |

### 출석 & 알림
| 라우트 | 메서드 | 기능 |
|---|---|---|
| `/api/attendance` | GET | 출석 정보 |
| `/api/attendance` | POST | 출석 처리 |
| `/api/push` | POST | 푸시 알림 구독 |
| `/api/push` | DELETE | 푸시 알림 구독 해제 |

---

## 5. 주요 컴포넌트

### TopHeader
- 좌측: 햄버거 메뉴 (SettingsDrawer 열기)
- 중앙: 현재 탭 제목
- 우측: 공백 (확장 예약)

### CharacterPanel
- HP/MP 바 표시
- 현재/최대 값 표시

### QuestBanner
- `activeTab !== "home"` 일 때만 표시
- 데일리 완료 진행도 (progress/questTotal)
- 50 EXP 보상 표시

### SettingsDrawer
- **캐릭터 수치 편집**: 모든 기본 스탯 + 포인트/EXP 직접 편집
- **게임 설정 에디터**: game_config의 모든 항목 인라인 편집
- 배경 탭 시 닫힘

### TasksTab
- 상단: 데일리 섹션 (checklist_item)
- 하단: 투두 섹션 (todo_item)
- 각 섹션: + 버튼으로 항목 추가
- 항목 탭 → AI 판정 → EXP 획득
- X 버튼 → 삭제 확인 바텀시트
- 하단: AI 프롬프트 편집, 최근 로그 5개

### HomeTab
- 텍스트 입력 → AI 판정 → EXP 획득
- 최근 5개 활동 로그 표시

### BattleTab
- 몬스터 선택 및 전투 시뮬레이션
- 승패 결정 (히트율/회피 계산)
- 전투 후 EXP 및 draw_tickets 획득

### ItemsTab
- 가챠 배너 (draw_tickets 표시)
- 장비 그리드 (장착/해제/삭제 버튼)
- 가챠 결과 인라인 표시

### SkillsTab / CharacterTab
- 스킬 시스템 (skill_table / skill_log)
- 캐릭터 기본 정보

### BottomNav
- 4~5개 탭 선택
- tasks 탭에 task_count 배지 표시

---

## 6. 데이터베이스 테이블

| 테이블 | 설명 |
|---|---|
| `character` | 캐릭터 (1행 고정, id=1) |
| `checklist_item` | 데일리 항목 |
| `todo_item` | 투두 항목 |
| `activity_log` | 활동 기록 (input_type: daily/todo/ai) |
| `prompt` | AI 프롬프트 (category='general') |
| `game_config` | 게임 수치 설정 (37개 항목) |
| `battle_config` | 전투 수치 설정 |
| `chapter_table` | 챕터 정보 |
| `monster_table` | 몬스터 데이터 (10종 이상) |
| `equipment` | 보유 장비 |
| `item_grade_table` | 등급별 확률/스탯범위 |
| `item_slot_table` | 장비 슬롯 |
| `item_ability_pool` | 능력치 풀 |
| `item_passive_pool` | 패시브 능력 풀 |
| `skill_table` | 스킬 정의 |
| `skill_log` | 보유 스킬 레코드 |
| `attendance` | 출석 기록 |
| `routine_table` | 루틴 설정 |

---

## 7. AI 시스템

### 프로세스
1. 사용자가 활동/할일 완료 입력
2. `/api/activities` POST 또는 `/api/checklist` POST 호출
3. `lib/ai.ts`의 `judgeActivity(text)` 실행
4. Google Gemini 1.5 Flash로 프롬프트 기반 판정
5. EXP + 코멘트 반환
6. activity_log 기록, character 업데이트

### 프롬프트 관리
- DB의 `prompt` 테이블에서 읽음 (`category='general'`)
- `/api/prompt` PUT으로 수정 가능
- 재배포 불필요 (DB 저장)

---

## 8. 주요 라이브러리

| 라이브러리 | 용도 |
|---|---|
| `@libsql/client` | DB 쿼리 |
| `@google/generative-ai` | Gemini AI 호출 |
| `lucide-react` | 아이콘 (User, CheckSquare, Sword, Package 등) |
| `react-hot-toast` | 토스트 알림 |

---

## 9. 특이사항 & 주의

- **DB 스키마**: initDb() 호출 시 자동 생성 + 마이그레이션
- **파일 구조**:
  - `lib/db.ts`: 모든 DB 쿼리 함수
  - `lib/game.ts`: EXP/레벨업/회복 로직
  - `lib/ai.ts`: Gemini 판정 로직
  - `lib/regen.ts`: 회복 계산
  - `app/api/`: RESTful API 라우트
  - `components/game/`: UI 컴포넌트
- **activity_log 보관**: 최대 30개 (초과 시 자동 삭제)
- **TypeScript 설정**: `next.config.mjs`에서 `ignoreBuildErrors: true`

---

## 10. 배포 및 버전

- **GitHub**: `wandp1990-pixel/Lifequest` (main 브랜치)
- **Vercel**: 자동 배포 (webhook)
- **배포 주의**:
  - 새 파일 생성 후 즉시 `git add/commit/push`
  - push 후 2분 내 `npx vercel ls` 로 새 URL 확인
  - webhook 미트리거 시 빈 커밋으로 재트리거
  - 환경변수는 Vercel 대시보드에서 설정 (`.env` 파일 git 제외)

---

**작성일**: 2026-05-05  
**기반**: Next.js 코드 + API 라우트 분석  
**대상**: 신규 개발자 온보딩 및 시스템 이해도 향상
