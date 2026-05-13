# lib/constants

게임 로직·UI·시간 등 코드 내 인라인 매직넘버·문자열의 단일 출처.

## 원칙
- **새 매직넘버를 발견하면 즉시 여기로 추출하라.** route/queries/컴포넌트에 인라인 숫자/문자열이 들어가면 안 된다.
- **DB cfg 테이블(`game_config`, `battle_config`)에서 읽는 값은 상수로 옮기지 않는다.** (예: `base_exp`, `level_multiplier`, `vit_to_max_hp`)
  - 이 값들은 이미 외부화돼 있고 사용자가 SettingsDrawer에서 조정한다.
  - 코드에 인라인된 폴백 기본값(예: `parseFloat(cfg.x ?? "0.03")`)도 가급적 여기로 옮긴다.
- **값 자체는 변경하지 않는다.** Phase 1은 위치만 옮기는 작업. 표기 통일도 금지(예: `0.1`을 `0.10`으로 쓰지 않음).
- **파일 분리 기준**: 도메인. EXP 보상 → `exp.ts`, 전투 → `battle.ts`, 가챠 → `gacha.ts`, AI 한계 → `ai.ts`, 시간 → `time.ts`, 퀘스트 → `quest.ts`, UI 색상/등급 라벨 → `ui.ts`.

## 파일별 책임
| 파일 | 도메인 |
|---|---|
| `exp.ts` | 체크리스트·투두·루틴 EXP 보너스·페널티 수식 매개변수 |
| `battle.ts` | 전투 명중·치명타·회피 등 매직넘버 (cfg 폴백값) |
| `gacha.ts` | 가챠 등급/슬롯/스탯 롤링 비율 |
| `ai.ts` | Gemini 응답 EXP 범위/기본값 |
| `time.ts` | KST 오프셋, 루틴 마감 컷오프, UI 자동 닫힘 시간 등 |
| `quest.ts` | 퀘스트 보상 기본 범위 |
| `ui.ts` | 색상·등급·우선순위 라벨 등 시각 상수 |

새 도메인이 생기면 이 표를 업데이트하라.
