import type { Client } from "@libsql/client"
import { now } from "./client"

export async function seedIfEmpty(db: Client) {
  const res = await db.execute("SELECT COUNT(*) AS cnt FROM game_config")
  if ((res.rows[0].cnt as number) > 0) return

  await seedGameConfig(db)
  await seedBattleConfig(db)
  await seedItemGradeTable(db)
  await seedItemSlotTable(db)
  await seedItemAbilityPool(db)
  await seedItemPassivePool(db)
  await seedMonsterTable(db)
  await seedPrompt(db)
  await seedChecklistItems(db)
  await seedCharacter(db)
}

export async function ensureItemSeeds(db: Client) {
  const res = await db.execute("SELECT COUNT(*) AS cnt FROM item_grade_table")
  if ((res.rows[0].cnt as number) > 0) return
  await seedItemGradeTable(db)
  await seedItemSlotTable(db)
  await seedItemAbilityPool(db)
  await seedItemPassivePool(db)
}

export async function ensureChecklistItems(db: Client) {
  const res = await db.execute("SELECT COUNT(*) AS cnt FROM checklist_item")
  if ((res.rows[0].cnt as number) > 0) return
  await seedChecklistItems(db)
}

export async function ensurePrompt(db: Client) {
  const res = await db.execute("SELECT COUNT(*) AS cnt FROM prompt WHERE category='general' AND is_active=1")
  if ((res.rows[0].cnt as number) > 0) return
  await seedPrompt(db)
}

export async function ensureSkills(db: Client) {
  const res = await db.execute("SELECT COUNT(*) AS cnt FROM skill_table")
  if ((res.rows[0].cnt as number) > 0) return
  await seedSkillTable(db)
}

async function seedSkillTable(db: Client) {
  // [id, name, type, max_skp, unlock_level, base_effect_value, effect_coeff,
  //  mp_cost, mp_cost_coeff, effect_code, trigger_condition, description]
  const skills: [string, string, string, number, number, number, number, number, number, string, string, string][] = [
    ["ACTIVE_RAGE_01",         "분노",        "active",  20, 3,   30, 6,    20, 1,    "PATK_PCT",  "전투 시작",    "물리 ATK 증가"],
    ["ACTIVE_CHAIN_01",        "연속공격",    "active",  20, 5,   20, 2,    10, 0.5,  "EXTRA_HIT", "명중 시",      "추가 타격 발동"],
    ["ACTIVE_FIRST_STRIKE_01", "선제 강타",   "active",  20, 9,   20, 4,    15, 0.75, "PATK_PCT",  "선공 획득",    "물리 ATK 증가"],
    ["ACTIVE_AFTERIMAGE_01",   "잔상",        "active",  20, 14,  10, 2.5,  8,  0.4,  "EXTRA_HIT", "회피 시",      "반격 추가 타격"],
    ["ACTIVE_REVERSAL_01",     "역전의 의지", "active",  20, 20,  5,  1.25, 20, 1,    "HP_HEAL",   "HP 25% 이하",  "HP 회복"],
    ["ACTIVE_MANA_BURST_01",   "마나 폭발",   "active",  20, 25,  50, 7.5,  25, 1.25, "MATK_PCT",  "매 3턴",       "마법 ATK 증가"],
    ["ACTIVE_SPARK_01",        "지식의 불꽃", "active",  20, 28,  10, 3.5,  10, 0.5,  "MATK_PCT",  "치명타 시",    "마법 ATK 증가"],
    ["ACTIVE_SURVIVE_01",      "기사회생",    "active",  20, 30,  5,  2.25, 0,  0,    "SURVIVE",   "사망 시",      "사망 시 생존"],
    ["PASSIVE_PATK_01",        "전사의 기백", "passive", 20, 10,  2,  0.5,  0,  0,    "PATK_PCT",  "",             "물리 공격력 증가"],
    ["PASSIVE_HP_01",          "강철 피부",   "passive", 20, 20,  2,  0.5,  0,  0,    "HP_PCT",    "",             "최대 HP 증가"],
    ["PASSIVE_DEX_01",         "신속함",      "passive", 20, 30,  1,  0.5,  0,  0,    "DEX_FLAT",  "",             "DEX 고정값 증가"],
    ["PASSIVE_MATK_01",        "마법 친화",   "passive", 20, 40,  2,  0.5,  0,  0,    "MATK_PCT",  "",             "마법 공격력 증가"],
    ["PASSIVE_LUK_01",         "행운아",      "passive", 20, 50,  1,  0.5,  0,  0,    "LUK_FLAT",  "",             "LUK 고정값 증가"],
    ["PASSIVE_PDEF_01",        "철벽",        "passive", 20, 60,  5,  1,    0,  0,    "PDEF_PCT",  "",             "물리 방어력 증가"],
    ["PASSIVE_CRIT_RATE_01",   "예리한 눈",   "passive", 20, 70,  0.5, 0.25, 0, 0,   "CRIT_RATE", "",             "치명타율 증가"],
    ["PASSIVE_CRIT_DMG_01",    "파열의 법칙", "passive", 20, 80,  5,  1.5,  0,  0,    "CRIT_DMG",  "",             "치명타 피해 증가"],
    ["PASSIVE_MDEF_01",        "마법 저항",   "passive", 20, 90,  5,  1,    0,  0,    "MDEF_PCT",  "",             "마법 방어력 증가"],
    ["PASSIVE_CRIT_RATE_02",   "신의 총애",   "passive", 20, 100, 1,  0.5,  0,  0,    "CRIT_RATE", "",             "치명타율 증가"],
  ]
  for (const [id, name, type, max_skp, unlock_level, bev, ec, mp, mpc, effect_code, trigger, desc] of skills) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO skill_table
            (id, name, type, max_skp, unlock_level, base_effect_value, effect_coeff,
             mp_cost, mp_cost_coeff, effect_code, trigger_condition, description, is_active)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1)`,
      args: [id, name, type, max_skp, unlock_level, bev, ec, mp, mpc, effect_code, trigger, desc],
    })
  }
}

async function seedGameConfig(db: Client) {
  const t = now()
  const data: [string, string, string][] = [
    ["base_exp", "100", "레벨 1→2 필요 EXP 기본값"],
    ["level_multiplier", "1.01", "매 레벨 EXP 증가 배율"],
    ["stat_points_per_level", "3", "레벨업 시 지급 스탯 포인트"],
    ["skill_points_per_level", "2", "레벨업 시 지급 스킬 포인트"],
    ["draw_tickets_per_level", "1", "레벨업 시 지급 뽑기권"],
    ["base_hp", "100", "캐릭터 기본 HP"],
    ["base_mp", "50", "캐릭터 기본 MP"],
    ["monster_grade_C_prob", "40.0", "잡몹 출현 확률"],
    ["monster_grade_B_prob", "25.0", "정예 출현 확률"],
    ["monster_grade_A_prob", "18.0", "희귀 출현 확률"],
    ["monster_grade_S_prob", "10.0", "네임드 출현 확률"],
    ["monster_grade_SR_prob", "4.5", "필드보스 출현 확률"],
    ["monster_grade_SSR_prob", "2.0", "재앙 출현 확률"],
    ["monster_grade_UR_prob", "0.5", "종말 출현 확률"],
    ["monster_grade_C_mult", "1.0", "잡몹 능력치 계수"],
    ["monster_grade_B_mult", "1.5", "정예 능력치 계수"],
    ["monster_grade_A_mult", "2.0", "희귀 능력치 계수"],
    ["monster_grade_S_mult", "3.0", "네임드 능력치 계수"],
    ["monster_grade_SR_mult", "4.5", "필드보스 능력치 계수"],
    ["monster_grade_SSR_mult", "7.0", "재앙 능력치 계수"],
    ["monster_grade_UR_mult", "10.0", "종말 능력치 계수"],
    ["monster_grade_C_tickets", "1", "잡몹 처치 뽑기권"],
    ["monster_grade_B_tickets", "2", "정예 처치 뽑기권"],
    ["monster_grade_A_tickets", "3", "희귀 처치 뽑기권"],
    ["monster_grade_S_tickets", "5", "네임드 처치 뽑기권"],
    ["monster_grade_SR_tickets", "7", "필드보스 처치 뽑기권"],
    ["monster_grade_SSR_tickets", "10", "재앙 처치 뽑기권"],
    ["monster_grade_UR_tickets", "15", "종말 처치 뽑기권"],
    ["monster_grade_C_exp", "50", "잡몹 처치 EXP"],
    ["monster_grade_B_exp", "100", "정예 처치 EXP"],
    ["monster_grade_A_exp", "180", "희귀 처치 EXP"],
    ["monster_grade_S_exp", "300", "네임드 처치 EXP"],
    ["monster_grade_SR_exp", "500", "필드보스 처치 EXP"],
    ["monster_grade_SSR_exp", "800", "재앙 처치 EXP"],
    ["monster_grade_UR_exp", "1500", "종말 처치 EXP"],
    ["monster_level_scale", "0.04", "유저 레벨당 몬스터 능력치 계수 증가"],
    ["monster_clear_scale", "0.03", "클리어 횟수당 몬스터 능력치 계수 증가"],
  ]
  for (const [key, val, desc] of data) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO game_config (config_key, config_value, description, updated_at) VALUES (?,?,?,?)",
      args: [key, val, desc, t],
    })
  }
}

async function seedBattleConfig(db: Client) {
  const t = now()
  const data: [string, string, string, number, number, number][] = [
    ["base_accuracy", "0.9", "기본 명중률", 0.5, 1.0, 0.01],
    ["accuracy_per_dex", "0.005", "DEX당 명중률 증가", 0.0, 0.05, 0.001],
    ["evasion_per_dex", "0.003", "DEX당 회피율 증가", 0.0, 0.05, 0.001],
    ["base_crit_multiplier", "1.5", "기본 치명타 배율", 1.0, 5.0, 0.1],
    ["crit_rate_per_luk", "0.005", "내 LUK당 치명타율", 0.0, 0.05, 0.001],
    ["crit_suppression_per_enemy_luk", "0.003", "적 LUK당 치명타 억제", 0.0, 0.05, 0.001],
    ["crit_multiplier_per_int", "0.01", "INT당 치명타 배율 추가", 0.0, 0.1, 0.005],
    ["str_to_patk", "2.0", "STR당 물리 공격력 보너스", 0.0, 10.0, 0.5],
    ["vit_to_max_hp", "10.0", "VIT당 최대 HP 보너스", 0.0, 50.0, 1.0],
    ["int_to_matk", "2.0", "INT당 마법 공격력 보너스", 0.0, 10.0, 0.5],
    ["int_to_max_mp", "5.0", "INT당 최대 MP 보너스", 0.0, 30.0, 1.0],
    ["double_attack_chance", "0.0", "더블 어택 발동 확률", 0.0, 1.0, 0.01],
    ["life_steal_ratio", "0.0", "생명 흡수 비율", 0.0, 1.0, 0.01],
    ["defense_ignore_ratio", "0.0", "방어 무시 비율", 0.0, 1.0, 0.01],
    ["damage_random_min", "0.9", "데미지 난수 최솟값", 0.5, 1.0, 0.05],
    ["damage_random_max", "1.1", "데미지 난수 최댓값", 1.0, 2.0, 0.05],
    ["min_damage_ratio_by_defense", "0.1", "방어력 최소 데미지 비율", 0.0, 0.5, 0.05],
    ["total_damage_mode", "add", "총 데미지 방식", 0.0, 0.0, 0.0],
    ["first_strike_mode", "dex", "선공 결정 방식", 0.0, 0.0, 0.0],
    ["restore_hp_after_battle", "full", "전투 후 HP/MP 원복 방식", 0.0, 0.0, 0.0],
  ]
  for (const [key, val, label, mn, mx, step] of data) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO battle_config (config_key, config_value, label, min_val, max_val, step, updated_at) VALUES (?,?,?,?,?,?,?)",
      args: [key, val, label, mn, mx, step, t],
    })
  }
}

async function seedItemGradeTable(db: Client) {
  const data = [
    ["C", "일반", 1, "0", "0", "0", "1", 5, 10, 50.0],
    ["B", "고급", 1, "0~1", "0", "0", "1~2", 15, 28, 25.0],
    ["A", "희귀", 1, "1", "0~1", "0", "2~3", 35, 60, 15.0],
    ["S", "영웅", 1, "1", "1", "0", "3", 75, 120, 6.0],
    ["SR", "전설", 1, "1", "1~2", "0", "3~4", 150, 250, 3.0],
    ["SSR", "고대", 1, "1", "2", "0~1", "4~5", 300, 500, 0.9],
    ["UR", "신화", 1, "1", "2", "1", "5", 600, 1000, 0.1],
  ]
  for (const row of data) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO item_grade_table (grade,name,main_count,sub_count,combat_count,passive_count,total_count,stat_min,stat_max,weight) VALUES (?,?,?,?,?,?,?,?,?,?)",
      args: row,
    })
  }
}

async function seedItemSlotTable(db: Client) {
  const data = [
    ["weapon", "무기", "물리 공격력", JSON.stringify(["방어력", "물리방어력", "마법방어력", "마법 공격력"])],
    ["helmet", "투구", "방어력", JSON.stringify(["물리 공격력", "마법 공격력"])],
    ["armor", "갑옷", "방어력", JSON.stringify(["물리 공격력", "마법 공격력"])],
    ["pants", "바지", "마법방어력", JSON.stringify(["물리 공격력", "마법 공격력"])],
    ["belt", "벨트", "방어력", JSON.stringify(["물리 공격력", "마법 공격력"])],
    ["glove", "장갑", "명중률", JSON.stringify(["마법 공격력", "방어력", "물리방어력", "마법방어력"])],
    ["shoe", "신발", "회피율", JSON.stringify(["물리 공격력", "마법 공격력", "방어력", "물리방어력", "마법방어력"])],
    ["necklace", "목걸이", "치명타확률", JSON.stringify(["치명타피해", "물리 공격력", "방어력", "물리방어력", "마법방어력"])],
    ["ring", "반지", "치명타피해", JSON.stringify(["치명타확률", "물리 공격력", "방어력", "물리방어력", "마법방어력"])],
  ]
  for (const row of data) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO item_slot_table (slot,name,main_ability,excluded) VALUES (?,?,?,?)",
      args: row,
    })
  }
}

async function seedItemAbilityPool(db: Client) {
  const data = [
    ["STR(힘)", 2.0, "Pt", "공격력 +2", "BaseStat"],
    ["VIT(체력)", 2.0, "Pt", "최대HP +20", "BaseStat"],
    ["DEX(민첩)", 2.0, "Pt", "명중/회피 보정", "BaseStat"],
    ["INT(지능)", 2.0, "Pt", "마법공격 +2", "BaseStat"],
    ["LUK(운)", 2.0, "Pt", "치명확률 +1%", "BaseStat"],
    ["물리 공격력", 10.0, "Pt", "물리공격력 +10", "Combat"],
    ["마법 공격력", 8.0, "Pt", "마법공격력 +8", "Combat"],
    ["명중률", 1.0, "%", "명중 +1%", "Combat"],
    ["회피율", 1.0, "%", "회피 +1%", "Combat"],
    ["치명타확률", 1.0, "%", "치명 +1%", "Combat"],
    ["치명타피해", 5.0, "%", "피해 +5%", "Combat"],
    ["방어력", 5.0, "Pt", "물리방어 +5", "Combat"],
    ["마법방어력", 4.0, "Pt", "마법방어 +4", "Combat"],
    ["HP증가", 50.0, "HP", "최대HP +50", "Combat"],
    ["MP증가", 30.0, "MP", "최대MP +30", "Combat"],
  ]
  for (const row of data) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO item_ability_pool (name,base_value,unit,effect,category) VALUES (?,?,?,?,?)",
      args: row,
    })
  }
}

async function seedItemPassivePool(db: Client) {
  const data = [
    ["더블어택", "50% 확률 추가타격"],
    ["생명흡수", "피해의 5% 회복"],
    ["방어무시", "상대 DEF 10% 무시"],
    ["반사", "받은 피해의 10% 반사"],
  ]
  for (const [name, desc] of data) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO item_passive_pool (name,description) VALUES (?,?)",
      args: [name, desc],
    })
  }
}

async function seedMonsterTable(db: Client) {
  const monsters = [
    ["슬라임", "슬라임", 55, 4, 3, 3, 3, 3, 2, "흐물흐물한 젤리 생명체"],
    ["젤리", "슬라임", 50, 3, 4, 3, 3, 3, 2, "끈적한 젤리 괴물"],
    ["고블린", "고블린", 40, 8, 3, 3, 2, 4, 2, "소형 야만족 몬스터"],
    ["오크", "고블린", 50, 9, 3, 4, 2, 3, 2, "덩치 큰 오크 전사"],
    ["골렘", "골렘", 45, 6, 3, 8, 4, 1, 2, "마법으로 만들어진 석상"],
    ["스켈레톤", "언데드", 35, 5, 5, 3, 7, 3, 1, "뼈만 남은 전사 언데드"],
    ["리치", "언데드", 40, 4, 9, 3, 8, 3, 1, "강력한 마법을 쓰는 리치"],
    ["위습", "위습", 30, 2, 10, 1, 5, 4, 3, "마법 에너지 덩어리"],
    ["늑대", "늑대", 30, 7, 3, 3, 3, 8, 3, "빠른 야생 늑대"],
    ["드래곤", "드래곤", 55, 9, 9, 7, 7, 5, 4, "강대한 고대 드래곤"],
  ]
  for (const m of monsters) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO monster_table (name,race,base_hp,base_atk,base_matk,base_pdef,base_mdef,base_dex,base_luk,description) VALUES (?,?,?,?,?,?,?,?,?,?)",
      args: m,
    })
  }
}

async function seedPrompt(db: Client) {
  const content = `너는 유저의 일상 활동을 게임 성장 로그로 변환하는 AI 게임 마스터야.

유저가 입력한 활동 내용을 평가하고 아래 JSON 형식으로만 응답해.

응답 규칙:
- exp: 0~200 사이 정수 (활동의 성실도·난이도·시간 고려)
- comment: 20자 이내 한국어 격려 멘트 (게임 세계관 어조)

응답 예시:
{"exp": 80, "comment": "훌륭한 수련이다! 성장이 느껴진다."}

판정 기준:
- 구체적이고 성실한 활동: 높은 EXP
- 짧거나 모호한 활동: 낮은 EXP
- 일상적 반복 활동: 중간 EXP
- 불성실하거나 거짓으로 보이는 활동: 10 이하`

  await db.execute({
    sql: "INSERT OR IGNORE INTO prompt (category, content, version, is_active, updated_at) VALUES ('general', ?, 1, 1, ?)",
    args: [content, now()],
  })
}

async function seedChecklistItems(db: Client) {
  const items = [
    ["약 복용", 10],
    ["물 2L 마시기", 15],
    ["스트레칭", 20],
    ["일기 쓰기", 25],
  ]
  for (const [name, exp] of items) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO checklist_item (name, fixed_exp) VALUES (?,?)",
      args: [name, exp],
    })
  }
}

export async function seedCharacter(db: Client) {
  const res = await db.execute("SELECT COUNT(*) AS cnt FROM character")
  if ((res.rows[0].cnt as number) > 0) return
  const t = now()
  await db.execute({
    sql: `INSERT INTO character (id,name,level,total_exp,stat_points,skill_points,draw_tickets,
          str,vit,dex,int_stat,luk,base_hp,base_mp,current_hp,max_hp,current_mp,max_mp,created_at,updated_at)
          VALUES (1,'전사',1,0,0,0,3,0,0,0,0,0,100,50,100,100,50,50,?,?)`,
    args: [t, t],
  })
}
