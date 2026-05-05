# AI 게이미피케이션 앱 — 백엔드 기획서 (개인용)

> **문서 범위:** 기술 스택, 배포 구성, 시스템 아키텍처 설계에 한정.  
> 게임 시스템 상세 로직은 게임 시스템 기획서(v0.6) 참고.  
> 화면 구성(UI)은 프론트엔드 기획서에서 별도 다룸.

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [시스템 아키텍처](#3-시스템-아키텍처)
4. [프롬프트 관리 정책](#4-프롬프트-관리-정책)
5. [수치 관리 정책](#5-수치-관리-정책)
6. [성능 최적화 정책](#6-성능-최적화-정책)
7. [폴더 구조](#7-폴더-구조)
8. [배포 구성](#8-배포-구성)
9. [DB 스키마](#9-db-스키마)

---

## 1. 프로젝트 개요

### 1.1 서비스 목적

- AI가 GM 역할을 수행하며 실생활 활동을 게임 성장 로그로 변환
- 개인 혼자 사용하는 개인용 앱 (소규모 · 1인 사용자)
- PC · iPhone · Galaxy 브라우저에서 동일한 URL로 접속 및 데이터 연동

### 1.2 설계 원칙

- **무료 운영:** 모든 구성 요소를 무료 티어 내에서 운영
- **하드코딩 금지:** 게임 수치·프롬프트는 코드에 직접 쓰지 않고 DB 또는 설정 파일로 분리
- **빠른 로딩:** Streamlit 캐싱을 적극 활용하여 체감 속도 최소화
- **단순한 구조:** 역할별 모듈 분리로 유지보수 용이

---

## 2. 기술 스택

| 역할 | 선택 | 무료 한도 | 비고 |
|------|------|----------|------|
| 화면 + 로직 | Streamlit | 무료 | Python 하나로 UI·로직 통합 |
| AI 판정 | Google Gemini API | 1,500회/일 무료 | EXP 산출 · 활동 판정 |
| 데이터베이스 | Turso (SQLite 클라우드) | 500MB 무료 | 기기 간 데이터 연동 |
| 배포 | Streamlit Community Cloud | 무료 | GitHub 연동 자동 배포 |
| 코드 관리 | GitHub | 무료 | 버전 관리 · 배포 트리거 |

### 2.1 Streamlit 선택 이유

- Python 파일 하나에 화면과 로직을 함께 작성 → 프론트엔드/백엔드 분리 불필요
- React + FastAPI 조합 대비 진입장벽이 낮음
- GitHub에 코드를 올리면 Streamlit Community Cloud가 자동으로 배포
- PC · 모바일 브라우저 모두 접속 가능 (반응형 지원)
- `@st.cache_data` / `@st.cache_resource` 내장 캐싱으로 로딩 속도 최적화 가능

### 2.2 Google Gemini API 선택 이유

- 무료 한도 내에서 개인 사용량 충분 (하루 1,500회 · 분당 15회)
- 기존 사용 경험 있음
- 텍스트 활동 판정 및 EXP 산출에만 사용 (체크리스트는 함수 처리로 API 호출 최소화)

### 2.3 Turso 선택 이유

- SQLite 문법 그대로 사용 가능 → 학습 비용 낮음
- 클라우드 저장이라 PC · 모바일 간 데이터 자동 연동
- Streamlit Community Cloud 재배포 시에도 DB 데이터 유지 (코드와 DB 완전 분리)
- 프롬프트 · 게임 수치 · 게임 데이터를 모두 안전하게 영속 보관

---

## 3. 시스템 아키텍처

### 3.1 전체 흐름

```
사용자 (PC / iPhone / Galaxy 브라우저)
        ↓ 같은 URL 접속
Streamlit Community Cloud (앱 실행)
        ↓ 활동 텍스트 전달
Google Gemini API (AI 판정 · EXP 산출)
        ↓ 결과 반환
Streamlit (결과 처리 · 화면 갱신)
        ↓ 데이터 저장 / 조회
Turso (SQLite 클라우드 DB)
```

### 3.2 데이터 흐름 상세

| 단계 | 처리 주체 | 내용 |
|------|----------|------|
| 활동 입력 | Streamlit | 유저가 텍스트 입력 또는 체크리스트 체크 |
| AI 판정 | Gemini API | 텍스트 활동 → DB에서 프롬프트 로드 → EXP 산출 |
| 고정 EXP 지급 | Streamlit 함수 | 체크리스트 완료 → AI 호출 없이 DB 수치 기준으로 EXP 지급 |
| 데이터 저장 | Turso | EXP · 레벨 · 스탯 · 아이템 · 전투 로그 · 프롬프트 저장 |
| 레벨업 처리 | Streamlit 함수 | EXP 누적 확인 → 레벨업 트리거 → DB 수치 기준 보상 지급 |
| 전투 시뮬레이션 | Streamlit 함수 | 턴제 자동 전투 · DB 수치 기준 몬스터/아이템 생성 |

### 3.3 게임 시스템 → 백엔드 매핑

| 게임 시스템 항목 | 백엔드 처리 방식 |
|----------------|----------------|
| AI 판정 엔진 | Gemini API 호출 함수 (프롬프트는 DB에서 로드) |
| 체크리스트 EXP | DB에서 고정값 읽어 반환하는 함수 |
| 레벨업 트리거 | EXP 누적 확인 후 레벨업 함수 실행 (수치는 DB에서 로드) |
| 스킬 발동 로직 | 난수 생성 + 조건 비교 함수 (확률값은 DB에서 로드) |
| 몬스터 생성 | 레벨·클리어 횟수 기반 난수 생성 함수 (배율은 DB에서 로드) |
| 아이템 생성 | 등급 확률 + 레벨 스케일링 난수 함수 (수치는 DB에서 로드) |
| 전투 시뮬레이션 | 턴제 루프 함수 |

---

## 4. 프롬프트 관리 정책

### 4.1 저장 방식

- 프롬프트는 **항상 Turso DB에 저장**
- 코드(GitHub)에 하드코딩하지 않음
- 앱에서 작성 → DB 저장 / PC 브라우저에서 작성 → DB 저장 → 동일하게 반영

### 4.2 양방향 작업 보장

| 상황 | 동작 |
|------|------|
| 앱(모바일)에서 프롬프트 작성 | Turso DB에 저장 → PC에서 즉시 반영 |
| PC 브라우저에서 프롬프트 수정 | Turso DB에 저장 → 앱에서 즉시 반영 |
| GitHub에 코드 push → 재배포 | 코드만 업데이트 · DB 데이터 변경 없음 |
| Streamlit Cloud 재시작 | 코드만 재실행 · DB 데이터 유지 |

### 4.3 프롬프트 버전 관리

- 프롬프트 수정 시 이전 버전을 삭제하지 않고 비활성화 처리
- DB에 버전 번호 · 수정 일시 · 내용을 함께 저장하여 이력 추적
- 필요 시 이전 버전으로 롤백 가능

---

## 5. 수치 관리 정책

### 5.1 하드코딩 금지 원칙

모든 게임 밸런스 수치는 코드에 직접 작성하지 않는다.  
수치는 DB 또는 설정 파일에서 읽어오며, 앱 내에서 수정 가능하도록 설계한다.

> **목적:** 코드 수정 · 재배포 없이 앱에서 수치만 바꿔 밸런스 조정 가능

### 5.2 수치 분류

| 분류 | 관리 위치 | 예시 |
|------|----------|------|
| 게임 핵심 수치 | Turso DB (game_config 테이블) | BaseEXP, 레벨업 배율(1.01), 레벨업 보상량 |
| 몬스터 등급 확률 | Turso DB | 일반·희귀·정예·네임드·필드보스·재앙·종말 (7단계, 확률은 game_config에서 관리) |
| 아이템 등급 확률 | Turso DB | 일반·고급·희귀·영웅·고대·전설·신화 (7단계, 확률은 game_config에서 관리) |
| 능력치 배율 | Turso DB | 몬스터 등급 배율 · 아이템 등급 배율 |
| 체크리스트 고정 EXP | Turso DB | 항목별 고정 EXP 값 |
| 스킬 수치 | Turso DB | 스킬별 기본 효과값 · 최대 발동 확률 상한선 |
| 환경 변수 (API 키 등) | Streamlit Secrets | Gemini API 키 · Turso 접속 정보 |

### 5.3 수치 수정 방법

- **앱 내 설정 화면**에서 수치를 직접 수정 → DB에 저장 → 즉시 반영
- 코드 수정 · 재배포 필요 없음
- 수치 변경 이력도 DB에 기록하여 롤백 가능

---

## 6. 성능 최적화 정책

### 6.1 Streamlit 캐싱 전략

Streamlit은 화면을 새로 그릴 때마다 전체 코드를 재실행하는 구조이다.  
캐싱을 적용하면 불필요한 DB 조회와 API 호출을 줄여 로딩 속도를 단축할 수 있다.

| 캐싱 대상 | 사용 데코레이터 | 이유 |
|----------|--------------|------|
| Turso DB 연결 객체 | `@st.cache_resource` | 매번 새로 연결하지 않고 재사용 |
| game_config 수치 | `@st.cache_data(ttl=300)` | 자주 바뀌지 않으므로 5분 캐싱 |
| 스킬 · 아이템 DB 데이터 | `@st.cache_data(ttl=300)` | 변경 빈도 낮음 · 5분 캐싱 |
| 프롬프트 | `@st.cache_data(ttl=60)` | 수정 즉시 반영 위해 1분 캐싱 |
| Gemini API 응답 | 캐싱 하지 않음 | 활동마다 다른 결과가 나와야 함 |

> `ttl` (Time To Live): 캐시 유지 시간(초). 해당 시간이 지나면 DB에서 새로 읽어옴.

### 6.2 API 호출 최소화

- 체크리스트 완료는 Gemini API를 호출하지 않고 함수로 처리
- 동일한 활동을 중복 제출하는 경우 서버 측에서 감지하여 중복 호출 방지
- 분당 15회 한도 초과 시 재시도 대기 로직 적용

### 6.3 에러 처리 정책

| 상황 | 처리 방식 |
|------|----------|
| Gemini API 분당 한도 초과 | 화면에 "요청이 너무 많습니다. 1분 후 다시 시도해주세요." 문구 표시 |
| Gemini API 일일 한도 초과 | 화면에 "오늘의 AI 판정 횟수를 초과했습니다. 내일 다시 시도해주세요." 문구 표시 |
| Turso DB 연결 실패 | 화면에 "데이터베이스 연결에 실패했습니다. 1분 후 다시 시도해주세요." 문구 표시 |
| 기타 예외 오류 | 화면에 "오류가 발생했습니다. 1분 후 다시 시도해주세요." 문구 표시 후 오류 내용 로그 기록 |

> 모든 오류 상황에서 앱이 멈추지 않고 문구만 표시한 뒤 유저가 재시도할 수 있도록 처리한다.

### 6.3 Session State 활용 전략

앱 접속 시 유저 스탯(레벨, EXP, 스탯 포인트 등)을 DB에서 1회만 로드하여 `st.session_state`에 저장한다.  
이후 게임 로직(EXP 획득, 레벨업 등)은 메모리(session_state) 안에서 처리하고, DB에는 저장 시점에만 쓴다.

| 데이터 | 저장 위치 | DB 쓰기 시점 |
|--------|----------|-------------|
| 유저 스탯 (레벨, EXP 등) | session_state | 활동 정산 버튼 클릭 시 |
| 체크리스트 완료 여부 | session_state → 즉시 DB 저장 | 체크 즉시 |
| 전투 로그 | session_state | 전투 종료 시 |
| 아이템 · 스킬 데이터 | DB 캐싱 | 변경 시에만 쓰기 |

> **핵심:** 화면 갱신(Streamlit 재실행)이 발생해도 DB를 다시 읽지 않는다. session_state에서 읽는다.

### 6.4 즉시 저장 방식 (체크리스트)

체크박스를 체크하면 즉시 DB에 저장하고 EXP를 바로 반영한다.  
Turso는 API 호출 제한이 없고 응답이 빠르므로 개인 사용 기준 부하 문제 없음.

```
유저가 체크리스트 항목 체크
    ↓
즉시 EXP 계산 · DB 저장
    ↓
레벨업 여부 확인
    ↓
화면 즉시 갱신
```

> **선택 이유:** 단순하고 직관적. "저장됐나?" 혼동 없음. 개인 혼자 사용하는 앱 특성상 DB 부하 문제 없음.

### 6.5 DB 쿼리 최적화

- 자주 조회하는 컬럼(유저 레벨, EXP, 현재 HP 등)에 인덱스 적용
- 전투 로그처럼 일시적으로만 필요한 데이터는 session_state에 임시 저장 → DB 조회 횟수 감소

---

## 7. 폴더 구조

```
project/
├── main.py                  # 앱 진입점 · 페이지 라우팅
├── config.py                # DB에서 game_config 수치 로드
├── requirements.txt         # 패키지 목록
├── .streamlit/
│   └── secrets.toml         # API 키 · DB 접속 정보 (GitHub에 올리지 않음)
│
├── database/
│   └── db.py                # Turso 연결 · 공통 쿼리 함수
│
├── services/
│   ├── ai_service.py        # Gemini API 호출 · 프롬프트 로드
│   ├── game_service.py      # EXP 처리 · 레벨업 · 보상 지급
│   ├── battle_service.py    # 전투 시뮬레이션 · 몬스터 생성
│   └── item_service.py      # 아이템 생성 · 뽑기권 처리
│
└── pages/                   # Streamlit 멀티페이지 (프론트엔드 기획서에서 상세 설계)
    ├── 1_activity.py        # 활동 입력 페이지
    ├── 2_character.py       # 캐릭터 · 스탯 · 스킬 페이지
    ├── 3_battle.py          # 전투 페이지
    ├── 4_inventory.py       # 인벤토리 · 아이템 페이지
    └── 5_settings.py        # 수치 설정 · 프롬프트 관리 페이지
```

### 7.1 모듈별 역할

| 파일/폴더 | 역할 |
|----------|------|
| `main.py` | 앱 시작점 · 공통 레이아웃 |
| `config.py` | DB에서 game_config를 읽어 앱 전체에 공급 |
| `database/db.py` | Turso 연결 관리 · 재사용 가능한 쿼리 함수 모음 |
| `services/ai_service.py` | Gemini API 호출 · 프롬프트 DB 로드 · EXP 결과 파싱 |
| `services/game_service.py` | 레벨업 판정 · 보상 지급 · EXP 누적 처리 |
| `services/battle_service.py` | 턴제 전투 루프 · 스킬 발동 · 몬스터 생성 |
| `services/item_service.py` | 아이템 등급 결정 · 옵션 부여 · 레벨 스케일링 |
| `pages/` | 화면 구성 (상세는 프론트엔드 기획서에서 다룸) |
| `.streamlit/secrets.toml` | API 키 · DB 접속 정보 (절대 GitHub에 올리지 않음) |

### 7.2 의존 방향

```
pages/ (화면)
    ↓ 호출
services/ (비즈니스 로직)
    ↓ 호출
database/db.py (DB 쿼리)
    ↓ 연결
Turso (클라우드 DB)

services/ai_service.py
    ↓ 호출
Google Gemini API
```

> 화면(pages)은 서비스(services)만 호출하고, 서비스는 DB만 직접 접근한다.  
> pages에서 DB를 직접 호출하지 않는다 → 역할 분리 유지

---

## 8. 배포 구성

### 8.1 배포 흐름

```
로컬 PC (코드 작성)
    ↓ git push
GitHub (코드 저장소)
    ↓ 자동 감지
Streamlit Community Cloud (자동 배포)
    ↓ 접속
PC / iPhone / Galaxy 브라우저
```

> **핵심:** 재배포(코드 업데이트)는 Turso DB에 저장된 프롬프트·수치·게임 데이터에 영향을 주지 않음

### 8.2 서비스별 무료 한도

| 서비스 | 무료 한도 | 비고 |
|--------|----------|------|
| Streamlit Community Cloud | 앱 1개 무료 | 미접속 시 슬립 → 접속 시 수십 초 내 재시작 |
| Google Gemini API | 1,500회/일 · 분당 15회 | 개인 사용 기준 충분 |
| Turso | 500MB · 월 10억 row reads | 개인 사용 시 초과 가능성 없음 |
| GitHub | 무제한 (공개/비공개) | 제한 없음 |

**총 비용: 0원 / 월**

### 8.3 주의사항

- **하드코딩 금지:** 게임 수치·프롬프트를 코드에 직접 작성하면 재배포 시 덮어씌워짐
- **secrets.toml GitHub 업로드 금지:** API 키 · DB 접속 정보는 `.gitignore`에 추가하고 Streamlit Cloud 환경변수로 별도 설정
- **Gemini API 호출 최소화:** 체크리스트는 함수 처리, 텍스트 판정만 API 호출
- **Streamlit 슬립:** 일정 시간 미접속 시 슬립 상태 전환. 자동 일일 초기화 등 배치 작업이 필요한 경우 별도 설계 필요

---

## 9. DB 스키마

### 9.1 설계 원칙

- **단일 캐릭터:** 다중 캐릭터 없음. `character` 테이블은 항상 1행
- **로그 보관 한도:** 활동 로그 · 전투 로그 · 체크리스트 로그는 최근 10건만 유지. 초과 시 오래된 것부터 자동 삭제
- **데이터 저장:** Turso DB에 JSON 포함 구조화된 형태로 저장
- **수치 편집 UI:** 앱 내 관리자 화면에서 `st.data_editor`로 엑셀처럼 셀 직접 수정 가능. 몬스터 추가 · 수치 변경 모두 표 형식으로 처리

### 9.2 테이블 목록

| 테이블 | 역할 | 보관 한도 |
|--------|------|----------|
| `character` | 레벨 · EXP · 스탯 5종 · HP/MP · 보유 포인트 | 1행 고정 |
| `activity_log` | 텍스트 활동 입력 이력 · AI 판정 결과 · 획득 EXP | 최근 10건 |
| `checklist_item` | 체크리스트 항목 정의 · 고정 EXP 값 | 제한 없음 |
| `checklist_log` | 체크 완료 이력 | 최근 10건 |
| `skill_table` | 스킬 정의 · 효과 공식 · 발동 조건 | 제한 없음 |
| `skill_log` | 캐릭터 스킬별 투자 포인트 · 해금 여부 | 제한 없음 |
| `equipment` | 보유 아이템 · 등급 · 옵션 · 장착 여부 | 제한 없음 |
| `item_grade_table` | 등급별 스탯 범위 · 옵션 슬롯 수 · 가중치 | 제한 없음 |
| `item_slot_table` | 슬롯별 메인 능력치 · 제외 능력치 정의 | 제한 없음 |
| `item_ability_pool` | 아이템 옵션 풀 · 능력치 기본값 · 단위 · 카테고리 | 제한 없음 |
| `item_passive_pool` | 패시브 옵션 풀 · 설명 | 제한 없음 |
| `battle_log` | 전투 결과 · 몬스터 정보 · 턴별 로그 | 최근 10건 |
| `prompt` | AI 판정 프롬프트 · 버전 관리 · 활성/비활성 | 제한 없음 |
| `game_config` | 모든 게임 수치 (BaseEXP · 등급 확률 · 배율 등) | 제한 없음 |
| `monster_table` | 몬스터 기반 데이터 · 앱에서 표 형식으로 편집 | 제한 없음 |
| `battle_config` | 전투 상세 수치 (명중·회피·치명타·데미지 공식 등) | 제한 없음 |

### 9.3 테이블 상세

#### character
```
id            INTEGER  PK
level         INTEGER  -- 현재 레벨 (1~200)
total_exp     INTEGER  -- 누적 경험치 (최대 1,000,000)
stat_points   INTEGER  -- 미배분 스탯 포인트 (0~1,000)
skill_points  INTEGER  -- 미사용 스킬 포인트 (0~1,000)
draw_tickets  INTEGER  -- 아이템 뽑기권 수량 (0~1,000)
str           INTEGER  -- 힘
vit           INTEGER  -- 체력
dex           INTEGER  -- 민첩
int_stat      INTEGER  -- 지능 (int는 예약어라 별칭 사용)
luk           INTEGER  -- 운
base_hp       INTEGER  -- 기본 HP (1~1,000,000)
base_mp       INTEGER  -- 기본 MP (1~1,000,000)
current_hp    INTEGER  -- 현재 HP
max_hp        INTEGER  -- 최대 HP (base_hp + VIT 보정)
current_mp    INTEGER  -- 현재 MP
max_mp        INTEGER  -- 최대 MP (base_mp + INT 보정)
created_at    TEXT
updated_at    TEXT
```

#### activity_log (최근 10건 유지)
```
id            INTEGER  PK
input_text    TEXT     -- 유저가 입력한 활동 내용
input_type    TEXT     -- 'text' | 'checklist'
exp_gained    INTEGER  -- 지급된 EXP
ai_comment    TEXT     -- AI 판정 코멘트
created_at    TEXT
```
> 새 항목 추가 시 전체 건수가 10건 초과하면 가장 오래된 것 삭제

#### checklist_item
```
id            INTEGER  PK
name          TEXT     -- 항목명 (예: 약 복용, 물 마시기)
fixed_exp     INTEGER  -- 완료 시 지급 EXP
is_active     INTEGER  -- 1: 활성 / 0: 비활성
```

#### checklist_log (최근 10건 유지)
```
id            INTEGER  PK
item_id       INTEGER  FK → checklist_item.id
exp_gained    INTEGER
checked_at    TEXT
```

#### skill_table
```
id                   INTEGER  PK
name                 TEXT     -- 스킬 이름
type                 TEXT     -- 'passive' | 'active'
max_skp              INTEGER  -- 최대 투자 가능 스킬 포인트 (기본 20)
unlock_level         INTEGER  -- 해금 레벨
base_effect_value    REAL     -- 포인트 미투자 시 기본 효과값
effect_coeff         REAL     -- 포인트 투자당 효과 증가 계수
base_trigger_param   REAL     -- 기본 발동 파라미터 (확률 또는 조건 수치)
trigger_param_coeff  REAL     -- 포인트 투자당 발동 파라미터 증가 계수
effect_code          TEXT     -- 효과 종류 식별 코드 (함수에서 참조)
trigger_condition    TEXT     -- 발동 조건 코드 (예: hp_below_30, on_hit)
description          TEXT     -- 스킬 설명
is_active            INTEGER  -- 1: 활성 / 0: 비활성
```
> 앱 내 관리자 화면에서 `st.data_editor`로 스킬 추가 · 수정 가능

#### skill_log (캐릭터 스킬 투자 현황)
```
id              INTEGER  PK
skill_id        INTEGER  FK → skill_table.id
invested_points INTEGER  -- 투자한 스킬 포인트 (0~max_skp)
is_unlocked     INTEGER  -- 1: 해금됨 / 0: 미해금
updated_at      TEXT
```

#### equipment
```
id            INTEGER  PK
slot          TEXT     -- weapon/helmet/armor/pants/belt/glove/shoe/necklace/ring
name          TEXT     -- 아이템 명칭
grade         TEXT     -- C/B/A/S/SR/SSR/UR
base_stat     INTEGER  -- 기본 수치
options       TEXT     -- JSON 형식 추가 옵션 (예: '{"str":5,"vit":3}')
is_equipped   INTEGER  -- 1: 장착 중 / 0: 인벤토리
created_at    TEXT
```

#### battle_log (최근 10건 유지)
```
id            INTEGER  PK
monster_name  TEXT
monster_grade TEXT     -- 일반/희귀/정예/네임드/필드보스/재앙/종말
result        TEXT     -- 'win' | 'lose'
exp_gained    INTEGER
draw_tickets  INTEGER  -- 획득한 뽑기권 수
log_data      TEXT     -- JSON 형식 턴별 전투 로그
created_at    TEXT
```

#### prompt
```
id            INTEGER  PK
category      TEXT     -- 활동 카테고리 (예: 운동, 공부, 독서)
content       TEXT     -- 프롬프트 내용
version       INTEGER  -- 버전 번호
is_active     INTEGER  -- 1: 현재 사용 중 / 0: 이전 버전
updated_at    TEXT
```

#### game_config
```
id            INTEGER  PK
config_key    TEXT     -- 설정 키 (예: base_exp, level_multiplier)
config_value  TEXT     -- 설정 값 (숫자도 TEXT로 저장 후 앱에서 변환)
description   TEXT     -- 설명 (앱 편집 화면에서 표시)
updated_at    TEXT
```
> 앱 내 관리자 화면에서 `st.data_editor`로 표 형식 편집

#### monster_table
```
id            INTEGER  PK
name          TEXT     -- 몬스터 이름
base_hp       INTEGER  -- 기본 HP
base_atk      INTEGER  -- 기본 물리 공격력
base_matk     INTEGER  -- 기본 마법 공격력
base_pdef     INTEGER  -- 기본 물리 방어력
base_mdef     INTEGER  -- 기본 마법 방어력
base_dex      INTEGER  -- 기본 민첩 (명중·회피 영향)
base_luk      INTEGER  -- 기본 운 (치명타 억제 영향)
description   TEXT     -- 설명
is_active     INTEGER  -- 1: 등장 가능 / 0: 비활성
```
> 앱 내 관리자 화면에서 `st.data_editor`로 행 추가 · 수정 · 비활성화 가능

#### battle_config
```
id            INTEGER  PK
config_key    TEXT     -- 설정 키 (알파버전 battle_config_fields 기준)
config_value  TEXT     -- 설정 값 (REAL도 TEXT로 저장 후 앱에서 변환)
label         TEXT     -- 한글 라벨 (앱 편집 화면에서 표시)
min_val       REAL     -- 최솟값
max_val       REAL     -- 최댓값
step          REAL     -- 조정 단위
updated_at    TEXT
```

**battle_config 주요 항목 (알파버전 기준)**

| config_key | 설명 |
|-----------|------|
| `base_accuracy` | 기본 명중률 |
| `accuracy_per_dex` | DEX당 명중률 변동 |
| `evasion_per_dex` | DEX당 회피율 |
| `base_crit_multiplier` | 기본 치명타 배율 |
| `crit_rate_per_luk` | 내 LUK당 치명타율 |
| `crit_suppression_per_enemy_luk` | 적 LUK당 치명타 억제 |
| `crit_multiplier_per_int` | INT당 치명타 배율 추가 |
| `str_to_patk` | 힘당 물리 공격력 보너스 |
| `vit_to_max_hp` | 체력당 최대 HP 보너스 |
| `int_to_matk` | 지능당 마법 공격력 보너스 |
| `int_to_max_mp` | 지능당 최대 MP 보너스 |
| `double_attack_chance` | 더블 어택 발동 확률 |
| `life_steal_ratio` | 생명 흡수 비율 |
| `defense_ignore_ratio` | 방어 무시 비율 |
| `damage_random_min` | 데미지 난수 최솟값 |
| `damage_random_max` | 데미지 난수 최댓값 |
| `min_damage_ratio_by_defense` | 방어력 최소 데미지 비율 |
| `total_damage_mode` | 총 데미지 방식 (물리+마법) |
| `first_strike_mode` | 선공자 결정 방식 (DEX) |
| `restore_hp_after_battle` | 전투 후 HP 원복 방식 |

> 앱 내 관리자 화면에서 `st.data_editor`로 표 형식 편집

#### item_grade_table
```
id            INTEGER  PK
grade         TEXT     -- C/B/A/S/SR/SSR/UR
name          TEXT     -- 한글 등급명 (일반/고급/희귀/영웅/전설/고대/신화)
main_count    INTEGER  -- 메인 옵션 수
sub_count     TEXT     -- 서브 옵션 수 (범위 표기 가능, 예: '0~1')
combat_count  TEXT     -- 전투 옵션 수 (범위 표기 가능)
passive_count TEXT     -- 패시브 옵션 수 (범위 표기 가능)
total_count   TEXT     -- 총 옵션 수 (범위 표기 가능)
stat_min      INTEGER  -- 기본 스탯 최솟값
stat_max      INTEGER  -- 기본 스탯 최댓값
weight        REAL     -- 등급 결정 가중치 (예: C=50, UR=0.1)
```
> 앱 내 관리자 화면에서 `st.data_editor`로 등급별 수치 수정 가능

#### item_slot_table
```
id            INTEGER  PK
slot          TEXT     -- weapon/helmet/armor/pants/belt/glove/shoe/necklace/ring
name          TEXT     -- 한글 슬롯명 (무기/투구/갑옷 등)
main_ability  TEXT     -- 메인 능력치 고정값 (예: 물리 공격력)
excluded      TEXT     -- JSON 형식 제외 능력치 목록 (예: '["방어력","마법방어력"]')
```
> 슬롯별 메인 능력치와 제외 능력치를 앱에서 편집 가능

#### item_ability_pool
```
id            INTEGER  PK
name          TEXT     -- 능력치명 (예: STR(힘), 물리 공격력)
base_value    REAL     -- 기본 수치 (등급 배율 적용 전)
unit          TEXT     -- 단위 (Pt / % / HP / MP)
effect        TEXT     -- 효과 설명 (예: 물리공격력 +10)
category      TEXT     -- 'BaseStat' | 'Combat'
is_active     INTEGER  -- 1: 활성 / 0: 비활성
```

#### item_passive_pool
```
id            INTEGER  PK
name          TEXT     -- 패시브명 (예: 더블어택, 생명흡수)
description   TEXT     -- 효과 설명 (예: 50% 확률 추가타격)
is_active     INTEGER  -- 1: 활성 / 0: 비활성
```

### 9.4 관리자 편집 화면 대상 테이블

코드 수정 없이 앱에서 직접 편집 가능한 테이블 목록.

| 테이블 | 편집 가능 작업 |
|--------|--------------|
| `game_config` | 수치 수정 (BaseEXP, 배율, 확률 등) |
| `battle_config` | 전투 수치 수정 (명중·회피·치명타·데미지 공식 등) |
| `monster_table` | 몬스터 추가 · 수치 수정 · 비활성화 |
| `skill_table` | 스킬 추가 · 효과값 · 발동 조건 수정 |
| `item_grade_table` | 등급별 스탯 범위 · 옵션 수 · 가중치 수정 |
| `item_slot_table` | 슬롯별 메인 능력치 · 제외 능력치 수정 |
| `item_ability_pool` | 능력치 추가 · 기본값 수정 · 비활성화 |
| `item_passive_pool` | 패시브 추가 · 설명 수정 · 비활성화 |
| `checklist_item` | 항목 추가 · EXP 수정 · 비활성화 |
| `prompt` | 프롬프트 내용 수정 · 버전 관리 |

---

*문서 버전: v1.0 | 최종 수정일: 2026-04-24*
