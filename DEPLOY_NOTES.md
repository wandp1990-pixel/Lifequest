# 라이프퀘스트 배포 레퍼런스

## 프로젝트 정보

| 항목 | 값 |
|------|-----|
| 작업 디렉토리 | `UIUX(v0)/` |
| Git 원격 | `github.com/wandp1990-pixel/Lifequest` (main) |
| Vercel 팀 | `wandp1990-8450s-projects` |
| 프로덕션 URL | `https://lifequest-bice.vercel.app` |
| Vercel root | `UIUX(v0)/` |

---

## 배포 흐름

```
코드 수정 → git add/commit/push → GitHub webhook → Vercel 자동 빌드 → Ready
```

**⚠️ GitHub webhook이 간헐적으로 트리거 안 됨** (2026-04-30 확인)  
push 후 2분 내 `npx vercel ls` 상단에 새 URL이 없으면 빈 커밋으로 재트리거:

```bash
git commit --allow-empty -m "chore: trigger vercel deploy" && git push
```

---

## 작업 완료 후 필수 확인 4단계

```bash
# 1. untracked 파일 없는지
git status

# 2. 새 배포 생성됐는지 (push 후 2분 내 상단에 새 URL 있어야 함)
npx vercel ls 2>/dev/null | head -3

# 3. 빌드 Ready 확인
npx vercel inspect <DEPLOYMENT_URL> 2>&1 | grep status

# 4. 실제 코드 반영 확인 (HTML은 CDN 캐시라 신뢰 불가, API route로 검증)
curl -s "https://lifequest-bice.vercel.app/api/character" | head -c 100
```

---

## 자주 발생하는 문제

| 증상 | 원인 | 해결 |
|------|------|------|
| "새로고침해도 안 바뀐다" | webhook 미트리거 또는 빌드 실패 | `vercel ls` 확인 → 새 URL 없으면 빈 커밋 push |
| 배포는 됐는데 변경사항 없음 | 빌드 Error 상태 | `npx vercel inspect <URL> --logs 2>&1 \| tail -30` |
| 새 파일 추가 후 빌드 실패 | untracked 파일 미push | `git add <파일> && git commit && git push` |

---

## 주의사항

- **새 파일 생성 직후** (`Write` 또는 `mkdir`) → 그 자리에서 바로 `git add <file> && git commit && git push`. 나중으로 미루면 반드시 빠짐
- `vercel --prod` 단독 실행 금지 — push 없이 배포하면 자동 배포에 덮어씌워짐
- vercel 명령은 항상 git 루트(`lifequest/`)에서 실행. `UIUX(v0)/` 안에서 실행 시 rootDirectory 이중화 오류 발생
- `UIUX(v0)/.vercel/` 디렉터리가 생기면 즉시 삭제
- "변경 안 보인다" 보고 시 → 캐시 탓으로 돌리지 말고 즉시 배포 상태 확인

---

## 사고 기록

### 2026-04-26: 5시간 빌드 연속 실패
- **원인**: `lib/db/queries/routine.ts` 등 신규 파일이 untracked 상태로 방치. 자동 배포는 modified 파일만 잡음
- **교훈**: 새 파일 생성 직후 `git status` 실행 → untracked 확인 후 즉시 add/commit

### 2026-04-30: GitHub webhook 미트리거
- **원인**: push 후 Vercel webhook이 작동하지 않아 새 배포가 생성되지 않음
- **해결**: `git commit --allow-empty -m "chore: trigger vercel deploy" && git push`
- **교훈**: push 후 반드시 `vercel ls`로 새 URL 확인. 없으면 빈 커밋으로 재트리거
