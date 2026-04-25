# 라이프퀘스트 배포·코딩 실수 기록

매 배포/작업마다 발생한 실수와 재발 방지 체크리스트. 새 작업 시작 전에 이 파일을 먼저 본 뒤 작업한다.

---

## 📌 핵심 규칙 (요약)

1. **새 파일 만든 직후 반드시 `git status`로 untracked 확인**. 자동 배포 시스템은 modified 파일만 커밋하고 untracked 파일은 무시한다.
2. **코드 수정 후 5분 이상 사용자가 "안 바뀐다"고 하면 즉시 `vercel ls` 실행** — Vercel 빌드 실패가 누적되고 있을 수 있다.
3. **빌드 실패 시 `vercel inspect <URL> --logs`로 로그 보고 원인 파악**. 추측 금지.
4. **로컬 `pnpm run build` 통과 ≠ 프로덕션 배포 성공.** 로컬은 untracked 파일도 다 보지만 Vercel은 git에 푸시된 것만 본다.

---

## 🔧 배포 상태 확인 명령

```bash
# 작업 디렉토리
cd "/mnt/c/Users/wandp/OneDrive/바탕 화면/지헌/lifequest/UIUX(v0)"

# 1. 최근 배포 상태 (Ready/Error/Building)
~/.local/bin/pnpm dlx vercel@latest ls 2>&1 | grep -E "Production|Building|Error|Ready" | head -5

# 2. 특정 배포 빌드 로그
~/.local/bin/pnpm dlx vercel@latest inspect <DEPLOYMENT_URL> --logs 2>&1 | tail -60

# 3. 사용자가 보는 alias URL이 새 빌드 반영했는지 (API로 확인 — HTML은 CDN 캐시됨)
curl -s "https://lifequest-bice.vercel.app/api/character"
```

**프로젝트 정보**
- Vercel 팀: `wandp1990-8450s-projects`
- 프로젝트 슬러그: `lifequest`
- 사용자가 접근하는 alias: `https://lifequest-bice.vercel.app/`
- GitHub: `wandp1990-pixel/Lifequest` (main 브랜치 자동 배포)
- Vercel root directory: `UIUX(v0)/`

---

## 📅 사고 기록

### 2026-04-26: 5시간 누적 빌드 실패 (untracked 파일)

**증상**
- 사용자가 "전부 그대로"라고 보고 (배포 URL에 변경사항 미반영)
- `git log`/`git status` 모두 정상으로 보였음 (origin/main과 sync, 코드 변경 다 commit됨)
- 로컬 `pnpm run build` 정상 통과
- `/api/character` 응답에 새 `name` 필드 없음 → 마이그레이션 미실행 → 새 코드 미배포 확인

**원인**
- `lib/db/queries/routine.ts`, `app/api/routines/route.ts`가 untracked 상태로 5시간 방치
- 외부 자동 배포 시스템(`Auto-deploy: ...`)은 modified 파일만 add/commit. **untracked 파일은 안 잡음**
- 5시간 동안 Vercel 빌드 매번 `Module not found: ./queries/routine`로 실패. `lifequest-bice.vercel.app`은 직전 Ready 빌드(03:18 KST) HTML/JS를 계속 서빙

**왜 늦게 발견했나**
- 코드 변경 후 `git log`만 보고 "auto-deploy됐으니 끝"이라고 가정
- `git status` 한번 더 안 봄 → untracked 파일 누락 인지 못함
- Vercel 빌드 상태 확인 안 함

**해결**
- `git add lib/db/queries/routine.ts app/api/routines/route.ts && git commit && git push`
- Vercel 빌드 Ready 확인 후 `/api/character` 응답에 `"name":"전사"` 검증

**재발 방지 체크리스트**
- [ ] 새 파일(`Write` 또는 `Bash mkdir`) 만든 직후 → 그 자리에서 `git status` 실행하여 untracked 확인
- [ ] untracked 발견 시 → 자동 배포 기다리지 말고 즉시 `git add <file> && git commit && git push`
- [ ] 사용자가 "변경 안 보인다" 하면 → ① `vercel ls`로 Building/Error 확인 ② Error면 `vercel inspect --logs` ③ 추측으로 캐시 운운 금지
- [ ] 작업 마무리 보고 전 → `git status` 최종 확인 후 untracked 0개 검증

---

## 🌐 배포 캐시 트러블슈팅

- `lifequest-bice.vercel.app`은 prerendered HTML이 CDN에 캐시됨 (`x-nextjs-prerender: 1`, `age: <초>` 헤더로 확인)
- 새 빌드가 deploy되면 ISR로 갱신되지만, 트래픽이 없으면 stale 채로 머무를 수 있음
- 사용자에게 "새로고침" 안내 전, **반드시 API route(`/api/character` 등)로 새 코드 동작 검증**. API는 dynamic이라 캐시 영향 없음
- HTML 페이지 직접 갱신은 `curl -X PURGE` 같은 게 안 통하므로 사용자 측 강제 새로고침이 마지막 수단

---

## 🚦 작업 완료 보고 전 최종 점검

```bash
cd "/mnt/c/Users/wandp/OneDrive/바탕 화면/지헌/lifequest/UIUX(v0)"

# 1. untracked 0개 확인 (관련 파일 한정)
git status

# 2. 로컬 빌드 통과
~/.local/bin/pnpm run build 2>&1 | tail -5

# 3. Vercel 최신 배포 Ready
~/.local/bin/pnpm dlx vercel@latest ls 2>&1 | grep "Production" | head -1

# 4. 새 코드 라이브 검증 (API route + 기능별 unique string)
curl -s "https://lifequest-bice.vercel.app/api/character" | head -c 200
```

이 4가지가 모두 통과해야 사용자에게 "완료"라고 보고한다.
