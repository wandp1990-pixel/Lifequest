# LifeQuest 디자인 가이드

라이프퀘스트의 일관된 디자인을 유지하기 위한 가이드입니다.
현재 실제 코드 기준으로 정리했으며, ⚠️ 표시는 불일치/중구난방 문제가 있는 항목입니다.

---

## 1. 탭별 테마색 (BottomNav 기준)

BottomNav에서 정의한 탭별 공식 색상입니다.

| 탭 | 한국어 | Lucide 아이콘 | 활성 색상 | Tailwind |
|-----|--------|--------------|-----------|----------|
| **home** | 홈 | User | 녹색 | `emerald-500` |
| **tasks** | 할일 | CheckSquare | 주황색 | `amber-500` |
| **battle** | 전투 | Swords | 빨강색 | `red-500` |
| **skills** | 캐릭터 | Sparkles | 보라색 | `purple-500` |
| **items** | 아이템 | ShoppingBag | 하늘색 | `sky-500` |

---

## 2. TasksTab 섹션별 색상 ⚠️ 불일치 주의

TasksTab 안의 각 섹션은 BottomNav의 amber 대신 **각기 다른 색상**을 사용하고 있습니다.
앞으로 추가하는 UI는 아래 섹션별 색상을 따르세요.

| 섹션 | 이모지 | 색상 | Tailwind | 실제 색상값 |
|-----|--------|------|----------|------------|
| **루틴** | 🔁 | 초록(teal) | `teal-*` | `#5BA888`, `#8FD3B5` |
| **습관** | ☀️ | 주황 | `amber-*` | `amber-50/100/400` |
| **할 일** | 📋 | 보라 | `violet-*` | `violet-50/100/500` |
| **프로젝트** | 🗂️ | 보라 | `violet-*` | 프로젝트탭과 동일 |

### 루틴 (Routine) 색상 세부
```
배경:      teal-50  (#F0FDFB 계열)
테두리:    teal-100 (#CCEDE4)
활성 border: 1.5px solid #8FD3B5
진행바:    linear-gradient(90deg, #8FD3B5, #5BA888)
체크박스:  #5BA888 (완료)
버튼:      bg-teal-500 text-white
텍스트:    color: #5BA888
```

### 습관 (Daily Habit) 색상 세부
```
배경:      amber-50
테두리:    amber-100
버튼:      bg-amber-400 text-white
편집 포커스: ring-amber-300
```

### 할 일 (Todo) 색상 세부
```
배경:      violet-50
테두리:    violet-100
버튼:      bg-violet-500 text-white
편집 포커스: ring-violet-300
```

### 설계 결정 완료
- BottomNav는 tasks 탭을 `amber`로 정의했으나, TasksTab 내부는 루틴=teal, 할일=violet, 습관=amber로 분리되어 있음
- **결정: 섹션별 다른 색상 유지** — 시각적 구분을 위한 의도적 설계. Section 8 참고

---

## 3. 이모지 사용 규칙

### 3.1 홈 탭 (HomeTab)
```
🔥  → 연속 출석 스트릭 (Flame 아이콘)
🎉  → 보너스/달성 이벤트
☀️  → 습관 (미니 스탯 그리드)
🔁  → 루틴
🗂️  → 프로젝트
📋  → 할 일
✍️  → 오늘의 활동 (Daily Activity)
🤖  → AI 자동 채점 배지
```

### 3.2 할일 탭 (TasksTab) 섹션
```
🔁  → 루틴 (Routine)
☀️  → 습관 (Daily Habit)
📋  → 할 일 (Todo)
🎉  → 루틴/보너스 완수
⏰  → 마감 시간 보너스 알림
```

### 3.3 전투 탭 (BattleTab) 이모지
```
⚔️   → 일반 공격
🔮   → 스킬 공격
💨   → 회피/빗나감
💥   → 치명타
💥💥 → 치명타 + 더블
💥🔮 → 치명타 + 스킬
⚡⚡  → 더블 히트
```

### 3.4 스탯 아이콘 (Lucide React 통일)

모든 컴포넌트에서 스탯은 Lucide React 아이콘을 사용합니다.

```tsx
import { Sword, Heart, Wind, Brain, Star } from "lucide-react"

STR(힘)    → <Sword />
VIT(체력)  → <Heart />
DEX(민첩)  → <Wind />
INT(지능)  → <Brain />
LUK(운)    → <Star />
```

> CharacterTab, BattleTab 모두 Lucide 아이콘으로 통일 완료.

### 3.5 스킬 탭 (SkillsTab/CharacterTab)
```
🛡  / <Shield />  → 패시브 스킬
⚡  / <Zap />     → 액티브 스킬
🔒  / <Lock />    → 미해금 스킬
✦               → 패시브 배지 텍스트
```

### 3.6 아이템 탭 - 장비 슬롯
```
🗡️   → 무기 (Weapon)
⛑️   → 투구 (Helmet)
🥋   → 갑옷 (Armor)
👖   → 바지 (Pants)
🪢   → 벨트 (Belt)
🧤   → 장갑 (Glove)
👟   → 신발 (Shoe)
💍   → 반지 (Ring)
📿   → 목걸이 (Necklace)
```

### 3.7 프로젝트 탭
```
🗂️  → 프로젝트 헤더
📚  / <BookOpen />  → 프로젝트 묶음 (Chapters)
🏆  / <Trophy />    → 완료된 묶음
⚠   → 마감 임박 경고
```

### 3.8 CharacterPanel 리소스
```
✦   → SP (스탯 포인트)
⚡   → SKP (스킬 포인트)
🎫   → 뽑기권 (Draw Tickets)
```

---

## 4. 색상 시스템

### 4.1 아이템 그레이드 색상

```tsx
const GRADE_COLOR: Record<string, string> = {
  C: "#9CA3AF",   // 회색   — 일반
  B: "#4FBF8F",   // 초록   — 고급
  A: "#4FA8E8",   // 파랑   — 희귀
  S: "#F5A524",   // 주황   — 영웅
  SR: "#9B7BE8",  // 보라   — 전설
  SSR: "#FFD700", // 금색   — 고대
  UR: "#FF1493",  // 핫핑크 — 신화
}
const GRADE_BG: Record<string, string> = {
  C:   "#F3F4F6",
  B:   "#E3F5EC",
  A:   "#E1EFFB",
  S:   "#FFF1D6",
  SR:  "#ECE5FA",
  SSR: "#FFFDE6",
  UR:  "rgba(255,20,147,0.08)",
}
```

| 등급 | 라벨 | 색상 코드 | 색상 설명 |
|-----|------|---------|---------|
| C | 일반 | `#9CA3AF` | 회색 |
| B | 고급 | `#4FBF8F` | 초록 |
| A | 희귀 | `#4FA8E8` | 파랑 |
| S | 영웅 | `#F5A524` | 주황 |
| SR | 전설 | `#9B7BE8` | 보라 |
| SSR | 고대 | `#FFD700` | 금색 |
| UR | 신화 | `#FF1493` | 핫핑크 |

### 4.2 몬스터 그레이드 색상 ⚠️ 아이템과 다름

```tsx
const GRADE_META = {
  C:   { name: "잡몹",     color: "#808080" },  // 회색
  B:   { name: "정예",     color: "#2E8B57" },  // 시포그린
  A:   { name: "희귀",     color: "#1E90FF" },  // 도저블루
  S:   { name: "네임드",   color: "#DC143C" },  // 크림슨레드 (아이템 S=주황과 다름!)
  SR:  { name: "필드보스", color: "#8A2BE2" },  // 블루바이올렛
  SSR: { name: "재앙",     color: "#DAA520" },  // 골든로드
  UR:  { name: "종말",     color: "#FF8C00" },  // 다크오렌지 (아이템 UR=핫핑크와 다름!)
}
```

> ⚠️ S등급: 아이템(주황 `#F5A524`) vs 몬스터(크림슨 `#DC143C`) 완전 다름
> ⚠️ UR등급: 아이템(핫핑크 `#FF1493`) vs 몬스터(오렌지 `#FF8C00`) 완전 다름

### 4.3 캐릭터 스탯 색상

```tsx
const STATS = [
  { key: "str",      label: "STR",  color: "text-red-500",    bar: "bg-red-400",    bg: "bg-red-50" },
  { key: "vit",      label: "VIT",  color: "text-emerald-500", bar: "bg-emerald-400", bg: "bg-emerald-50" },
  { key: "dex",      label: "DEX",  color: "text-sky-500",    bar: "bg-sky-400",    bg: "bg-sky-50" },
  { key: "int_stat", label: "INT",  color: "text-violet-500", bar: "bg-violet-400", bg: "bg-violet-50" },
  { key: "luk",      label: "LUK",  color: "text-amber-500",  bar: "bg-amber-400",  bg: "bg-amber-50" },
]
```

| 스탯 | 설명 | 텍스트 색상 | 바 색상 |
|-----|------|-----------|--------|
| STR | 힘/물리공격 | `text-red-500` | `bg-red-400` |
| VIT | 체력/방어 | `text-emerald-500` | `bg-emerald-400` |
| DEX | 민첩/회피 | `text-sky-500` | `bg-sky-400` |
| INT | 지능/마법 | `text-violet-500` | `bg-violet-400` |
| LUK | 운/크리 | `text-amber-500` | `bg-amber-400` |

> **색상 적용 조건:** `base > 0 || added > 0 || hasItemBonus` — 기존 스탯값이 있거나, 이번 세션에서 배분 중이거나, 아이템 보너스가 있으면 테마색 적용. 셋 다 0이면 회색(muted).

### 4.4 CharacterPanel 리소스 바 색상

캐릭터 패널 상단의 HP/MP/XP 게이지와 리소스 필 색상입니다.

```tsx
// HP / MP / XP 바
{ label: 'HP', color: '#F58FA8' }  // 분홍색
{ label: 'MP', color: '#7FB3F5' }  // 하늘색
{ label: 'XP', color: '#F5C879' }  // 노란색

// 리소스 필 (Row 3)
SP  (스탯포인트): background '#FFF1E0', color '#B5651D'  // 주황 계열
SKP (스킬포인트): background '#F0ECFB', color '#7A6BD6'  // 보라 계열
뽑기권:           background '#FFF4DC', color '#B5651D'  // 주황 계열

// 레벨 배지
Lv. 배지: color '#A89BF0', background '#F0ECFB'          // 연보라
```

### 4.5 전투 로그 색상

```
플레이어 공격: 왼쪽 사이드바 bg-blue-400, 텍스트 text-blue-600
몬스터 공격:  왼쪽 사이드바 bg-red-400,  텍스트 text-red-500
내 HP 바:    #ef4444 (red-500)
몬스터 HP 바: #f97316 (orange-500)
턴 번호:     text-blue-500
```

### 4.6 출석 체크 (HomeTab) 색상

```tsx
// 카드 전체
border: '1px solid #FFE0BF'
background: 'linear-gradient(135deg, #FFF8EE 0%, #FFEDD5 100%)'

// 스트릭 배지
background: 'white', border: '1px solid #FFE0BF', color: '#B5651D'

// 스트릭 바 (완료된 칸)
background: '#FFB87A'
// 스트릭 바 (빈 칸)
background: 'rgba(255,138,61,0.18)'

// 출석 버튼 (활성)
background: '#FFB87A', color: 'white', boxShadow: '0 2px 6px rgba(255,138,61,0.3)'
// 출석 버튼 (완료)
background: '#E5E7EB', color: '#9CA3AF'
```

### 4.7 DAILY QUEST 카드 (TasksTab 상단)

```tsx
background: 'linear-gradient(135deg, #FFFAEF, #FFF1E0)'
border: '1px solid #FFE3C7'
진행 원형 바: stroke '#FFB87A'
텍스트: color '#B5651D'
```

### 4.8 습관 스트릭 단계별 색상

```tsx
const streakColor =
  streak >= 100 ? "text-yellow-600 bg-yellow-50 border-yellow-200" :  // 🏆 완전 습관
  streak >= 30  ? "text-red-600 bg-red-50 border-red-200" :           // 🔥 자리잡는 중
  streak >= 7   ? "text-orange-600 bg-orange-50 border-orange-200" :  // 🔥 적응 중
  streak >= 1   ? "text-orange-500 bg-orange-50 border-orange-100" :  // 🌱 시작
                  "text-muted-foreground bg-muted border-border"       // 아직 시작 전

const streakLabel =
  streak >= 100 ? "🏆 완전 습관" :
  streak >= 90  ? `💫 ${streak}일 (루틴 완성)` :
  streak >= 60  ? `🔥 ${streak}일 (습관 완성!)` :
  streak >= 30  ? `🔥 ${streak}일 (자리잡는 중)` :
  streak >= 14  ? `🔥 ${streak}일 (유지 중)` :
  streak >= 7   ? `🔥 ${streak}일 (적응 중)` :
  streak >= 1   ? `🌱 ${streak}일 (시작)` :
                  "아직 시작 전"
```

### 4.9 스킬 색상

SkillsTab과 CharacterTab에서 패시브/액티브 색상이 미묘하게 다릅니다.

| 스킬 타입 | 아이콘 | 활성화 배경 | 텍스트 |
|---------|--------|-----------|--------|
| 패시브 (Passive) | Shield | `bg-violet-500` / `bg-violet-50` | `text-violet-700` |
| 액티브 (Active) | Zap | `bg-purple-500` / `bg-purple-50` | `text-purple-700` |
| 미해금 (Locked) | Lock | `bg-muted` opacity-60 | `text-gray-400` |
| 트리거 배지 | — | `bg-purple-100` | `text-purple-600` |

> 참고: `violet`과 `purple`은 Tailwind에서 서로 다른 색상. violet은 보라(파란 계열), purple은 자주(빨간 계열).

---

## 5. 프로젝트 색상 팔레트

프로젝트마다 사용자가 색상을 선택할 수 있습니다.

```tsx
const COLOR_OPTIONS = [
  { value: "violet",  label: "보라", cls: "bg-violet-500" },
  { value: "blue",    label: "파랑", cls: "bg-blue-500" },
  { value: "emerald", label: "초록", cls: "bg-emerald-500" },
  { value: "amber",   label: "노랑", cls: "bg-amber-500" },
  { value: "rose",    label: "빨강", cls: "bg-rose-500" },
]
```

---

## 6. 우선순위 & 상태 라벨

### 우선순위 (Priority)

```tsx
const PRIORITY_COLOR = {
  high:   "text-red-400 bg-red-400/10",
  medium: "text-yellow-400 bg-yellow-400/10",
  low:    "text-slate-400 bg-slate-400/10",
}
const PRIORITY_LABEL = { high: "높음", medium: "보통", low: "낮음" }
```

### 프로젝트 상태 (Status)

```tsx
const STATUS_LABEL = { todo: "시작 전", in_progress: "진행 중", done: "완료" }
```

| 상태 | 라벨 | 선택 시 색상 |
|-----|------|-----------|
| todo | 시작 전 | 기본 (`border-border`) |
| in_progress | 진행 중 | `bg-violet-500 text-white` |
| done | 완료 | `line-through text-muted-foreground` |

---

## 7. 공통 토스트/피드백 색상

| 상황 | 배경 | 텍스트 |
|-----|------|--------|
| 성공/EXP 획득 | `bg-amber-400` | `text-white` |
| 패널티/실패 | `bg-red-400` | `text-white` |
| 성공 인라인 | `bg-amber-50 border-amber-200` | `text-amber-600` |
| 오류 인라인 | `bg-red-50 border-red-200` | `text-red-600` |
| 삭제 확인 버튼 | `bg-red-500` | `text-white` |

---

## 8. 의도적 설계 결정 사항

불일치처럼 보이지만 **의도적으로 다르게 설계된** 항목들입니다. 변경하지 마세요.

| 항목 | 설계 결정 | 이유 |
|-----|---------|------|
| **Tasks 섹션별 색상** | 루틴=teal, 습관=amber, 할일=violet | 섹션마다 시각적으로 구분하기 위한 의도적 선택 |
| **스킬 passive=violet, active=purple** | violet(파란계열 보라)과 purple(자주계열)을 구분 | 패시브(지속 효과)와 액티브(발동 효과)를 색으로 구분 |
| **아이템 vs 몬스터 등급 색상** | 아이템(예쁜 색)과 몬스터(강렬한 색)가 다름 | 아이템=소유감, 몬스터=위협감을 다른 감성으로 표현 |
| **루틴 개별 카드 구조** | 루틴 헤더=별도 카드, 각 루틴=독립 아코디언 카드 (습관/할일은 단일 컨테이너) | 루틴은 그룹→하위항목 2단계 계층 구조라 아코디언 필요. 단일 컨테이너로 통일 불가 |

---

## 9. 설계 패턴

### 9.1 카드/섹션 헤더 패턴

```tsx
// 각 섹션 헤더 (예: 루틴)
<div className="px-4 py-3 flex items-center justify-between bg-teal-50">
  <span className="text-sm">🔁</span>
  <span className="text-sm font-bold">루틴</span>
</div>
```

### 9.2 그라디언트 배경

강조 섹션에 사용:
```tsx
// 프로젝트 섹션
"bg-gradient-to-br from-violet-500/10 via-card to-card"

// DAILY QUEST 카드
style={{ background: 'linear-gradient(135deg, #FFFAEF, #FFF1E0)' }}

// 스킬 포인트 헤더
"bg-gradient-to-r from-purple-500 to-violet-500"
```

### 9.3 배지 패턴

```tsx
// AI 자동 채점 배지
style={{ background: '#EFEAFE', color: '#6E59F2' }}

// 패시브 스킬 배지
className="bg-purple-100 text-purple-600 border border-purple-200"

// ×2배 보너스 배지
style={{ background: '#FFF1E0', color: '#B5651D', border: '1px solid #FFE3C7' }}
```

---

## 10. 다크모드 규칙

`globals.css` 기준:
- 라이트: `--foreground: oklch(0.145)` (거의 검정), `--background: oklch(1)` (흰색)
- 다크: `--foreground: oklch(0.985)` (거의 흰색), `--background: oklch(0.145)` (거의 검정)

### 10.1 위험 패턴 (다크모드에서 텍스트 안 보임)

```tsx
// ❌ 밝은 배경 + text-foreground → 다크모드에서 흰 글씨가 밝은 배경 위에 = 안 보임
<div style={{ background: '#FFF8EE' }}>
  <p className="text-foreground">텍스트</p>
</div>

// ❌ bg-*-50 계열 카드 + text-foreground (dark: 변형 없이)
<div className="bg-green-50">
  <p className="text-foreground">텍스트</p>
</div>
```

### 10.2 안전 패턴

```tsx
// ✅ 방법 A: 하드코딩 밝은 배경 → 텍스트도 어둡게 고정
<div style={{ background: '#FFF8EE' }}>
  <p className="text-gray-900">텍스트</p>
</div>

// ✅ 방법 B: 카드 bg에 dark: 변형 추가 → text-foreground가 자동으로 맞춰짐
<div className="bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800">
  <p className="text-foreground">텍스트</p>
</div>

// ✅ 방법 C: Tailwind 시맨틱 토큰만 사용
<div className="bg-background border-border">
  <p className="text-foreground">텍스트</p>
</div>
```

### 10.3 자주 쓰는 카드 bg 다크모드 쌍

| 라이트 | 다크 변형 | 테두리 다크 |
|--------|---------|------------|
| `bg-green-50` | `dark:bg-green-950/40` | `dark:border-green-800` |
| `bg-indigo-50` | `dark:bg-indigo-950/40` | `dark:border-indigo-800` |
| `bg-violet-50` | `dark:bg-violet-950/40` | `dark:border-violet-800` |
| `bg-amber-50` | `dark:bg-amber-950/40` | `dark:border-amber-800` |
| `bg-teal-50` | `dark:bg-teal-950/40` | `dark:border-teal-800` |
| `bg-red-50` | `dark:bg-red-950/40` | `dark:border-red-800` |
| `bg-orange-50` | `dark:bg-orange-950/40` | `dark:border-orange-800` |

---

## 11. 신규 컴포넌트 체크리스트

- [ ] 해당 섹션의 **공식 색상**을 사용했는가? (이 문서 기준)
- [ ] **이모지**가 같은 기능에 이미 쓰이는 것과 일치하는가?
- [ ] 상태별 색상이 올바른가? (성공=emerald, 경고=red, 보너스=amber)
- [ ] 아이콘은 **Lucide React**를 사용했는가? (텍스트 이모지 혼용 주의)
- [ ] 토스트/피드백 색상이 공통 패턴을 따르는가?
- [ ] **다크모드**: `bg-*-50` 계열에 `dark:bg-*-950/40` 추가했는가?
- [ ] **다크모드**: 하드코딩 밝은 배경(`#FFF...`) 위에 `text-foreground` 쓰지 않았는가?
