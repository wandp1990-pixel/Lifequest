import { createClient, type Client } from "@libsql/client"

let _client: Client | null = null
let _initialized = false

export function getClient(): Client {
  if (!_client) {
    _client = createClient({
      url: process.env.TURSO_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })
  }
  return _client
}

function now(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19)
}

// ── 스키마 ──────────────────────────────────────────────────────────────────────

const SCHEMA = `
CREATE TABLE IF NOT EXISTS character (
    id           INTEGER PRIMARY KEY,
    level        INTEGER  DEFAULT 1,
    total_exp    INTEGER  DEFAULT 0,
    stat_points  INTEGER  DEFAULT 0,
    skill_points INTEGER  DEFAULT 0,
    draw_tickets INTEGER  DEFAULT 3,
    clear_count  INTEGER  DEFAULT 0,
    task_count   INTEGER  DEFAULT 0,
    str          INTEGER  DEFAULT 1,
    vit          INTEGER  DEFAULT 1,
    dex          INTEGER  DEFAULT 1,
    int_stat     INTEGER  DEFAULT 1,
    luk          INTEGER  DEFAULT 1,
    base_hp      INTEGER  DEFAULT 100,
    base_mp      INTEGER  DEFAULT 50,
    current_hp   INTEGER  DEFAULT 110,
    max_hp       INTEGER  DEFAULT 110,
    current_mp   INTEGER  DEFAULT 55,
    max_mp       INTEGER  DEFAULT 55,
    created_at   TEXT,
    updated_at   TEXT
);
CREATE TABLE IF NOT EXISTS activity_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    input_text TEXT,
    input_type TEXT,
    exp_gained INTEGER,
    ai_comment TEXT,
    created_at TEXT
);
CREATE TABLE IF NOT EXISTS checklist_item (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT,
    fixed_exp INTEGER,
    is_active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS checklist_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id    INTEGER REFERENCES checklist_item(id),
    exp_gained INTEGER,
    checked_at TEXT
);
CREATE TABLE IF NOT EXISTS equipment (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slot        TEXT,
    name        TEXT,
    grade       TEXT,
    base_stat   INTEGER,
    options     TEXT,
    is_equipped INTEGER DEFAULT 0,
    created_at  TEXT
);
CREATE TABLE IF NOT EXISTS item_grade_table (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    grade         TEXT UNIQUE,
    name          TEXT,
    main_count    INTEGER,
    sub_count     TEXT,
    combat_count  TEXT,
    passive_count TEXT,
    total_count   TEXT,
    stat_min      INTEGER,
    stat_max      INTEGER,
    weight        REAL
);
CREATE TABLE IF NOT EXISTS item_slot_table (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    slot         TEXT UNIQUE,
    name         TEXT,
    main_ability TEXT,
    excluded     TEXT
);
CREATE TABLE IF NOT EXISTS item_ability_pool (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT,
    base_value REAL,
    unit       TEXT,
    effect     TEXT,
    category   TEXT,
    is_active  INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS item_passive_pool (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT,
    description TEXT,
    is_active   INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS todo_item (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    suggested_exp INTEGER DEFAULT 10,
    is_completed  INTEGER DEFAULT 0,
    exp_gained    INTEGER,
    ai_comment    TEXT,
    created_at    TEXT,
    completed_at  TEXT
);
CREATE TABLE IF NOT EXISTS battle_log (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    monster_name  TEXT,
    monster_grade TEXT,
    result        TEXT,
    exp_gained    INTEGER,
    draw_tickets  INTEGER,
    log_data      TEXT,
    created_at    TEXT
);
CREATE TABLE IF NOT EXISTS prompt (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    category   TEXT,
    content    TEXT,
    version    INTEGER DEFAULT 1,
    is_active  INTEGER DEFAULT 1,
    updated_at TEXT
);
CREATE TABLE IF NOT EXISTS game_config (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key   TEXT UNIQUE,
    config_value TEXT,
    description  TEXT,
    updated_at   TEXT
);
CREATE TABLE IF NOT EXISTS monster_table (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT,
    race        TEXT,
    base_hp     INTEGER,
    base_atk    INTEGER,
    base_matk   INTEGER,
    base_pdef   INTEGER,
    base_mdef   INTEGER,
    base_dex    INTEGER,
    base_luk    INTEGER,
    description TEXT,
    is_active   INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS battle_config (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key   TEXT UNIQUE,
    config_value TEXT,
    label        TEXT,
    min_val      REAL,
    max_val      REAL,
    step         REAL,
    updated_at   TEXT
);
CREATE TABLE IF NOT EXISTS skill_table (
    id                  TEXT PRIMARY KEY,
    name                TEXT,
    type                TEXT,
    max_skp             INTEGER DEFAULT 20,
    unlock_level        INTEGER,
    base_effect_value   REAL,
    effect_coeff        REAL,
    base_trigger_param  REAL    DEFAULT 0,
    trigger_param_coeff REAL    DEFAULT 0,
    mp_cost             INTEGER DEFAULT 0,
    mp_cost_coeff       REAL    DEFAULT 0,
    effect_code         TEXT,
    trigger_condition   TEXT,
    description         TEXT,
    is_active           INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS skill_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_id        TEXT REFERENCES skill_table(id),
    invested_points INTEGER DEFAULT 0,
    is_unlocked     INTEGER DEFAULT 0,
    updated_at      TEXT
);
`

export async function initDb() {
  if (_initialized) return
  _initialized = true
  const db = getClient()
  for (const stmt of SCHEMA.trim().split(";")) {
    const s = stmt.trim()
    if (s) await db.execute(s)
  }
  try { await db.execute("ALTER TABLE character ADD COLUMN clear_count INTEGER DEFAULT 0") } catch {}
  try { await db.execute("ALTER TABLE character ADD COLUMN task_count INTEGER DEFAULT 0") } catch {}
  // 레벨 1 초기 스탯 0 마이그레이션 (기존 시드값 1 → 0)
  try {
    await db.execute(
      "UPDATE character SET str=0,vit=0,dex=0,int_stat=0,luk=0 WHERE id=1 AND level=1 AND str=1 AND total_exp=0"
    )
  } catch {}
  await seedIfEmpty(db)
  await seedCharacter(db)
  await ensureChecklistItems(db)
}

async function ensureChecklistItems(db: Client) {
  const res = await db.execute("SELECT COUNT(*) AS cnt FROM checklist_item")
  if ((res.rows[0].cnt as number) > 0) return
  await seedChecklistItems(db)
}

// ── 시드 데이터 ───────────────────────────────────────────────────────────────

async function seedIfEmpty(db: Client) {
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
    ["armor", "갑옷", "물리방어력", JSON.stringify(["물리 공격력", "마법 공격력"])],
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

async function seedCharacter(db: Client) {
  const res = await db.execute("SELECT COUNT(*) AS cnt FROM character")
  if ((res.rows[0].cnt as number) > 0) return
  const t = now()
  await db.execute({
    sql: `INSERT INTO character (id,level,total_exp,stat_points,skill_points,draw_tickets,
          str,vit,dex,int_stat,luk,base_hp,base_mp,current_hp,max_hp,current_mp,max_mp,created_at,updated_at)
          VALUES (1,1,0,0,0,3,0,0,0,0,0,100,50,100,100,50,50,?,?)`,
    args: [t, t],
  })
}

// ── 캐릭터 ───────────────────────────────────────────────────────────────────────

export type Character = {
  id: number
  level: number
  total_exp: number
  stat_points: number
  skill_points: number
  draw_tickets: number
  clear_count: number
  task_count: number
  str: number
  vit: number
  dex: number
  int_stat: number
  luk: number
  base_hp: number
  base_mp: number
  current_hp: number
  max_hp: number
  current_mp: number
  max_mp: number
}

export async function getCharacter(): Promise<Character> {
  const db = getClient()
  const res = await db.execute("SELECT * FROM character WHERE id = 1")
  return res.rows[0] as unknown as Character
}

export async function updateCharacter(fields: Partial<Character>) {
  const db = getClient()
  const updates = { ...fields, updated_at: now() }
  const sets = Object.keys(updates).map((k) => `${k} = ?`).join(", ")
  const vals = [...Object.values(updates), 1]
  await db.execute({ sql: `UPDATE character SET ${sets} WHERE id = ?`, args: vals })
}

// ── 활동 로그 ──────────────────────────────────────────────────────────────────

export async function addActivityLog(text: string, type: string, exp: number, comment: string) {
  const db = getClient()
  await db.execute({
    sql: "INSERT INTO activity_log (input_text,input_type,exp_gained,ai_comment,created_at) VALUES (?,?,?,?,?)",
    args: [text, type, exp, comment, now()],
  })
  await db.execute(
    "DELETE FROM activity_log WHERE id NOT IN (SELECT id FROM activity_log ORDER BY id DESC LIMIT 5)"
  )
}

export async function getRecentActivities() {
  const db = getClient()
  const res = await db.execute("SELECT * FROM activity_log ORDER BY id DESC LIMIT 5")
  return res.rows
}

// ── 체크리스트 ─────────────────────────────────────────────────────────────────

export async function getChecklistItems() {
  const db = getClient()
  const res = await db.execute("SELECT * FROM checklist_item WHERE is_active = 1 ORDER BY id")
  return res.rows
}

export async function addChecklistLog(itemId: number, exp: number) {
  const db = getClient()
  await db.execute({
    sql: "INSERT INTO checklist_log (item_id,exp_gained,checked_at) VALUES (?,?,?)",
    args: [itemId, exp, now()],
  })
}

export async function addChecklistItem(name: string, fixedExp: number) {
  const db = getClient()
  await db.execute({
    sql: "INSERT INTO checklist_item (name, fixed_exp, is_active) VALUES (?,?,1)",
    args: [name, fixedExp],
  })
}

export async function deleteChecklistItem(id: number) {
  const db = getClient()
  await db.execute({ sql: "UPDATE checklist_item SET is_active=0 WHERE id=?", args: [id] })
}

export async function getTodayCheckedItemIds(): Promise<Set<number>> {
  const db = getClient()
  const today = new Date().toISOString().slice(0, 10)
  const res = await db.execute({
    sql: "SELECT item_id FROM checklist_log WHERE checked_at LIKE ?",
    args: [`${today}%`],
  })
  return new Set(res.rows.map((r) => r.item_id as number))
}

// ── 장비 ───────────────────────────────────────────────────────────────────────

export async function getEquipment() {
  const db = getClient()
  const res = await db.execute("SELECT * FROM equipment ORDER BY is_equipped DESC, id DESC")
  return res.rows
}

export async function addEquipment(slot: string, name: string, grade: string, baseStat: number, options: object) {
  const db = getClient()
  await db.execute({
    sql: "INSERT INTO equipment (slot,name,grade,base_stat,options,is_equipped,created_at) VALUES (?,?,?,?,?,0,?)",
    args: [slot, name, grade, baseStat, JSON.stringify(options), now()],
  })
  const res = await db.execute("SELECT last_insert_rowid() AS id")
  return res.rows[0].id as number
}

export async function equipItem(itemId: number) {
  const db = getClient()
  const res = await db.execute({ sql: "SELECT slot FROM equipment WHERE id = ?", args: [itemId] })
  if (!res.rows[0]) return
  const slot = res.rows[0].slot
  await db.execute({ sql: "UPDATE equipment SET is_equipped = 0 WHERE slot = ?", args: [slot] })
  await db.execute({ sql: "UPDATE equipment SET is_equipped = 1 WHERE id = ?", args: [itemId] })
}

export async function deleteEquipment(itemId: number) {
  const db = getClient()
  await db.execute({ sql: "DELETE FROM equipment WHERE id = ?", args: [itemId] })
}

// ── 전투 로그 ──────────────────────────────────────────────────────────────────

export async function addBattleLog(
  monsterName: string, monsterGrade: string, result: string,
  expGained: number, drawTickets: number, logData: object[]
) {
  const db = getClient()
  await db.execute({
    sql: "INSERT INTO battle_log (monster_name,monster_grade,result,exp_gained,draw_tickets,log_data,created_at) VALUES (?,?,?,?,?,?,?)",
    args: [monsterName, monsterGrade, result, expGained, drawTickets, JSON.stringify(logData), now()],
  })
  await db.execute(
    "DELETE FROM battle_log WHERE id NOT IN (SELECT id FROM battle_log ORDER BY id DESC LIMIT 10)"
  )
}

export async function getRecentBattles() {
  const db = getClient()
  const res = await db.execute("SELECT * FROM battle_log ORDER BY id DESC LIMIT 10")
  return res.rows
}

// ── 설정 ───────────────────────────────────────────────────────────────────────

export async function getGameConfig(): Promise<Record<string, string>> {
  const db = getClient()
  const res = await db.execute("SELECT config_key, config_value FROM game_config")
  return Object.fromEntries(res.rows.map((r) => [r.config_key, r.config_value]))
}

export async function getBattleConfig(): Promise<Record<string, string>> {
  const db = getClient()
  const res = await db.execute("SELECT config_key, config_value FROM battle_config")
  return Object.fromEntries(res.rows.map((r) => [r.config_key, r.config_value]))
}

// ── 프롬프트 ───────────────────────────────────────────────────────────────────

export async function getActivePrompt(category = "general"): Promise<string> {
  const db = getClient()
  const res = await db.execute({
    sql: "SELECT content FROM prompt WHERE category = ? AND is_active = 1 ORDER BY version DESC LIMIT 1",
    args: [category],
  })
  return (res.rows[0]?.content as string) ?? ""
}

// ── 몬스터 ──────────────────────────────────────────────────────────────────────

export async function getMonsters() {
  const db = getClient()
  const res = await db.execute("SELECT * FROM monster_table WHERE is_active = 1")
  return res.rows
}

// ── 아이템 메타 ────────────────────────────────────────────────────────────────

export async function getItemGrades() {
  const db = getClient()
  const res = await db.execute("SELECT * FROM item_grade_table ORDER BY weight DESC")
  return res.rows
}

export async function getItemSlots() {
  const db = getClient()
  const res = await db.execute("SELECT * FROM item_slot_table")
  return res.rows
}

export async function getAbilityPool(category?: string) {
  const db = getClient()
  if (category) {
    const res = await db.execute({
      sql: "SELECT * FROM item_ability_pool WHERE is_active = 1 AND category = ?",
      args: [category],
    })
    return res.rows
  }
  const res = await db.execute("SELECT * FROM item_ability_pool WHERE is_active = 1")
  return res.rows
}

export async function getPassivePool() {
  const db = getClient()
  const res = await db.execute("SELECT * FROM item_passive_pool WHERE is_active = 1")
  return res.rows
}

// ── 할 일 ──────────────────────────────────────────────────────────────────────

export async function getTodoItems() {
  const db = getClient()
  const res = await db.execute("SELECT * FROM todo_item ORDER BY is_completed ASC, id DESC")
  return res.rows
}

export async function addTodoItem(name: string, suggestedExp: number) {
  const db = getClient()
  await db.execute({
    sql: "INSERT INTO todo_item (name, suggested_exp, is_completed, created_at) VALUES (?,?,0,?)",
    args: [name, suggestedExp, now()],
  })
}

export async function completeTodoItem(id: number, exp: number, comment: string) {
  const db = getClient()
  await db.execute({
    sql: "UPDATE todo_item SET is_completed=1, exp_gained=?, ai_comment=?, completed_at=? WHERE id=?",
    args: [exp, comment, now(), id],
  })
}

export async function deleteTodoItem(id: number) {
  const db = getClient()
  await db.execute({ sql: "DELETE FROM todo_item WHERE id=?", args: [id] })
}

// ── 프롬프트 수정 ──────────────────────────────────────────────────────────────

export async function updatePromptContent(category: string, content: string) {
  const db = getClient()
  await db.execute({
    sql: "UPDATE prompt SET content=?, updated_at=? WHERE category=? AND is_active=1",
    args: [content, now(), category],
  })
}

// ── 태스크 카운트 ──────────────────────────────────────────────────────────────

export async function incrementTaskCount() {
  const db = getClient()
  await db.execute("UPDATE character SET task_count = COALESCE(task_count,0) + 1 WHERE id = 1")
}
