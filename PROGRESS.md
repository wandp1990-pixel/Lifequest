# Life Quest — 마이그레이션 진행 기록

## 작업 개요

Streamlit(Python) 앱을 **Next.js + TypeScript** 앱으로 마이그레이션.
UI는 v0에서 만든 프로토타입(`UIUX(v0)/`) 기반.

---

## 현재 상태 (2026-04-25 기준)

### 완료
- [x] `UIUX(v0)/` 폴더를 실제 앱으로 전환
- [x] `lib/db.ts` — Turso DB 연결 + 전체 쿼리 (Python `db.py` 완전 포팅)
  - `clear_count` 컬럼 추가 + `initDb()`에서 ALTER TABLE 마이그레이션 (기존 DB 자동 대응)
- [x] `lib/game.ts` — EXP/레벨업 로직 (Python `game_service.py` 포팅)
- [x] `lib/ai.ts` — Gemini 1.5 Flash AI 판정 (Python `ai_service.py` 포팅)
- [x] `lib/battle.ts` — 전투 엔진 (questmaster 프로토타입에서 포팅)
  - 몬스터 생성: 7등급(C~UR) × 7종족 가중치 랜덤, clear_count + 레벨 스케일링
  - 전투 시뮬레이션: 명중/회피/치명타/더블어택/흡혈 공식, 최대 30턴
  - 장비 옵션 파싱: `{"물리 공격력": 15}` → 전투 스탯 보너스 적용
- [x] API 라우트 5개
  - `GET /api/character` — 캐릭터 데이터 + 다음 레벨 EXP
  - `POST /api/activities` — 활동 입력 → AI 판정 → EXP 지급
  - `GET/POST /api/checklist` — 데일리 체크리스트
  - `GET/POST/PATCH /api/inventory` — 장비 조회 / 가챠 / 장착·삭제
  - `POST /api/battle` — 전투 실행 → EXP + 뽑기권 지급 + clear_count 증가
- [x] UI 5탭 완성 (BottomNav 5탭으로 확장 — Swords 아이콘 추가)
  - 데일리 탭: 체크리스트 항목 표시, 체크 시 EXP 지급
  - 할 일 탭: 활동 텍스트 입력 → Gemini AI 판정 → EXP 지급
  - **전투 탭**: 로비(스탯 확인) → 전투 실행 → 결과(VS 패널 + 로그) / 라이프퀘스트 라이트 테마 적용
  - 아이템 탭: 장비 목록 표시, 가챠(뽑기권 소비), 장착/삭제
  - 메뉴 탭: 캐릭터 스탯 표시
- [x] Vercel 배포 완료 — https://lifequest-bice.vercel.app

### 미완성
- [ ] 스킬 시스템 UI (skill_points 투자 화면)
- [ ] 설정 페이지 (game_config 수치 편집)
- [ ] 데일리 항목 추가/편집 (현재 고정 4개)

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| 프레임워크 | Next.js 16 + TypeScript + React 19 |
| UI | shadcn/ui + Tailwind CSS |
| DB | Turso (libsql) — `@libsql/client` |
| AI | Google Gemini 1.5 Flash — `@google/generative-ai` |
| 패키지 매니저 | pnpm (`~/.local/bin/pnpm`) |
| 배포 | Vercel (Root Directory: `UIUX(v0)`) |
| Git remote | https://github.com/wandp1990-pixel/Lifequest.git |

---

## 폴더 구조

```
lifequest/
├── UIUX(v0)/                  ← Next.js 앱 (메인 작업 폴더)
│   ├── app/
│   │   ├── page.tsx           ← 메인 페이지 (4탭 레이아웃)
│   │   ├── layout.tsx
│   │   └── api/
│   │       ├── character/route.ts
│   │       ├── activities/route.ts
│   │       ├── checklist/route.ts
│   │       └── inventory/route.ts
│   ├── components/game/
│   │   ├── TopHeader.tsx
│   │   ├── CharacterPanel.tsx  ← HP/MP/EXP 바
│   │   ├── LevelBar.tsx        ← 레벨 + EXP% + 뽑기권
│   │   ├── QuestBanner.tsx     ← 퀘스트 진행도
│   │   ├── BottomNav.tsx       ← 하단 5탭바 (데일리/할일/전투/아이템/메뉴)
│   │   ├── DailiesTab.tsx      ← 체크리스트 (DB 연결됨)
│   │   ├── TodosTab.tsx        ← AI 활동 입력 (DB 연결됨)
│   │   ├── BattleTab.tsx       ← 전투 탭 (DB 연결됨)
│   │   └── ItemsTab.tsx        ← 가챠 + 장비 (DB 연결됨)
│   ├── lib/
│   │   ├── db.ts              ← Turso DB 레이어 (clear_count 포함)
│   │   ├── game.ts            ← EXP/레벨업 로직
│   │   ├── battle.ts          ← 전투 엔진 (몬스터 생성 + 턴 시뮬레이션)
│   │   └── ai.ts              ← Gemini API
│   ├── .env.local             ← API 키 (git 제외)
│   └── package.json
├── lifequest.env              ← Vercel 환경변수 import용 (배포 후 삭제)
├── CLAUDE.md                  ← Claude Code 지시사항
├── PROGRESS.md                ← 이 파일
└── (Python 파일들)             ← 구 Streamlit 앱 (참고용)
```

---

## 환경변수

`.env.local` (로컬) 및 Vercel 환경변수에 아래 3개 필요:

```
TURSO_URL=libsql://lifequest-wandp1990-pixel.aws-ap-northeast-1.turso.io
TURSO_AUTH_TOKEN=<토큰 — .streamlit/secrets.toml 참고>
GEMINI_API_KEY=<키 — .streamlit/secrets.toml 참고>
```

---

## DB 현황

Turso 클라우드 DB 상태:
- `game_config` — 37행 (Python 앱이 로컬 SQLite로만 실행되다가 일부 데이터 마이그레이션됨)
- `character` — 1행 (Next.js 앱 첫 실행 시 자동 시드)
- `checklist_item` — 4행 (약 복용/물 2L/스트레칭/일기 쓰기, 자동 시드)
- `equipment` — 0행 (가챠로 획득)
- `activity_log` — 테스트 데이터 있음

**주의:** `initDb()`는 앱 첫 API 호출 시 실행되며 누락된 필수 데이터를 자동 시드함.

---

## 개발 서버 실행

```bash
cd "/mnt/c/Users/wandp/OneDrive/바탕 화면/지헌/lifequest/UIUX(v0)"
~/.local/bin/pnpm run dev
# → http://localhost:3000
```

---

## 다음 작업 목록

1. **스킬 시스템 UI** — skill_points 투자 화면 (skill_table DB 연결)
2. **설정 페이지** — game_config 수치 편집 UI
3. **데일리 항목 추가/편집** — 현재 고정 4개, 사용자가 추가할 수 있게

---

## 참고: Python → TypeScript 매핑

| Python 파일 | TypeScript 파일 |
|-------------|----------------|
| `database/db.py` | `lib/db.ts` ✅ |
| `services/game_service.py` | `lib/game.ts` ✅ |
| `services/ai_service.py` | `lib/ai.ts` ✅ |
| `services/battle_service.py` | `lib/battle.ts` ✅ |
| `services/item_service.py` | `app/api/inventory/route.ts` ✅ (인라인 구현) |
| `pages/1_activity.py` | `components/game/TodosTab.tsx` ✅ |
| `pages/2_character.py` | `app/page.tsx` 메뉴탭 ✅ (기본) |
| `pages/3_battle.py` | `components/game/BattleTab.tsx` ✅ |
| `pages/4_inventory.py` | `components/game/ItemsTab.tsx` ✅ |
| `pages/5_settings.py` | ❌ 미완성 |
