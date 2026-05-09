# LifeQuest — 진입점 (Codex / Claude Code 공통)

## 두 에이전트 공통 규칙

1. **작업 시작 전** `CLAUDE.md` → `UIUX(v0)/MAP.md` 순으로 읽고 진입.
2. 한 에이전트가 만든 변경을 다른 에이전트가 임의로 되돌리지 말 것.
3. 인수인계 시 공유: (a) 수정한 파일 목록 (b) 신규 파일 여부 (c) `git status` 결과.
4. 사용자 최신 지시가 충돌하는 모든 규칙보다 우선.

## 진입 문서 3종 (모든 작업의 시작점)

| 문서 | 위치 | 역할 |
|-----|-----|-----|
| **MAP** | `UIUX(v0)/MAP.md` | 모듈/기능/디자인 통합 지도 |
| **DESIGN_GUIDE** | `UIUX(v0)/DESIGN_GUIDE.md` | 색상/이모지 디테일 |
| **DEPLOY_NOTES** | `DEPLOY_NOTES.md` | 배포 SOP |

핵심 원칙·환경변수·배포 명령은 `CLAUDE.md`와 동일 — 그쪽을 SoT로 본다.
