# LifeQuest — 진입점

작업 시작 전 **반드시 아래 3개 문서**를 진입점으로 사용한다. 자세한 내용은 모두 거기에 있다.

| 문서 | 위치 | 역할 |
|-----|-----|-----|
| **MAP** | `UIUX(v0)/MAP.md` | 모듈/기능/디자인 통합 지도. 모든 작업은 여기서 시작 |
| **DESIGN_GUIDE** | `UIUX(v0)/DESIGN_GUIDE.md` | 색상/이모지 디테일 레퍼런스 |
| **DEPLOY_NOTES** | `DEPLOY_NOTES.md` | 배포 SOP — 코드 수정/배포 전 필독 |

## 핵심 원칙 요약 (디테일은 위 문서)

- 작업 디렉토리: `lifequest/UIUX(v0)/`
- 스택: Next.js 16 + TypeScript + Tailwind + Turso + Gemini 1.5 Flash
- 게임 수치는 DB(`game_config` / `battle_config`)에서 로드 — 하드코딩 금지
- DB 쿼리는 `lib/db/` 함수만 호출
- 환경변수: `TURSO_URL`, `TURSO_AUTH_TOKEN`, `GEMINI_API_KEY`

## 새 파일 생성 시 (자동 watcher 미감지)

```bash
cd "/mnt/c/Users/wandp/OneDrive/바탕 화면/지헌/lifequest/UIUX(v0)"
git add <새 파일> && git commit -m "feat: ..." && git push
```

상세 절차는 `DEPLOY_NOTES.md` 참조.
