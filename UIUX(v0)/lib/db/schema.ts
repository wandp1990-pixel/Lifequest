import { getClient, now } from "./client"
import { seedIfEmpty, seedCharacter, ensureChecklistItems, ensurePrompt, ensureItemSeeds, ensureSkills, ensureBattleConfig } from "./seed"

let _initialized = false

const SCHEMA = `
CREATE TABLE IF NOT EXISTS character (
    id           INTEGER PRIMARY KEY,
    name         TEXT     DEFAULT '전사',
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
CREATE TABLE IF NOT EXISTS routine (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    is_active  INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT
);
CREATE TABLE IF NOT EXISTS routine_item (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    routine_id INTEGER REFERENCES routine(id),
    name       TEXT NOT NULL,
    fixed_exp  INTEGER DEFAULT 10,
    sort_order INTEGER DEFAULT 0,
    is_active  INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS routine_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id    INTEGER REFERENCES routine_item(id),
    exp_gained INTEGER,
    checked_at TEXT
);
CREATE TABLE IF NOT EXISTS routine_bonus_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    routine_id INTEGER REFERENCES routine(id),
    bonus_exp  INTEGER,
    granted_at TEXT
);
CREATE TABLE IF NOT EXISTS attendance_log (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    checked_date TEXT UNIQUE,
    created_at   TEXT
);
CREATE TABLE IF NOT EXISTS push_subscription (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint   TEXT UNIQUE,
    p256dh     TEXT,
    auth       TEXT,
    created_at TEXT
);
CREATE TABLE IF NOT EXISTS migration_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    version    TEXT UNIQUE,
    applied_at TEXT
);
`

export async function initDb() {
  if (_initialized) return
  _initialized = true
  const db = getClient()
  const ddl = SCHEMA.trim().split(";").map(s => s.trim()).filter(Boolean)
  await db.batch(ddl, "write")
  try { await db.execute("ALTER TABLE character ADD COLUMN clear_count INTEGER DEFAULT 0") } catch {}
  try { await db.execute("ALTER TABLE character ADD COLUMN task_count INTEGER DEFAULT 0") } catch {}
  try { await db.execute("ALTER TABLE character ADD COLUMN name TEXT DEFAULT '전사'") } catch {}
  try { await db.execute("ALTER TABLE character ADD COLUMN attendance_streak INTEGER DEFAULT 0") } catch {}
  try { await db.execute("ALTER TABLE character ADD COLUMN max_cleared_grade TEXT DEFAULT NULL") } catch {}
  try { await db.execute("UPDATE character SET name='전사' WHERE id=1 AND (name IS NULL OR name='')") } catch {}
  try {
    await db.execute(
      "UPDATE character SET str=0,vit=0,dex=0,int_stat=0,luk=0 WHERE id=1 AND level=1 AND str=1 AND total_exp=0"
    )
  } catch {}
  await seedIfEmpty(db)
  await seedCharacter(db)
  await ensureChecklistItems(db)
  await ensurePrompt(db)
  await ensureItemSeeds(db)
  await ensureSkills(db)
  await ensureBattleConfig(db)

  // DB에 기록된 버전 확인 후 1회만 실행하는 마이그레이션 헬퍼
  async function runMigration(version: string, fn: () => Promise<void>) {
    const res = await db.execute({ sql: "SELECT 1 FROM migration_log WHERE version=?", args: [version] })
    if (res.rows.length > 0) return
    await fn()
    await db.execute({ sql: "INSERT INTO migration_log (version, applied_at) VALUES (?,?)", args: [version, now()] })
  }

  // balance_v1: 몬스터 출현율 + 스케일 + 전투 상수 조정
  await runMigration("balance_v1", async () => {
    await db.execute("UPDATE game_config SET config_value='50.0' WHERE config_key='monster_grade_C_prob'")
    await db.execute("UPDATE game_config SET config_value='20.0' WHERE config_key='monster_grade_B_prob'")
    await db.execute("UPDATE game_config SET config_value='15.0' WHERE config_key='monster_grade_A_prob'")
    await db.execute("UPDATE game_config SET config_value='8.0'  WHERE config_key='monster_grade_S_prob'")
    await db.execute("UPDATE game_config SET config_value='4.0'  WHERE config_key='monster_grade_SR_prob'")
    await db.execute("UPDATE game_config SET config_value='1.5'  WHERE config_key='monster_grade_SSR_prob'")
    await db.execute("UPDATE game_config SET config_value='0.01' WHERE config_key='monster_clear_scale'")
    await db.execute("UPDATE game_config SET config_value='0.02' WHERE config_key='monster_level_scale'")
    await db.execute("UPDATE battle_config SET config_value='4.0'  WHERE config_key='str_to_patk'")
    await db.execute("UPDATE battle_config SET config_value='20.0' WHERE config_key='vit_to_max_hp'")
    await db.execute("UPDATE battle_config SET config_value='2.0'  WHERE config_key='base_crit_multiplier'")
  })

  await runMigration("checklist_streak_v1", async () => {
    try { await db.execute("ALTER TABLE checklist_item ADD COLUMN streak INTEGER DEFAULT 0") } catch {}
    try { await db.execute("ALTER TABLE checklist_item ADD COLUMN best_streak INTEGER DEFAULT 0") } catch {}
  })

  await runMigration("remove_battle_exp_v1", async () => {
    await db.execute(
      "DELETE FROM game_config WHERE config_key IN ('monster_grade_C_exp','monster_grade_B_exp','monster_grade_A_exp','monster_grade_S_exp','monster_grade_SR_exp','monster_grade_SSR_exp','monster_grade_UR_exp')"
    )
  })

  await runMigration("routine_time_limit_v1", async () => {
    try { await db.execute("ALTER TABLE routine_item ADD COLUMN time_limit_minutes INTEGER") } catch {}
  })

  await runMigration("routine_deadline_v1", async () => {
    try { await db.execute("ALTER TABLE routine ADD COLUMN deadline_time TEXT") } catch {}
  })

  await runMigration("hp_regen_v1", async () => {
    try { await db.execute("ALTER TABLE character ADD COLUMN last_regen_at TEXT") } catch {}
    await db.execute({ sql: "UPDATE character SET last_regen_at=? WHERE id=1", args: [now()] })
  })

  await runMigration("daily_quest_config_v1", async () => {
    const t = now()
    const keys: [string, string, string][] = [
      ["daily_quest_total",   "10", "데일리 완료 목표 횟수"],
      ["daily_quest_exp_min", "10", "데일리 퀘스트 보상 최소 EXP"],
      ["daily_quest_exp_max", "50", "데일리 퀘스트 보상 최대 EXP"],
    ]
    for (const [key, val, desc] of keys) {
      await db.execute({
        sql: "INSERT OR IGNORE INTO game_config (config_key, config_value, description, updated_at) VALUES (?,?,?,?)",
        args: [key, val, desc, t],
      })
    }
  })

  await runMigration("dead_battle_cfg_v1", async () => {
    // 장비 패시브로 처리되는 글로벌 cfg 키 제거 (몬스터에 의도치 않게 적용되는 문제)
    await db.execute(
      "DELETE FROM battle_config WHERE config_key IN ('defense_ignore_ratio','double_attack_chance','life_steal_ratio')"
    )
    // 스킬 공격 상수를 cfg화
    const t = now()
    await db.execute({
      sql: "INSERT OR IGNORE INTO battle_config (config_key, config_value, label, min_val, max_val, step, updated_at) VALUES (?,?,?,?,?,?,?)",
      args: ["active_skill_mp_cost", "10", "랜덤 스킬 공격 MP 소모량", 0.0, 100.0, 1.0, t],
    })
    await db.execute({
      sql: "INSERT OR IGNORE INTO battle_config (config_key, config_value, label, min_val, max_val, step, updated_at) VALUES (?,?,?,?,?,?,?)",
      args: ["active_skill_damage_mult", "1.4", "랜덤 스킬 공격 데미지 배율", 1.0, 5.0, 0.1, t],
    })
    // 미구현 키 라벨 갱신 (옵션 설명 명시)
    await db.batch([
      "UPDATE battle_config SET label='더블어택 데미지 합산 방식 (add/multiply)' WHERE config_key='total_damage_mode'",
      "UPDATE battle_config SET label='선공 결정 방식 (dex/random/player)' WHERE config_key='first_strike_mode'",
      "UPDATE battle_config SET label='전투 후 HP/MP 처리 (full/none/half)' WHERE config_key='restore_hp_after_battle'",
    ], "write")
  })

  await runMigration("push_notify_v1", async () => {
    try { await db.execute("ALTER TABLE checklist_item ADD COLUMN notify_time TEXT") } catch {}
    try { await db.execute("ALTER TABLE todo_item ADD COLUMN notify_time TEXT") } catch {}
  })

  await runMigration("labels_v1", async () => {
    await db.batch([
      "UPDATE battle_config SET label='기본 명중률'           WHERE config_key='base_accuracy'",
      "UPDATE battle_config SET label='DEX당 명중률 증가'     WHERE config_key='accuracy_per_dex'",
      "UPDATE battle_config SET label='DEX당 회피율 증가'     WHERE config_key='evasion_per_dex'",
      "UPDATE battle_config SET label='기본 치명타 배율'      WHERE config_key='base_crit_multiplier'",
      "UPDATE battle_config SET label='LUK당 치명타율'        WHERE config_key='crit_rate_per_luk'",
      "UPDATE battle_config SET label='적 LUK당 치명타 억제' WHERE config_key='crit_suppression_per_enemy_luk'",
      "UPDATE battle_config SET label='INT당 치명타 배율'     WHERE config_key='crit_multiplier_per_int'",
      "UPDATE battle_config SET label='STR → 물리 공격력'    WHERE config_key='str_to_patk'",
      "UPDATE battle_config SET label='VIT → 최대 HP'        WHERE config_key='vit_to_max_hp'",
      "UPDATE battle_config SET label='INT → 마법 공격력'    WHERE config_key='int_to_matk'",
      "UPDATE battle_config SET label='INT → 최대 MP'        WHERE config_key='int_to_max_mp'",
      "UPDATE battle_config SET label='더블 어택 확률'        WHERE config_key='double_attack_chance'",
      "UPDATE battle_config SET label='생명 흡수 비율'        WHERE config_key='life_steal_ratio'",
      "UPDATE battle_config SET label='방어 무시 비율'        WHERE config_key='defense_ignore_ratio'",
      "UPDATE battle_config SET label='데미지 랜덤 최솟값'    WHERE config_key='damage_random_min'",
      "UPDATE battle_config SET label='데미지 랜덤 최댓값'    WHERE config_key='damage_random_max'",
      "UPDATE battle_config SET label='방어 최소 데미지 비율' WHERE config_key='min_damage_ratio_by_defense'",
      "UPDATE battle_config SET label='총 데미지 방식'        WHERE config_key='total_damage_mode'",
      "UPDATE battle_config SET label='선공 결정 방식'        WHERE config_key='first_strike_mode'",
      "UPDATE battle_config SET label='전투 후 HP/MP 회복'   WHERE config_key='restore_hp_after_battle'",
    ], "write")
  })

  await runMigration("battle_balance_v2", async () => {
    await db.batch([
      "UPDATE battle_config SET config_value='0.003' WHERE config_key='accuracy_per_dex'",
      "UPDATE battle_config SET config_value='0.002' WHERE config_key='evasion_per_dex'",
      "UPDATE battle_config SET config_value='0.0'   WHERE config_key='crit_multiplier_per_int'",
      "UPDATE item_passive_pool SET description='25% 확률 추가타격' WHERE name='더블어택'",
      "UPDATE item_passive_pool SET description='받은 피해의 5% 반사' WHERE name='반사'",
      "UPDATE skill_table SET base_effect_value=18, effect_coeff=3.5 WHERE id='ACTIVE_RAGE_01'",
      "UPDATE skill_table SET base_effect_value=30, effect_coeff=2.5 WHERE id='ACTIVE_CHAIN_01'",
      "UPDATE skill_table SET base_effect_value=12, effect_coeff=2.5 WHERE id='ACTIVE_FIRST_STRIKE_01'",
      "UPDATE skill_table SET base_effect_value=30, effect_coeff=5.0 WHERE id='ACTIVE_MANA_BURST_01'",
      "UPDATE skill_table SET base_effect_value=22, effect_coeff=4.0 WHERE id='ACTIVE_SPARK_01'",
    ], "write")
  })
}
