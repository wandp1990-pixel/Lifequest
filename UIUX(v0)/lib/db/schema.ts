import { getClient } from "./client"
import { seedIfEmpty, seedCharacter, ensureChecklistItems, ensurePrompt, ensureItemSeeds, ensureSkills } from "./seed"

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
  try { await db.execute("ALTER TABLE character ADD COLUMN name TEXT DEFAULT '전사'") } catch {}
  try { await db.execute("ALTER TABLE character ADD COLUMN attendance_streak INTEGER DEFAULT 0") } catch {}
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
}
