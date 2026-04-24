"""
Turso(libsql) 연결 관리, 테이블 초기화, 공통 쿼리 함수.
pages/services는 이 모듈의 함수만 호출한다. DB를 직접 조작하지 않는다.
"""
import json
from datetime import datetime
import streamlit as st

try:
    import libsql_experimental as libsql
except ImportError:
    raise ImportError("pip install libsql-experimental")


# ── 연결 ──────────────────────────────────────────────────────────────────────

@st.cache_resource
def get_connection():
    try:
        url = st.secrets.get("TURSO_URL", "")
        token = st.secrets.get("TURSO_AUTH_TOKEN", "")
        if url and token:
            conn = libsql.connect("lifequest.db", sync_url=url, auth_token=token)
            conn.sync()
        else:
            conn = libsql.connect("lifequest.db")
    except Exception:
        conn = libsql.connect("lifequest.db")
    _init_db(conn)
    return conn


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _rows(cursor) -> list[dict]:
    if cursor.description is None:
        return []
    cols = [d[0] for d in cursor.description]
    return [dict(zip(cols, row)) for row in cursor.fetchall()]


# ── 스키마 ──────────────────────────────────────────────────────────────────────

_SCHEMA = """
CREATE TABLE IF NOT EXISTS character (
    id           INTEGER PRIMARY KEY,
    level        INTEGER  DEFAULT 1,
    total_exp    INTEGER  DEFAULT 0,
    stat_points  INTEGER  DEFAULT 0,
    skill_points INTEGER  DEFAULT 0,
    draw_tickets INTEGER  DEFAULT 3,
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
"""


def _init_db(conn):
    for stmt in _SCHEMA.strip().split(";"):
        stmt = stmt.strip()
        if stmt:
            conn.execute(stmt)
    conn.commit()
    _seed_if_empty(conn)


# ── 시드 데이터 ───────────────────────────────────────────────────────────────

def _seed_if_empty(conn):
    row = _rows(conn.execute("SELECT COUNT(*) AS cnt FROM game_config"))
    if row[0]["cnt"] > 0:
        return
    _seed_game_config(conn)
    _seed_battle_config(conn)
    _seed_item_grade_table(conn)
    _seed_item_slot_table(conn)
    _seed_item_ability_pool(conn)
    _seed_item_passive_pool(conn)
    _seed_skill_table(conn)
    _seed_monster_table(conn)
    _seed_prompt(conn)
    _seed_checklist_items(conn)
    _seed_character(conn)
    conn.commit()


def _seed_game_config(conn):
    now = _now()
    data = [
        # 기본 성장
        ("base_exp",                "100",   "레벨 1→2 필요 EXP 기본값"),
        ("level_multiplier",        "1.01",  "매 레벨 EXP 증가 배율"),
        ("stat_points_per_level",   "3",     "레벨업 시 지급 스탯 포인트"),
        ("skill_points_per_level",  "2",     "레벨업 시 지급 스킬 포인트"),
        ("draw_tickets_per_level",  "1",     "레벨업 시 지급 뽑기권"),
        # 기본 HP/MP
        ("base_hp",                 "100",   "캐릭터 기본 HP"),
        ("base_mp",                 "50",    "캐릭터 기본 MP"),
        # 몬스터 등급 확률 (%)
        ("monster_grade_C_prob",    "40.0",  "잡몹 출현 확률"),
        ("monster_grade_B_prob",    "25.0",  "정예 출현 확률"),
        ("monster_grade_A_prob",    "18.0",  "희귀 출현 확률"),
        ("monster_grade_S_prob",    "10.0",  "네임드 출현 확률"),
        ("monster_grade_SR_prob",   "4.5",   "필드보스 출현 확률"),
        ("monster_grade_SSR_prob",  "2.0",   "재앙 출현 확률"),
        ("monster_grade_UR_prob",   "0.5",   "종말 출현 확률"),
        # 몬스터 등급 능력치 계수
        ("monster_grade_C_mult",    "1.0",   "잡몹 능력치 계수"),
        ("monster_grade_B_mult",    "1.5",   "정예 능력치 계수"),
        ("monster_grade_A_mult",    "2.0",   "희귀 능력치 계수"),
        ("monster_grade_S_mult",    "3.0",   "네임드 능력치 계수"),
        ("monster_grade_SR_mult",   "4.5",   "필드보스 능력치 계수"),
        ("monster_grade_SSR_mult",  "7.0",   "재앙 능력치 계수"),
        ("monster_grade_UR_mult",   "10.0",  "종말 능력치 계수"),
        # 몬스터 등급 뽑기권 보상
        ("monster_grade_C_tickets",   "1",   "잡몹 처치 뽑기권"),
        ("monster_grade_B_tickets",   "2",   "정예 처치 뽑기권"),
        ("monster_grade_A_tickets",   "3",   "희귀 처치 뽑기권"),
        ("monster_grade_S_tickets",   "5",   "네임드 처치 뽑기권"),
        ("monster_grade_SR_tickets",  "7",   "필드보스 처치 뽑기권"),
        ("monster_grade_SSR_tickets", "10",  "재앙 처치 뽑기권"),
        ("monster_grade_UR_tickets",  "15",  "종말 처치 뽑기권"),
        # 몬스터 등급 EXP 보상
        ("monster_grade_C_exp",     "50",    "잡몹 처치 EXP"),
        ("monster_grade_B_exp",     "100",   "정예 처치 EXP"),
        ("monster_grade_A_exp",     "180",   "희귀 처치 EXP"),
        ("monster_grade_S_exp",     "300",   "네임드 처치 EXP"),
        ("monster_grade_SR_exp",    "500",   "필드보스 처치 EXP"),
        ("monster_grade_SSR_exp",   "800",   "재앙 처치 EXP"),
        ("monster_grade_UR_exp",    "1500",  "종말 처치 EXP"),
        # 몬스터 레벨 스케일링
        ("monster_level_scale",     "0.04",  "유저 레벨당 몬스터 능력치 계수 증가"),
        ("monster_clear_scale",     "0.03",  "클리어 횟수당 몬스터 능력치 계수 증가"),
    ]
    for key, val, desc in data:
        conn.execute(
            "INSERT OR IGNORE INTO game_config (config_key, config_value, description, updated_at) VALUES (?,?,?,?)",
            (key, val, desc, now),
        )


def _seed_battle_config(conn):
    now = _now()
    data = [
        ("base_accuracy",              "0.9",   "기본 명중률",           0.5, 1.0,  0.01),
        ("accuracy_per_dex",           "0.005", "DEX당 명중률 증가",     0.0, 0.05, 0.001),
        ("evasion_per_dex",            "0.003", "DEX당 회피율 증가",     0.0, 0.05, 0.001),
        ("base_crit_multiplier",       "1.5",   "기본 치명타 배율",      1.0, 5.0,  0.1),
        ("crit_rate_per_luk",          "0.005", "내 LUK당 치명타율",     0.0, 0.05, 0.001),
        ("crit_suppression_per_enemy_luk", "0.003", "적 LUK당 치명타 억제", 0.0, 0.05, 0.001),
        ("crit_multiplier_per_int",    "0.01",  "INT당 치명타 배율 추가",0.0, 0.1,  0.005),
        ("str_to_patk",                "2.0",   "STR당 물리 공격력 보너스", 0.0, 10.0, 0.5),
        ("vit_to_max_hp",              "10.0",  "VIT당 최대 HP 보너스",  0.0, 50.0, 1.0),
        ("int_to_matk",                "2.0",   "INT당 마법 공격력 보너스", 0.0, 10.0, 0.5),
        ("int_to_max_mp",              "5.0",   "INT당 최대 MP 보너스",  0.0, 30.0, 1.0),
        ("double_attack_chance",       "0.0",   "더블 어택 발동 확률(아이템 패시브)", 0.0, 1.0, 0.01),
        ("life_steal_ratio",           "0.0",   "생명 흡수 비율(아이템 패시브)", 0.0, 1.0, 0.01),
        ("defense_ignore_ratio",       "0.0",   "방어 무시 비율(아이템 패시브)", 0.0, 1.0, 0.01),
        ("damage_random_min",          "0.9",   "데미지 난수 최솟값",    0.5, 1.0,  0.05),
        ("damage_random_max",          "1.1",   "데미지 난수 최댓값",    1.0, 2.0,  0.05),
        ("min_damage_ratio_by_defense","0.1",   "방어력 최소 데미지 비율",0.0, 0.5, 0.05),
        ("total_damage_mode",          "add",   "총 데미지 방식 (add=물리+마법)", 0.0, 0.0, 0.0),
        ("first_strike_mode",          "dex",   "선공 결정 방식 (dex 기반)", 0.0, 0.0, 0.0),
        ("restore_hp_after_battle",    "full",  "전투 후 HP/MP 원복 방식 (full/none)", 0.0, 0.0, 0.0),
    ]
    for key, val, label, mn, mx, step in data:
        conn.execute(
            "INSERT OR IGNORE INTO battle_config (config_key, config_value, label, min_val, max_val, step, updated_at) VALUES (?,?,?,?,?,?,?)",
            (key, val, label, mn, mx, step, now),
        )


def _seed_item_grade_table(conn):
    data = [
        # grade, name,  main, sub,   combat, passive, total, s_min, s_max, weight
        ("C",  "일반", 1, "0",   "0",   "0",   "1",   5,   10,   50.0),
        ("B",  "고급", 1, "0~1", "0",   "0",   "1~2", 15,  28,   25.0),
        ("A",  "희귀", 1, "1",   "0~1", "0",   "2~3", 35,  60,   15.0),
        ("S",  "영웅", 1, "1",   "1",   "0",   "3",   75,  120,  6.0),
        ("SR", "전설", 1, "1",   "1~2", "0",   "3~4", 150, 250,  3.0),
        ("SSR","고대", 1, "1",   "2",   "0~1", "4~5", 300, 500,  0.9),
        ("UR", "신화", 1, "1",   "2",   "1",   "5",   600, 1000, 0.1),
    ]
    for row in data:
        conn.execute(
            """INSERT OR IGNORE INTO item_grade_table
               (grade,name,main_count,sub_count,combat_count,passive_count,total_count,stat_min,stat_max,weight)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            row,
        )


def _seed_item_slot_table(conn):
    data = [
        # slot,      name,    main_ability,   excluded (JSON list)
        ("weapon",   "무기",   "물리 공격력",  json.dumps(["방어력","물리방어력","마법방어력","마법 공격력"])),
        ("helmet",   "투구",   "방어력",       json.dumps(["물리 공격력","마법 공격력"])),
        ("armor",    "갑옷",   "물리방어력",   json.dumps(["물리 공격력","마법 공격력"])),
        ("pants",    "바지",   "마법방어력",   json.dumps(["물리 공격력","마법 공격력"])),
        ("belt",     "벨트",   "방어력",       json.dumps(["물리 공격력","마법 공격력"])),
        ("glove",    "장갑",   "명중률",       json.dumps(["마법 공격력","방어력","물리방어력","마법방어력"])),
        ("shoe",     "신발",   "회피율",       json.dumps(["물리 공격력","마법 공격력","방어력","물리방어력","마법방어력"])),
        ("necklace", "목걸이", "치명타확률",   json.dumps(["치명타피해","물리 공격력","방어력","물리방어력","마법방어력"])),
        ("ring",     "반지",   "치명타피해",   json.dumps(["치명타확률","물리 공격력","방어력","물리방어력","마법방어력"])),
    ]
    for row in data:
        conn.execute(
            "INSERT OR IGNORE INTO item_slot_table (slot,name,main_ability,excluded) VALUES (?,?,?,?)",
            row,
        )


def _seed_item_ability_pool(conn):
    data = [
        # name,          base_value, unit,  effect,              category
        ("STR(힘)",       2.0, "Pt", "공격력 +2",         "BaseStat"),
        ("VIT(체력)",     2.0, "Pt", "최대HP +20",        "BaseStat"),
        ("DEX(민첩)",     2.0, "Pt", "명중/회피 보정",    "BaseStat"),
        ("INT(지능)",     2.0, "Pt", "마법공격 +2",       "BaseStat"),
        ("LUK(운)",       2.0, "Pt", "치명확률 +1%",      "BaseStat"),
        ("물리 공격력",  10.0, "Pt", "물리공격력 +10",    "Combat"),
        ("마법 공격력",   8.0, "Pt", "마법공격력 +8",     "Combat"),
        ("명중률",        1.0, "%",  "명중 +1%",          "Combat"),
        ("회피율",        1.0, "%",  "회피 +1%",          "Combat"),
        ("치명타확률",    1.0, "%",  "치명 +1%",          "Combat"),
        ("치명타피해",    5.0, "%",  "피해 +5%",          "Combat"),
        ("방어력",        5.0, "Pt", "물리방어 +5",       "Combat"),
        ("마법방어력",    4.0, "Pt", "마법방어 +4",       "Combat"),
        ("HP증가",       50.0, "HP", "최대HP +50",        "Combat"),
        ("MP증가",       30.0, "MP", "최대MP +30",        "Combat"),
    ]
    for row in data:
        conn.execute(
            "INSERT OR IGNORE INTO item_ability_pool (name,base_value,unit,effect,category) VALUES (?,?,?,?,?)",
            row,
        )


def _seed_item_passive_pool(conn):
    data = [
        ("더블어택", "50% 확률 추가타격"),
        ("생명흡수", "피해의 5% 회복"),
        ("방어무시", "상대 DEF 10% 무시"),
        ("반사",     "받은 피해의 10% 반사"),
    ]
    for name, desc in data:
        conn.execute(
            "INSERT OR IGNORE INTO item_passive_pool (name,description) VALUES (?,?)",
            (name, desc),
        )


def _seed_skill_table(conn):
    # 패시브 스킬 10개
    passives = [
        # id,                   name,        unlock_lv, base_eff, eff_coeff, trig_param, trig_coeff, effect_code,     trig_cond, desc
        ("PASSIVE_PATK_01",  "전사의 기백",  10, 2.0,  0.5, 0.0, 0.0, "PATK_PCT",    "always", "물리 공격력 증가"),
        ("PASSIVE_HP_01",    "강철 피부",    20, 2.0,  0.5, 0.0, 0.0, "HP_PCT",      "always", "최대 HP 증가"),
        ("PASSIVE_DEX_01",   "신속함",       30, 1.0,  0.5, 0.0, 0.0, "DEX_FLAT",    "always", "DEX 고정값 증가"),
        ("PASSIVE_MATK_01",  "마법 친화",    40, 2.0,  0.5, 0.0, 0.0, "MATK_PCT",    "always", "마법 공격력 증가"),
        ("PASSIVE_LUK_01",   "행운아",       50, 1.0,  0.5, 0.0, 0.0, "LUK_FLAT",    "always", "LUK 고정값 증가"),
        ("PASSIVE_PDEF_01",  "철벽",         60, 5.0,  1.0, 0.0, 0.0, "PDEF_PCT",    "always", "물리 방어력 증가"),
        ("PASSIVE_CRIT_RATE_01", "예리한 눈",70, 0.5,  0.25,0.0, 0.0, "CRIT_RATE",   "always", "치명타율 증가"),
        ("PASSIVE_CRIT_DMG_01",  "파열의 법칙",80,5.0, 1.5, 0.0, 0.0, "CRIT_DMG",    "always", "치명타 데미지 증가"),
        ("PASSIVE_MDEF_01",  "마법 저항",    90, 5.0,  1.0, 0.0, 0.0, "MDEF_PCT",    "always", "마법 방어력 증가"),
        ("PASSIVE_CRIT_RATE_02","신의 총애", 100,1.0,  0.5, 0.0, 0.0, "CRIT_RATE",   "always", "치명타율 증가"),
    ]
    # 액티브 스킬 8개 (mp_cost, mp_cost_coeff 포함)
    actives = [
        # id,                    name,       unlock_lv, base_eff, eff_coeff, trig_param, trig_coeff, mp_cost, mp_coeff, effect_code,    trig_cond,        desc
        ("ACTIVE_RAGE_01",      "분노",        3,  30.0, 6.0,  0.0,  0.0,  20, 1.0,  "PATK_PCT_TURN",  "battle_start",   "물리 ATK 증가"),
        ("ACTIVE_CHAIN_01",     "연속공격",    5,  20.0, 2.0,  20.0, 2.0,  10, 0.5,  "EXTRA_HIT",      "on_hit",         "추가 타격"),
        ("ACTIVE_FIRST_STRIKE_01","선제 강타", 9,  20.0, 4.0,  0.0,  0.0,  15, 0.75, "PATK_PCT_TURN",  "first_strike",   "물리 ATK 증가"),
        ("ACTIVE_AFTERIMAGE_01","잔상",        14, 10.0, 2.5,  0.0,  0.0,   8, 0.4,  "COUNTER_HIT",    "on_evade",       "반격 추가 타격"),
        ("ACTIVE_REVERSAL_01",  "역전의 의지", 20,  5.0, 1.25, 25.0, 0.75, 20, 1.0,  "HP_RESTORE",     "hp_below_25",    "HP 회복"),
        ("ACTIVE_MANA_BURST_01","마나 폭발",   25, 50.0, 7.5,  0.0,  0.0,  25, 1.25, "MATK_PCT_TURN",  "every_3_turns",  "마법 ATK 증가"),
        ("ACTIVE_SPARK_01",     "지식의 불꽃", 28, 10.0, 3.5,  0.0,  0.0,  10, 0.5,  "MATK_PCT_TURN",  "on_crit",        "마법 ATK 증가"),
        ("ACTIVE_SURVIVE_01",   "기사회생",    30,  5.0, 2.25, 0.0,  0.0,   0, 0.0,  "DEATH_SURVIVE",  "on_death",       "사망 시 생존"),
    ]

    for row in passives:
        conn.execute(
            """INSERT OR IGNORE INTO skill_table
               (id,name,type,max_skp,unlock_level,base_effect_value,effect_coeff,
                base_trigger_param,trigger_param_coeff,mp_cost,mp_cost_coeff,
                effect_code,trigger_condition,description)
               VALUES (?,?,'passive',20,?,?,?,?,?,0,0,?,?,?)""",
            (row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9]),
        )

    for row in actives:
        conn.execute(
            """INSERT OR IGNORE INTO skill_table
               (id,name,type,max_skp,unlock_level,base_effect_value,effect_coeff,
                base_trigger_param,trigger_param_coeff,mp_cost,mp_cost_coeff,
                effect_code,trigger_condition,description)
               VALUES (?,?,'active',20,?,?,?,?,?,?,?,?,?,?)""",
            (row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10], row[11]),
        )


def _seed_monster_table(conn):
    # (name, race, hp, atk, matk, pdef, mdef, dex, luk, desc)
    monsters = [
        # 슬라임 (HP 특화, 공격 약)
        ("슬라임",      "슬라임", 55, 4, 3, 3, 3, 3, 2, "흐물흐물한 젤리 생명체"),
        ("젤리",        "슬라임", 50, 3, 4, 3, 3, 3, 2, "끈적한 젤리 괴물"),
        ("점액괴물",    "슬라임", 60, 4, 3, 4, 3, 2, 2, "독성 점액을 분비한다"),
        ("물방울",      "슬라임", 45, 3, 3, 3, 4, 4, 2, "빠르게 움직이는 물 슬라임"),
        ("젤라틴",      "슬라임", 65, 5, 4, 4, 4, 2, 1, "거대한 젤라틴 덩어리"),
        # 고블린 (물리 공격 특화, 마법방어 약)
        ("고블린",      "고블린", 40, 8, 3, 3, 2, 4, 2, "소형 야만족 몬스터"),
        ("오크",        "고블린", 50, 9, 3, 4, 2, 3, 2, "덩치 큰 오크 전사"),
        ("트롤",        "고블린", 60, 10, 3, 5, 2, 3, 1, "재생 능력을 가진 트롤"),
        ("코볼트",      "고블린", 35, 7, 3, 3, 2, 5, 3, "민첩한 코볼트 약탈자"),
        ("오우거",      "고블린", 70, 11, 4, 6, 3, 2, 1, "거대한 오우거 투사"),
        # 골렘 (물리방어 특화, 민첩 약)
        ("골렘",        "골렘", 45, 6, 3, 8, 4, 1, 2, "마법으로 만들어진 석상"),
        ("석상",        "골렘", 50, 6, 3, 9, 4, 1, 2, "움직이는 석조 조각상"),
        ("가고일",      "골렘", 40, 5, 4, 7, 4, 3, 2, "날개 달린 석조 괴물"),
        ("바위거인",    "골렘", 65, 8, 3, 10, 5, 1, 1, "거대한 바위 형태의 골렘"),
        ("철거인",      "골렘", 55, 7, 3, 11, 5, 1, 1, "금속으로 만들어진 골렘"),
        # 언데드 (마법방어 특화, 운 약)
        ("스켈레톤",    "언데드", 35, 5, 5, 3, 7, 3, 1, "뼈만 남은 전사 언데드"),
        ("리치",        "언데드", 40, 4, 9, 3, 8, 3, 1, "강력한 마법을 쓰는 리치"),
        ("레이스",      "언데드", 30, 3, 8, 2, 9, 4, 1, "유령 형태의 언데드"),
        ("구울",        "언데드", 45, 7, 5, 4, 7, 3, 1, "시체를 먹는 구울"),
        ("데스나이트",  "언데드", 55, 8, 6, 5, 9, 3, 1, "강화된 언데드 기사"),
        # 위습 (마법 공격 특화, 물리방어 약)
        ("위습",        "위습", 30, 2, 10, 1, 5, 4, 3, "마법 에너지 덩어리"),
        ("팬텀",        "위습", 35, 2, 11, 1, 5, 4, 3, "환영을 보여주는 팬텀"),
        ("셰이드",      "위습", 28, 2, 9,  1, 4, 5, 3, "그림자처럼 빠른 셰이드"),
        ("스펙터",      "위습", 32, 2, 12, 1, 6, 4, 2, "공포를 유발하는 스펙터"),
        ("밤그림자",    "위습", 38, 3, 13, 2, 6, 3, 2, "어둠을 다루는 위습"),
        # 늑대 (민첩 특화, HP 약)
        ("늑대",        "늑대", 30, 7, 3, 3, 3, 8, 3, "빠른 야생 늑대"),
        ("와이번",      "늑대", 35, 8, 4, 3, 3, 7, 3, "날개 달린 와이번"),
        ("표범",        "늑대", 28, 8, 3, 2, 3, 9, 3, "순식간에 덮치는 표범"),
        ("독수리",      "늑대", 25, 7, 3, 2, 3, 10, 4, "하늘에서 급습하는 독수리"),
        ("그리폰",      "늑대", 38, 9, 5, 4, 4, 8, 3, "사자와 독수리의 혼종"),
        # 드래곤 (전체 ×1.2, 약점 없음)
        ("드래곤",      "드래곤", 55, 9, 9, 7, 7, 5, 4, "강대한 고대 드래곤"),
        ("고대룡",      "드래곤", 60, 10, 10, 8, 8, 5, 4, "태초부터 존재한 고대룡"),
        ("화염룡",      "드래곤", 50, 11, 11, 6, 7, 6, 4, "화염을 뿜는 드래곤"),
        ("빙룡",        "드래곤", 50, 9,  11, 7, 8, 5, 4, "얼음 숨결의 빙룡"),
        ("뇌룡",        "드래곤", 52, 10, 10, 7, 7, 7, 5, "번개를 다루는 뇌룡"),
    ]
    for m in monsters:
        conn.execute(
            """INSERT OR IGNORE INTO monster_table
               (name,race,base_hp,base_atk,base_matk,base_pdef,base_mdef,base_dex,base_luk,description)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            m,
        )


def _seed_prompt(conn):
    default_prompt = """너는 유저의 일상 활동을 게임 성장 로그로 변환하는 AI 게임 마스터야.

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
- 불성실하거나 거짓으로 보이는 활동: 10 이하"""

    conn.execute(
        """INSERT OR IGNORE INTO prompt (category, content, version, is_active, updated_at)
           VALUES ('general', ?, 1, 1, ?)""",
        (default_prompt, _now()),
    )


def _seed_checklist_items(conn):
    items = [
        ("약 복용",    10),
        ("물 2L 마시기", 15),
        ("스트레칭",   20),
        ("일기 쓰기",  25),
    ]
    for name, exp in items:
        conn.execute(
            "INSERT OR IGNORE INTO checklist_item (name, fixed_exp) VALUES (?,?)",
            (name, exp),
        )


def _seed_character(conn):
    row = _rows(conn.execute("SELECT COUNT(*) AS cnt FROM character"))
    if row[0]["cnt"] == 0:
        now = _now()
        conn.execute(
            """INSERT INTO character
               (id,level,total_exp,stat_points,skill_points,draw_tickets,
                str,vit,dex,int_stat,luk,
                base_hp,base_mp,current_hp,max_hp,current_mp,max_mp,
                created_at,updated_at)
               VALUES (1,1,0,0,0,3, 1,1,1,1,1, 100,50,110,110,55,55, ?,?)""",
            (now, now),
        )


# ── 캐릭터 쿼리 ─────────────────────────────────────────────────────────────────

def get_character(conn) -> dict:
    rows = _rows(conn.execute("SELECT * FROM character WHERE id = 1"))
    return rows[0] if rows else {}


def update_character(conn, **kwargs):
    kwargs["updated_at"] = _now()
    sets = ", ".join(f"{k} = ?" for k in kwargs)
    vals = list(kwargs.values()) + [1]
    conn.execute(f"UPDATE character SET {sets} WHERE id = ?", vals)
    conn.commit()


# ── 활동 로그 ──────────────────────────────────────────────────────────────────

def add_activity_log(conn, input_text: str, input_type: str, exp_gained: int, ai_comment: str):
    conn.execute(
        "INSERT INTO activity_log (input_text,input_type,exp_gained,ai_comment,created_at) VALUES (?,?,?,?,?)",
        (input_text, input_type, exp_gained, ai_comment, _now()),
    )
    conn.execute(
        "DELETE FROM activity_log WHERE id NOT IN (SELECT id FROM activity_log ORDER BY id DESC LIMIT 10)"
    )
    conn.commit()


def get_recent_activities(conn) -> list[dict]:
    return _rows(conn.execute("SELECT * FROM activity_log ORDER BY id DESC LIMIT 10"))


# ── 체크리스트 ─────────────────────────────────────────────────────────────────

def get_checklist_items(conn) -> list[dict]:
    return _rows(conn.execute("SELECT * FROM checklist_item WHERE is_active = 1 ORDER BY id"))


def add_checklist_log(conn, item_id: int, exp_gained: int):
    conn.execute(
        "INSERT INTO checklist_log (item_id,exp_gained,checked_at) VALUES (?,?,?)",
        (item_id, exp_gained, _now()),
    )
    conn.execute(
        "DELETE FROM checklist_log WHERE id NOT IN (SELECT id FROM checklist_log ORDER BY id DESC LIMIT 10)"
    )
    conn.commit()


def get_today_checked_item_ids(conn) -> set[int]:
    today = datetime.now().strftime("%Y-%m-%d")
    rows = _rows(conn.execute(
        "SELECT item_id FROM checklist_log WHERE checked_at LIKE ?",
        (f"{today}%",),
    ))
    return {r["item_id"] for r in rows}


# ── 스킬 ───────────────────────────────────────────────────────────────────────

def get_all_skills(conn) -> list[dict]:
    return _rows(conn.execute("SELECT * FROM skill_table WHERE is_active = 1 ORDER BY unlock_level"))


def get_skill_log(conn) -> list[dict]:
    return _rows(conn.execute(
        """SELECT sl.*, st.name, st.type, st.unlock_level, st.effect_code, st.description
           FROM skill_log sl JOIN skill_table st ON sl.skill_id = st.id"""
    ))


def upsert_skill_log(conn, skill_id: str, invested_points: int, is_unlocked: int):
    existing = _rows(conn.execute("SELECT id FROM skill_log WHERE skill_id = ?", (skill_id,)))
    if existing:
        conn.execute(
            "UPDATE skill_log SET invested_points=?, is_unlocked=?, updated_at=? WHERE skill_id=?",
            (invested_points, is_unlocked, _now(), skill_id),
        )
    else:
        conn.execute(
            "INSERT INTO skill_log (skill_id,invested_points,is_unlocked,updated_at) VALUES (?,?,?,?)",
            (skill_id, invested_points, is_unlocked, _now()),
        )
    conn.commit()


# ── 장비 ───────────────────────────────────────────────────────────────────────

def get_equipment(conn) -> list[dict]:
    return _rows(conn.execute("SELECT * FROM equipment ORDER BY is_equipped DESC, id DESC"))


def get_equipped_items(conn) -> list[dict]:
    return _rows(conn.execute("SELECT * FROM equipment WHERE is_equipped = 1"))


def add_equipment(conn, slot: str, name: str, grade: str, base_stat: int, options: dict) -> int:
    conn.execute(
        "INSERT INTO equipment (slot,name,grade,base_stat,options,is_equipped,created_at) VALUES (?,?,?,?,?,0,?)",
        (slot, name, grade, base_stat, json.dumps(options, ensure_ascii=False), _now()),
    )
    conn.commit()
    row = _rows(conn.execute("SELECT last_insert_rowid() AS id"))
    return row[0]["id"]


def equip_item(conn, item_id: int):
    slot_row = _rows(conn.execute("SELECT slot FROM equipment WHERE id = ?", (item_id,)))
    if not slot_row:
        return
    slot = slot_row[0]["slot"]
    conn.execute("UPDATE equipment SET is_equipped = 0 WHERE slot = ?", (slot,))
    conn.execute("UPDATE equipment SET is_equipped = 1 WHERE id = ?", (item_id,))
    conn.commit()


def unequip_item(conn, item_id: int):
    conn.execute("UPDATE equipment SET is_equipped = 0 WHERE id = ?", (item_id,))
    conn.commit()


def delete_equipment(conn, item_id: int):
    conn.execute("DELETE FROM equipment WHERE id = ?", (item_id,))
    conn.commit()


# ── 전투 로그 ──────────────────────────────────────────────────────────────────

def add_battle_log(conn, monster_name: str, monster_grade: str, result: str,
                   exp_gained: int, draw_tickets: int, log_data: list):
    conn.execute(
        """INSERT INTO battle_log
           (monster_name,monster_grade,result,exp_gained,draw_tickets,log_data,created_at)
           VALUES (?,?,?,?,?,?,?)""",
        (monster_name, monster_grade, result, exp_gained, draw_tickets,
         json.dumps(log_data, ensure_ascii=False), _now()),
    )
    conn.execute(
        "DELETE FROM battle_log WHERE id NOT IN (SELECT id FROM battle_log ORDER BY id DESC LIMIT 10)"
    )
    conn.commit()


def get_recent_battles(conn) -> list[dict]:
    return _rows(conn.execute("SELECT * FROM battle_log ORDER BY id DESC LIMIT 10"))


# ── 프롬프트 ───────────────────────────────────────────────────────────────────

def get_active_prompt(conn, category: str = "general") -> str:
    rows = _rows(conn.execute(
        "SELECT content FROM prompt WHERE category = ? AND is_active = 1 ORDER BY version DESC LIMIT 1",
        (category,),
    ))
    return rows[0]["content"] if rows else ""


def upsert_prompt(conn, category: str, content: str):
    existing = _rows(conn.execute(
        "SELECT MAX(version) AS v FROM prompt WHERE category = ?", (category,)
    ))
    new_version = (existing[0]["v"] or 0) + 1
    conn.execute(
        "UPDATE prompt SET is_active = 0 WHERE category = ?", (category,)
    )
    conn.execute(
        "INSERT INTO prompt (category,content,version,is_active,updated_at) VALUES (?,?,?,1,?)",
        (category, content, new_version, _now()),
    )
    conn.commit()


# ── game_config / battle_config ────────────────────────────────────────────────

def get_game_config(conn) -> dict:
    rows = _rows(conn.execute("SELECT config_key, config_value FROM game_config"))
    return {r["config_key"]: r["config_value"] for r in rows}


def set_game_config(conn, key: str, value: str):
    conn.execute(
        "UPDATE game_config SET config_value = ?, updated_at = ? WHERE config_key = ?",
        (value, _now(), key),
    )
    conn.commit()


def get_battle_config(conn) -> dict:
    rows = _rows(conn.execute("SELECT config_key, config_value FROM battle_config"))
    return {r["config_key"]: r["config_value"] for r in rows}


def set_battle_config(conn, key: str, value: str):
    conn.execute(
        "UPDATE battle_config SET config_value = ?, updated_at = ? WHERE config_key = ?",
        (value, _now(), key),
    )
    conn.commit()


def get_battle_config_full(conn) -> list[dict]:
    return _rows(conn.execute("SELECT * FROM battle_config ORDER BY id"))


# ── 몬스터 ──────────────────────────────────────────────────────────────────────

def get_monsters(conn) -> list[dict]:
    return _rows(conn.execute("SELECT * FROM monster_table WHERE is_active = 1"))


# ── 아이템 메타 ────────────────────────────────────────────────────────────────

def get_item_grades(conn) -> list[dict]:
    return _rows(conn.execute("SELECT * FROM item_grade_table ORDER BY weight DESC"))


def get_item_slots(conn) -> list[dict]:
    return _rows(conn.execute("SELECT * FROM item_slot_table"))


def get_ability_pool(conn, category: str | None = None) -> list[dict]:
    if category:
        return _rows(conn.execute(
            "SELECT * FROM item_ability_pool WHERE is_active = 1 AND category = ?", (category,)
        ))
    return _rows(conn.execute("SELECT * FROM item_ability_pool WHERE is_active = 1"))


def get_passive_pool(conn) -> list[dict]:
    return _rows(conn.execute("SELECT * FROM item_passive_pool WHERE is_active = 1"))
