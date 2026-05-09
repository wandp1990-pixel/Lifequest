# LifeQuest Architecture Guide

**Last updated:** 2026-05-09  
**Project:** lifequest/UIUX(v0) — Next.js 16 + TypeScript + Turso  
**Deploy:** Vercel (main branch auto-deploy)

---

## 📦 Directory Structure Map

```
lib/
├── db/                          # 🗄️ Database layer (Turso)
│   ├── client.ts               # DB 연결 관리
│   ├── schema.ts               # 테이블 정의 + 초기화
│   ├── seed.ts                 # 초기 데이터
│   ├── types.ts                # 타입 정의 (Character 등)
│   ├── index.ts                # 모든 함수 재내보내기
│   └── queries/                # 도메인별 쿼리
│       ├── character.ts        # 캐릭터 스탯, 레벨, EXP
│       ├── checklist.ts        # 데일리 습관 (체크리스트)
│       ├── todo.ts             # 할일 목록
│       ├── activity.ts         # 활동 로그
│       ├── equipment.ts        # 장비, 가챠, 인벤토리
│       ├── items.ts            # 아이템 등급, 슬롯, 능력치풀
│       ├── routine.ts          # 루틴 (주간/월간)
│       ├── chapter.ts          # 챕터 진행도
│       ├── battle.ts           # 전투 기록
│       ├── config.ts           # 게임 설정, 전투 설정
│       ├── prompt.ts           # AI 프롬프트
│       ├── skills.ts           # 스킬 시스템
│       ├── attendance.ts       # 출석 체크
│       └── push.ts             # 푸시 알림 구독
│
├── ai.ts                        # 🤖 Gemini AI 판정 (활동 → EXP)
├── game.ts                      # 🎮 게임 로직 (레벨업, 회복)
├── battle.ts                    # ⚔️ 전투 시스템
├── regen.ts                     # 💚 HP/MP 재생 로직
└── utils.ts                     # 🛠️ 공용 유틸

app/
├── layout.tsx                   # 전역 레이아웃 (Tailwind, 메타)
├── page.tsx                     # 메인 페이지 (Bottom Nav + 4탭)
└── api/                         # 🔌 API 라우트 (Next.js App Router)
    ├── character/               # GET/PUT 캐릭터 스탯
    ├── checklist/               # GET/POST/PUT/DELETE 데일리
    ├── todos/                   # GET/POST/PATCH/DELETE 할일
    ├── activities/              # GET 최근 활동 로그
    ├── battle/                  # POST 전투 처리
    ├── inventory/               # GET/POST/PATCH 장비 + 가챠
    ├── equipment/               # 장비 관련
    ├── config/                  # GET/PUT 게임 설정
    ├── prompt/                  # GET/PUT AI 프롬프트
    ├── skills/                  # 스킬 시스템 API
    ├── routine/                 # 루틴 관리
    ├── chapters/                # 챕터 진행
    ├── projects/                # 프로젝트 (대형 퀘스트)
    ├── attendance/              # 출석 체크
    ├── push/                    # 푸시 알림
    ├── quest/                   # 퀘스트 리워드
    ├── battle-config/           # 전투 설정 조회
    ├── skill-db/                # 스킬 데이터베이스
    └── cron/                    # 정기 작업 (알림, 패널티 등)

components/
└── game/                        # 🎨 UI 컴포넌트
    ├── page.tsx                # 메인 페이지 로직
    ├── TopHeader.tsx           # 상단 타이틀 + 메뉴
    ├── SettingsDrawer.tsx      # 설정 드로어
    ├── CharacterPanel.tsx      # HP/MP/EXP 바
    ├── LevelBar.tsx            # 레벨 + 뽑기권
    ├── QuestBanner.tsx         # 데일리 완료 배너
    ├── BottomNav.tsx           # 4탭 하단 네비
    ├── TasksTab.tsx            # 데일리 + 할일 통합
    ├── HomeTab.tsx             # 활동 입력
    ├── BattleTab.tsx           # 전투
    ├── ItemsTab.tsx            # 아이템 + 가챠
    └── ...                     # 세부 컴포넌트

```

---

## 🔄 Data Flow Examples

### 예시 1: 데일리 완료 → EXP 획득

```
UI (TasksTab.tsx)
  ↓ [체크리스트 항목 클릭]
  ↓
API (/api/checklist) POST
  ↓ [AI 판정 요청]
  ↓
lib/ai.ts: judgeActivity()
  ↓ [EXP 반환]
  ↓
lib/game.ts: gainExp()
  ↓ [레벨업? → 스탯 지급]
  ↓
lib/db/queries/checklist.ts
  ↓ [DB 업데이트: 완료 시간, 스트릭 등]
  ↓
lib/db/queries/character.ts
  ↓ [캐릭터 스탯 저장]
  ↓
Response → UI 반영
```

### 예시 2: 새로운 기능 추가 (예: 보스 레이드)

1. **DB 스키마 추가**
   - `lib/db/schema.ts` → 테이블 정의
   - `lib/db/queries/boss-raid.ts` 새 파일 생성
   - `lib/db/index.ts` → export 추가

2. **비즈니스 로직**
   - `lib/battle.ts` → 보스 전투 로직 추가
   - `lib/game.ts` → 보스 보상 로직 추가

3. **API 라우트**
   - `app/api/boss-raid/route.ts` 생성

4. **UI 컴포넌트**
   - `components/game/BossRaidTab.tsx` 생성
   - `app/page.tsx` → 탭 등록

---

## 📋 File Responsibility Matrix

| 영역 | 파일 | 담당 |
|------|------|------|
| **DB 쿼리** | `lib/db/queries/*.ts` | SELECT/INSERT/UPDATE 쿼리 |
| **비즈니스 로직** | `lib/game.ts`, `lib/battle.ts` | EXP/레벨업/전투 계산 |
| **AI 판정** | `lib/ai.ts` | Gemini 호출 |
| **API** | `app/api/**/route.ts` | 요청/응답 처리 |
| **UI** | `components/game/*.tsx` | 화면 렌더링 + 사용자 입력 |

---

## 🚀 Key Patterns

### 1. API 요청 + DB 업데이트 (일반적)
```ts
// app/api/checklist/route.ts
export async function POST(req: Request) {
  const { id } = await req.json();
  
  // 1. AI 판정
  const { exp, comment } = await judgeActivity(text);
  
  // 2. 게임 로직
  const { leveledUp, ...result } = gainExp(exp);
  
  // 3. DB 저장
  await addChecklistLog(id, exp, comment);
  await updateCharacter({ current_exp: newExp, level: newLevel });
  
  // 4. 응답
  return Response.json({ result });
}
```

### 2. 캐릭터 스탯 조회
```ts
// components/game/page.tsx
useEffect(() => {
  const char = await fetch('/api/character').then(r => r.json());
  setCharacter(char);  // { level, current_exp, next_exp, hp, mp, ... }
}, []);
```

### 3. DB 계층 모듈화 (중요)
```ts
// lib/db/index.ts는 모든 쿼리를 재내보냄
export { 
  getCharacter, 
  updateCharacter 
} from "./queries/character"

// 사용처에서는 이렇게 import
import { getCharacter, updateCharacter } from '@/lib/db'
```

---

## 📖 How to Add a New Feature

1. **기획 단계**
   - DB 스키마 설계 → `lib/db/schema.ts` 수정
   - 비즈니스 로직 필요 여부 → `lib/game.ts` 또는 새 파일

2. **DB 구현**
   - `lib/db/queries/` 폴더에 새 파일 생성
   - 쿼리 함수 작성
   - `lib/db/index.ts`에 export 추가

3. **API 구현**
   - `app/api/[feature]/route.ts` 생성
   - GET/POST/PUT/DELETE 핸들러 작성
   - 에러 처리 + 응답 형식 통일

4. **UI 구현**
   - 기존 탭에 추가 또는 새 컴포넌트 생성
   - `page.tsx`에 탭 등록 (필요 시)

5. **테스트**
   - `curl https://lifequest-bice.vercel.app/api/[feature]`로 API 검증
   - UI에서 E2E 테스트

6. **배포**
   - `git add/commit/push`
   - Vercel 자동 배포 확인 (`vercel ls`)

---

## ⚙️ Important Config

- **DB:** Turso (libsql) + `lib/db/client.ts`
- **AI:** Gemini 1.5 Flash + `lib/ai.ts`
- **Styling:** Tailwind CSS
- **Types:** `lib/db/types.ts` (Character, SkillRow 등)
- **캐시:** HTML은 CDN 캐시, API는 fresh → API로 검증 필수

---

## 📚 Quick Reference

| 작업 | 파일 위치 |
|-----|---------|
| 캐릭터 스탯 수정 | `lib/db/queries/character.ts` |
| EXP/레벨업 로직 수정 | `lib/game.ts` |
| 데일리 완료 판정 수정 | `lib/db/queries/checklist.ts` + `lib/ai.ts` |
| 전투 시스템 수정 | `lib/battle.ts` + `lib/db/queries/battle.ts` |
| 게임 설정값 추가 | `lib/db/schema.ts` (game_config 테이블) |
| UI 추가/수정 | `components/game/` + `app/page.tsx` |
| 새 API 만들기 | `app/api/[feature]/route.ts` |
