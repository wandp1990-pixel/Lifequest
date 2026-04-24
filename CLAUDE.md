# Life Quest — 프로젝트 지시사항

## 배포 규칙

코드 수정 후 **반드시** 아래 순서로 커밋 + push까지 완료할 것.
push까지 해야 Streamlit Cloud에 자동 배포된다.

```bash
git add <변경된 파일>
git commit -m "커밋 메시지"
git push
```

GitHub remote: `https://github.com/wandp1990-pixel/Lifequest.git`
(PAT는 로컬 git config에 등록되어 있어 별도 입력 불필요)

## 프로젝트 개요

개인용 AI 게이미피케이션 앱. AI(Gemini)가 GM으로서 일상 활동을 EXP로 변환.

- **배포**: Streamlit Community Cloud (GitHub push → 자동 배포)
- **DB**: Turso (SQLite 클라우드) — URL: `libsql://lifequest-wandp1990-pixel.aws-ap-northeast-1.turso.io`
- **AI**: Google Gemini API

## 폴더 구조

```
main.py          # 진입점
config.py        # game_config 로더 (5분 캐싱)
database/db.py   # Turso HTTP API 연결 + 전체 쿼리 함수
services/
  game_service.py    # EXP, 레벨업, 스탯/스킬 투자
  ai_service.py      # Gemini API 호출
  battle_service.py  # 턴제 전투 시뮬
  item_service.py    # 아이템 생성
pages/
  1_activity.py   # 활동 입력 (텍스트 AI판정 + 체크리스트)
  2_character.py  # 스탯/스킬 관리
  3_battle.py     # 전투
  4_inventory.py  # 인벤토리 + 뽑기
  5_settings.py   # 수치/프롬프트/몬스터 설정
```

## 코딩 원칙

- **하드코딩 금지**: 게임 수치는 모두 Turso DB `game_config` 테이블에서 로드
- **DB 직접 접근 금지**: pages/services는 `database/db.py` 함수만 호출
- **모바일 우선**: 모든 UI는 모바일 브라우저 기준으로 설계
- `st.page_link` 사용 금지 (모바일 호환 문제)

## Git 설정

- user.email: `wandp1990@gmail.com`
- user.name: `wandp1990`
