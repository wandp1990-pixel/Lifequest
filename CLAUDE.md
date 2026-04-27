# Life Quest — 프로젝트 지시사항

## ⚠️ 배포 규칙 — 반드시 읽을 것

### 자동 배포 시스템 동작 방식
외부 watcher가 **수정된(modified) 파일만** 자동으로 `Auto-deploy:` 커밋 + push한다.  
**신규 파일(untracked)은 절대 자동 감지되지 않는다.**

### Write로 새 파일을 만든 즉시 — 다른 작업 전에 먼저 실행

```bash
cd "/mnt/c/Users/wandp/OneDrive/바탕 화면/지헌/lifequest/UIUX(v0)"
git add <새로 만든 파일 경로>
git commit -m "feat: ..."
git push
```

이 순서를 다음 코딩 작업으로 넘어가기 전에 완료할 것.  
나중으로 미루면 반드시 누락된다. 2회 이상 같은 실수 발생.

### 작업 완료 보고 전 검증 4단계

1. `git status` — untracked 파일 0개 확인
2. `vercel ls` — 최신 Production이 `Ready` (Building/Error 아님)
3. `git log --oneline -3` — 모든 변경이 커밋에 포함됐는지 확인
4. API route로 동작 검증: `curl https://lifequest-bice.vercel.app/api/<route>`  
   (HTML 페이지는 CDN 캐시로 stale일 수 있어 신뢰 불가)

### 기타
- 코드 **수정만** 한 경우 → 직접 git 작업 금지. 자동 배포에 맡길 것.
- 사용자가 "그대로다/변경 안 보인다" 보고 시 → 캐시 탓 금지. 즉시 `vercel ls` 확인.
- Vercel 팀: `wandp1990-8450s-projects` / alias: `https://lifequest-bice.vercel.app/`
- GitHub: `https://github.com/wandp1990-pixel/Lifequest.git` (main 브랜치 → Vercel 자동 배포)

---

## 프로젝트 개요

개인용 AI 게이미피케이션 앱. AI(Gemini)가 GM 역할로 일상 활동을 EXP로 변환.

- **작업 디렉토리**: `/mnt/c/Users/wandp/OneDrive/바탕 화면/지헌/lifequest/UIUX(v0)/`
- **스택**: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **DB**: Turso (libsql) — `@libsql/client`
- **AI**: Google Gemini 1.5 Flash
- **배포**: Vercel (root directory = `UIUX(v0)`, main 브랜치 push → 자동 배포)
- **개발 서버**: `cd UIUX(v0) && ~/.local/bin/pnpm run dev`

## 코딩 원칙

- 게임 수치는 모두 DB `game_config` / `battle_config` 테이블에서 로드 — 하드코딩 금지
- DB 쿼리는 `lib/db/` 함수만 호출
- 모바일 우선 UI
- `next.config.mjs`에 `typescript: { ignoreBuildErrors: true }` 설정됨

## 환경변수 (`.env.local`)

`TURSO_URL`, `TURSO_AUTH_TOKEN`, `GEMINI_API_KEY`
