# LifeQuest 디자인 가이드

라이프퀘스트의 일관된 디자인을 유지하기 위한 가이드입니다. 이모지, 색상, 아이콘, 각 섹션별 테마를 정리했습니다.

---

## 1. 탭별 테마색

각 탭마다 고유의 테마 색상이 정해져 있습니다. 해당 탭 관련 요소는 이 색상을 사용하세요.

| 탭 | 색상 | Tailwind 클래스 | 사용처 |
|-----|------|-----------------|--------|
| **홈** (Home) | 녹색 | `emerald-500` | 출석, 홈 관련 강조 |
| **할일** (Tasks) | 주황색 | `amber-500` | 할일, 습관, 활동 관련 |
| **전투** (Battle) | 빨강색 | `red-500` | 전투, 몬스터, 전사 관련 |
| **캐릭터** (Skills) | 보라색 | `purple-500` | 캐릭터, 스킬, 스탯 관련 |
| **아이템** (Items) | 하늘색 | `sky-500` | 아이템, 가챠, 장비 관련 |

### 사용 예시
```tsx
// 홈 탭 강조 배경
className="bg-emerald-50 border-emerald-200"

// 할일 탭 텍스트
className="text-amber-500 font-bold"

// 아이템 탭 배지
className="bg-sky-500 text-white"
```

---

## 2. 이모지 사용 규칙

### 2.1 탭 아이콘 (BottomNav)
```
홈      → 👤 User 아이콘
할일    → ☑️ CheckSquare 아이콘
전투    → ⚔️ Swords 아이콘
캐릭터  → ✨ Sparkles 아이콘
아이템  → 🛍️ ShoppingBag 아이콘
```

### 2.2 섹션 이모지

#### 홈 탭 (Home)
```
🔥  → 연속일 스트릭
🎉  → 보너스/특별 이벤트
☀️  → 습관 (Daily Habits)
🔁  → 루틴 (Routines)
🗂️  → 프로젝트 (Projects)
📋  → 할 일 (Todos)
✍️  → 오늘의 활동 (Daily Activity)
🤖  → AI 자동 채점
```

#### 할일/활동 탭 (Tasks)
```
💪  → 일일 습관
🎯  → 투두
⏰  → 루틴/시간 제한
📌  → 고정 항목
```

#### 아이템/장비 탭 (Items)

**장비 슬롯:**
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

#### 캐릭터/스탯 탭 (Character)
**스탯 아이콘:**
```
⚔️  → STR (힘)
❤️  → VIT (체력)
💨  → DEX (민첩)
🧠  → INT (지능)
⭐  → LUK (운)

✦   → 패시브 스킬 (Passive Skill)
⚡  → 액티브 스킬 (Active Skill)
🔒  → 잠금/미해금 (Locked)
```

#### 프로젝트 탭 (Projects)
```
🗂️  → 프로젝트 전체
📚  → 프로젝트 묶음 (Chapters)
🏆  → 완료된 묶음
```

---

## 3. 색상 시스템

### 3.1 아이템 그레이드별 색상

아이템 가챠에서 그레이드별로 색상이 정해져 있습니다.

| 그레이드 | 라벨 | 색상 코드 | 배경색 | 사용처 |
|---------|------|---------|--------|--------|
| **C** | 일반 | `#9CA3AF` | `#F3F4F6` | 가장 낮은 등급 |
| **B** | 고급 | `#4FBF8F` | `#E3F5EC` | 일반적인 등급 |
| **A** | 희귀 | `#4FA8E8` | `#E1EFFB` | 좋은 등급 |
| **S** | 영웅 | `#F5A524` | `#FFF1D6` | 최상급 |
| **SR** | 전설 | `#9B7BE8` | `#ECE5FA` | 전설급 |
| **SSR** | 고대 | `#FFD700` | `#FFFDE6` | 고대급 |
| **UR** | 신화 | `#FF1493` | `rgba(255,20,147,0.08)` | 최고급 신화 |

```tsx
// 그레이드 배지 렌더링
const GRADE_COLOR: Record<string, string> = {
  C: "#9CA3AF", B: "#4FBF8F", A: "#4FA8E8",
  S: "#F5A524", SR: "#9B7BE8", SSR: "#FFD700", UR: "#FF1493",
}
const GRADE_BG: Record<string, string> = {
  C: "#F3F4F6", B: "#E3F5EC", A: "#E1EFFB",
  S: "#FFF1D6", SR: "#ECE5FA", SSR: "#FFFDE6", UR: "rgba(255,20,147,0.08)",
}
```

### 3.2 스탯 색상

캐릭터 스탯은 각각 고유의 색상을 가집니다.

| 스탯 | 라벨 | 설명 | 색상 | 진행바 | 배경 |
|-----|------|------|------|--------|------|
| **STR** | 힘 | 물리공격력 | `text-red-500` | `bg-red-400` | `bg-red-50` |
| **VIT** | 체력 | 방어력/HP | `text-emerald-500` | `bg-emerald-400` | `bg-emerald-50` |
| **DEX** | 민첩 | 정확도/회피 | `text-sky-500` | `bg-sky-400` | `bg-sky-50` |
| **INT** | 지능 | 마법공격력 | `text-violet-500` | `bg-violet-400` | `bg-violet-50` |
| **LUK** | 운 | 크리티컬 | `text-amber-500` | `bg-amber-400` | `bg-amber-50` |

```tsx
const STATS = [
  { key: "str", label: "STR", color: "text-red-500", bar: "bg-red-400" },
  { key: "vit", label: "VIT", color: "text-emerald-500", bar: "bg-emerald-400" },
  { key: "dex", label: "DEX", color: "text-sky-500", bar: "bg-sky-400" },
  { key: "int_stat", label: "INT", color: "text-violet-500", bar: "bg-violet-400" },
  { key: "luk", label: "LUK", color: "text-amber-500", bar: "bg-amber-400" },
]
```

### 3.3 프로젝트 색상

프로젝트 마다 다양한 색상을 지정할 수 있습니다.

| 색상명 | 값 | Tailwind 클래스 |
|--------|-----|-----------------|
| 보라 | `violet` | `bg-violet-500` |
| 파랑 | `blue` | `bg-blue-500` |
| 초록 | `emerald` | `bg-emerald-500` |
| 노랑 | `amber` | `bg-amber-500` |
| 빨강 | `rose` | `bg-rose-500` |

```tsx
const COLOR_OPTIONS = [
  { value: "violet", label: "보라", cls: "bg-violet-500" },
  { value: "blue", label: "파랑", cls: "bg-blue-500" },
  { value: "emerald", label: "초록", cls: "bg-emerald-500" },
  { value: "amber", label: "노랑", cls: "bg-amber-500" },
  { value: "rose", label: "빨강", cls: "bg-rose-500" },
]
```

### 3.4 출석 체크 (Attendance)

출석 체크는 따뜻한 주황색 계열의 특별한 색상을 사용합니다.

```
주황색(활성):    #FFB87A (border: #FFE0BF)
배경 그라디언트: #FFF8EE → #FFEDD5
텍스트 색상:     #B5651D (갈색)
비활성:          #E5E7EB (회색)
```

```tsx
// 출석 체크 스타일
style={{
  border: '1px solid #FFE0BF',
  background: 'linear-gradient(135deg, #FFF8EE 0%, #FFEDD5 100%)'
}}
```

### 3.5 기타 상태 색상

| 상태 | 색상 | 사용처 |
|-----|------|--------|
| **성공/완료** | `emerald-500` | 완료 마크, 성공 메시지 |
| **경고/마감임박** | `red-500` | 마감 임박, 경고 |
| **정보/진행중** | `violet-500` | 진행중, 강조 |
| **로딩/보너스** | `amber-400` | AI 자동 판정, 보너스 표시 |
| **수동/비활성** | `muted-foreground` | 비활성, 보조 텍스트 |

---

## 4. 우선순위 배지 (Priority Labels)

| 우선순위 | 라벨 | 텍스트 색상 | 배경색 |
|---------|------|-----------|--------|
| **높음** | 높음 | `text-red-400` | `bg-red-400/10` |
| **보통** | 보통 | `text-yellow-400` | `bg-yellow-400/10` |
| **낮음** | 낮음 | `text-slate-400` | `bg-slate-400/10` |

```tsx
const PRIORITY_COLOR: Record<string, string> = {
  high: "text-red-400 bg-red-400/10",
  medium: "text-yellow-400 bg-yellow-400/10",
  low: "text-slate-400 bg-slate-400/10",
}
```

---

## 5. 상태 라벨

| 상태 | 한국어 | 색상 |
|-----|--------|------|
| **todo** | 시작 전 | `muted-foreground` |
| **in_progress** | 진행 중 | `violet-400` |
| **done** | 완료 | `emerald-500` |

---

## 6. 설계 패턴

### 6.1 서론/설명 부분 배지

AI 자동 채점, 패시브 스킬 등 특수한 기능을 표시하는 배지는 밝은 배경색을 사용합니다.

```tsx
// AI 자동 채점 배지
style={{ background: '#EFEAFE', color: '#6E59F2' }}
// 또는
className="bg-purple-100 text-purple-600"

// 패시브 스킬 배지
className="bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400"
```

### 6.2 카드 테두리 (Border)

- **기본 카드**: `border-border` (회색 계열)
- **강조된 항목**: 해당 탭의 테마색으로 변경
  - 홈: `border-emerald-500/20`
  - 할일: `border-amber-500/20`
  - 전투: `border-red-500/20`
  - 캐릭터: `border-purple-500/20`
  - 아이템: `border-sky-500/20`

### 6.3 배경 그라디언트

특별한 강조가 필요한 섹션에는 그라디언트 배경을 사용합니다.

```tsx
className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-card to-card"
```

---

## 7. 디자인 체크리스트

새로운 컴포넌트나 섹션을 만들 때 다음을 확인하세요:

- [ ] 해당 섹션의 **탭 테마색**이 적용되었는가?
- [ ] 관련 **이모지**가 일관되게 사용되었는가?
- [ ] 상태별로 **올바른 색상**이 사용되었는가? (성공=초록, 경고=빨강 등)
- [ ] 텍스트가 **가독성 있는 색상**인가?
- [ ] 다크모드에서도 색상이 잘 보이는가?
- [ ] 아이템 그레이드 등의 **기본 색상 시스템**을 따르고 있는가?

---

## 8. 참고

- Tailwind CSS의 기본 색상 팔레트를 사용합니다.
- Dark mode 지원을 위해 `dark:` prefix를 적절히 사용하세요.
- 접근성(Accessibility)을 위해 색상만으로 정보를 전달하지 않도록 주의하세요.
- 새로운 색상이 필요한 경우 이 문서를 업데이트하고 팀에 공유하세요.
