"""
턴제 자동 전투 시뮬레이션.
몬스터 생성, 전투 루프, 스킬 발동, 결과 처리.
"""
import random
import math
from config import load_config, load_battle_config, cfg_float, cfg_int
from database import db
from services.game_service import gain_exp, get_passive_bonuses

MONSTER_GRADE_ORDER = ["C","B","A","S","SR","SSR","UR"]
MONSTER_GRADE_NAMES = {"C":"잡몹","B":"정예","A":"희귀","S":"네임드","SR":"필드보스","SSR":"재앙","UR":"종말"}
RACE_SPEC  = {"슬라임":("base_hp",1.5),"고블린":("base_atk",1.5),"골렘":("base_pdef",1.5),
              "언데드":("base_mdef",1.5),"위습":("base_matk",1.5),"늑대":("base_dex",1.5),"드래곤":(None,1.2)}
RACE_WEAK  = {"슬라임":"base_atk","고블린":"base_mdef","골렘":"base_dex","언데드":"base_luk",
              "위습":"base_pdef","늑대":"base_hp","드래곤":None}


def pick_grade(cfg: dict) -> str:
    grades = MONSTER_GRADE_ORDER
    weights = [cfg_float(cfg, f"monster_grade_{g}_prob", 1.0) for g in grades]
    return random.choices(grades, weights=weights, k=1)[0]


def generate_monster(conn, user_level: int, clear_count: int) -> dict:
    cfg      = load_config()
    monsters = db.get_monsters(conn)
    if not monsters:
        raise ValueError("몬스터 데이터가 없습니다.")

    grade   = pick_grade(cfg)
    base    = random.choice(monsters)
    mult    = cfg_float(cfg, f"monster_grade_{grade}_mult", 1.0)
    lv_sc   = cfg_float(cfg, "monster_level_scale", 0.04)
    cl_sc   = cfg_float(cfg, "monster_clear_scale", 0.03)
    scale   = mult * (1 + user_level * lv_sc + clear_count * cl_sc)

    race  = base.get("race", "")
    spec  = RACE_SPEC.get(race, (None, 1.0))
    weak  = RACE_WEAK.get(race)

    def stat(key: int) -> int:
        val = int(base[key] * scale)
        if spec[0] == key:
            val = int(val * spec[1])
        elif key == weak:
            val = int(val * 0.7)
        if race == "드래곤":
            val = int(val * spec[1])
        return max(1, val)

    prefix_pool = {
        "C":["허약한","졸린","어린"],"B":["사나운","굶주린","날카로운"],
        "A":["저주받은","광폭한","강인한"],"S":["피에 물든","암흑의","불꽃의"],
        "SR":["고대의","심연의","망각의"],"SSR":["천벌의","종말의","시간을 삼킨"],
        "UR":["신을 죽인","차원을 찢은","영겁의"],
    }
    prefix = random.choice(prefix_pool.get(grade, ["강력한"]))
    name   = f"{prefix} {base['name']}"

    return {
        "name":       name,
        "grade":      grade,
        "grade_name": MONSTER_GRADE_NAMES[grade],
        "race":       race,
        "hp":         stat("base_hp"),
        "max_hp":     stat("base_hp"),
        "atk":        stat("base_atk"),
        "matk":       stat("base_matk"),
        "pdef":       stat("base_pdef"),
        "mdef":       stat("base_mdef"),
        "dex":        stat("base_dex"),
        "luk":        stat("base_luk"),
    }


def _build_fighter(char: dict, equipped: list[dict], passive_bonuses: dict, bcfg: dict) -> dict:
    """캐릭터 스탯 + 장비 옵션 + 패시브 보너스를 합산한 전투용 스탯 딕셔너리."""
    import json as _json

    str_v  = char["str"]
    vit_v  = char["vit"]
    dex_v  = char["dex"]
    int_v  = char["int_stat"]
    luk_v  = char["luk"]

    # 아이템 스탯 합산
    bonus = {"STR(힘)":0,"VIT(체력)":0,"DEX(민첩)":0,"INT(지능)":0,"LUK(운)":0,
             "물리 공격력":0,"마법 공격력":0,"명중률":0,"회피율":0,
             "치명타확률":0,"치명타피해":0,"방어력":0,"마법방어력":0,"HP증가":0,"MP증가":0}
    passive_items: list[str] = []

    for item in equipped:
        opts = _json.loads(item.get("options","{}"))
        for k, v in opts.items():
            if k in bonus:
                bonus[k] += v.get("value",0) if isinstance(v, dict) else v
            elif isinstance(v, dict) and v.get("unit") == "passive":
                passive_items.append(k)

    str_v += bonus["STR(힘)"]
    dex_v += bonus["DEX(민첩)"]
    int_v += bonus["INT(지능)"]
    luk_v += bonus["LUK(운)"]

    str_to_patk = cfg_float(bcfg, "str_to_patk", 2.0)
    int_to_matk = cfg_float(bcfg, "int_to_matk", 2.0)

    patk = int(str_v * str_to_patk) + bonus["물리 공격력"]
    matk = int(int_v * int_to_matk) + bonus["마법 공격력"]

    # 패시브 스킬 보너스 적용
    patk = int(patk * (1 + passive_bonuses.get("PATK_PCT", 0) / 100))
    matk = int(matk * (1 + passive_bonuses.get("MATK_PCT", 0) / 100))
    dex_v += passive_bonuses.get("DEX_FLAT", 0)
    luk_v += passive_bonuses.get("LUK_FLAT", 0)

    max_hp = char["max_hp"] + bonus["HP증가"]
    max_hp = int(max_hp * (1 + passive_bonuses.get("HP_PCT", 0) / 100))
    max_mp = char["max_mp"] + bonus["MP증가"]

    pdef = bonus["방어력"]
    mdef = bonus["마법방어력"]
    pdef = int(pdef * (1 + passive_bonuses.get("PDEF_PCT", 0) / 100))
    mdef = int(mdef * (1 + passive_bonuses.get("MDEF_PCT", 0) / 100))

    crit_rate = bonus["치명타확률"] / 100 + luk_v * cfg_float(bcfg,"crit_rate_per_luk",0.005)
    crit_rate += passive_bonuses.get("CRIT_RATE", 0) / 100
    crit_mult = cfg_float(bcfg, "base_crit_multiplier", 1.5)
    crit_mult += int_v * cfg_float(bcfg, "crit_multiplier_per_int", 0.01)
    crit_mult += bonus["치명타피해"] / 100
    crit_mult += passive_bonuses.get("CRIT_DMG", 0) / 100

    acc_base = cfg_float(bcfg, "base_accuracy", 0.9)
    acc = acc_base + dex_v * cfg_float(bcfg, "accuracy_per_dex", 0.005)
    eva = dex_v * cfg_float(bcfg, "evasion_per_dex", 0.003)

    return {
        "hp": char["current_hp"], "max_hp": max_hp, "mp": char["current_mp"], "max_mp": max_mp,
        "patk": patk, "matk": matk, "pdef": pdef, "mdef": mdef,
        "dex": dex_v, "luk": luk_v, "acc": min(acc, 0.99), "eva": min(eva, 0.5),
        "crit_rate": min(crit_rate, 0.75), "crit_mult": crit_mult,
        "passive_items": passive_items,
    }


def _calc_damage(attacker: dict, defender: dict, bcfg: dict, skill_mult: float = 1.0) -> tuple[int, bool, bool]:
    """데미지 계산. 반환: (damage, is_crit, is_miss)"""
    rnd_min = cfg_float(bcfg, "damage_random_min", 0.9)
    rnd_max = cfg_float(bcfg, "damage_random_max", 1.1)
    min_ratio = cfg_float(bcfg, "min_damage_ratio_by_defense", 0.1)
    def_ig = cfg_float(bcfg, "defense_ignore_ratio", 0.0)

    hit_roll  = random.random()
    evade_chk = min(defender.get("eva", 0), 0.5)
    miss_chk  = 1 - attacker.get("acc", 0.9)
    if hit_roll < max(miss_chk, evade_chk):
        return 0, False, True

    rand = random.uniform(rnd_min, rnd_max) * skill_mult
    pdef = max(0, defender.get("pdef", 0) * (1 - def_ig))
    mdef = max(0, defender.get("mdef", 0) * (1 - def_ig))

    total = attacker["patk"] + attacker["matk"]
    raw   = max(total * rand - (pdef + mdef) * 0.5, total * min_ratio)

    is_crit = random.random() < attacker.get("crit_rate", 0)
    if is_crit:
        raw *= attacker.get("crit_mult", 1.5)

    # 생명흡수 아이템 패시브
    if "생명흡수" in attacker.get("passive_items", []):
        heal = int(raw * 0.05)
        attacker["hp"] = min(attacker["hp"] + heal, attacker["max_hp"])

    # 반사 아이템 패시브
    if "반사" in defender.get("passive_items", []):
        reflect = int(raw * 0.1)
        attacker["hp"] = max(0, attacker["hp"] - reflect)

    return max(1, int(raw)), is_crit, False


def run_battle(conn, monster: dict) -> dict:
    """
    전투 시뮬레이션 실행.
    반환: {result: 'win'|'lose', turns: list, exp_gained: int, tickets: int, monster: dict}
    """
    char     = db.get_character(conn)
    equipped = db.get_equipped_items(conn)
    passive_bonuses = get_passive_bonuses(conn)
    bcfg     = load_battle_config()
    cfg      = load_config()

    hero = _build_fighter(char, equipped, passive_bonuses, bcfg)
    mob  = {
        "hp": monster["hp"], "max_hp": monster["max_hp"],
        "patk": monster["atk"], "matk": monster["matk"],
        "pdef": monster["pdef"], "mdef": monster["mdef"],
        "dex": monster["dex"], "luk": monster["luk"],
        "acc": 0.85, "eva": monster["dex"] * 0.003,
        "crit_rate": monster["luk"] * 0.003,
        "crit_mult": 1.5,
        "passive_items": [],
    }

    # 액티브 스킬 로드
    skill_logs = {s["skill_id"]: s for s in db.get_skill_log(conn) if s.get("is_unlocked")}
    active_skills = [s for s in db.get_all_skills(conn)
                     if s["type"] == "active" and s["id"] in skill_logs]

    turns: list[dict] = []
    max_turns = 50

    # 선공 결정 (DEX 기반)
    hero_first = hero["dex"] >= mob["dex"] or (hero["dex"] == mob["dex"] and random.random() < 0.5)

    for turn in range(1, max_turns + 1):
        if hero["hp"] <= 0 or mob["hp"] <= 0:
            break

        turn_log: dict = {"turn": turn, "actions": []}

        # 액티브 스킬 확인
        skill_mult = 1.0
        fired_skill = None
        for sk in active_skills:
            cond = sk["trigger_condition"]
            pts  = skill_logs[sk["id"]]["invested_points"]
            prob = sk["base_trigger_param"] + sk["trigger_param_coeff"] * pts

            triggered = False
            if cond == "battle_start"  and turn == 1:        triggered = True
            elif cond == "first_strike" and turn == 1 and hero_first: triggered = True
            elif cond == "every_3_turns" and turn % 3 == 0:  triggered = True
            elif cond == "hp_below_25"  and hero["hp"] / hero["max_hp"] < 0.25: triggered = True
            elif cond == "on_hit"       and random.random() < prob / 100: triggered = True
            elif cond == "on_crit":     pass  # 치명타 직후 처리

            if triggered:
                mp_cost = int(sk["mp_cost"] + sk["mp_cost_coeff"] * pts)
                if hero["mp"] >= mp_cost:
                    hero["mp"] -= mp_cost
                    fired_skill = sk
                    eff = sk["base_effect_value"] + sk["effect_coeff"] * pts
                    code = sk["effect_code"]
                    if "PATK_PCT_TURN" in code:
                        skill_mult = 1 + eff / 100
                    elif code == "HP_RESTORE":
                        heal = int(hero["max_hp"] * eff / 100)
                        hero["hp"] = min(hero["hp"] + heal, hero["max_hp"])
                        turn_log["actions"].append(f"[{sk['name']}] HP +{heal}")
                    elif code == "DEATH_SURVIVE":
                        hero["__survive_chance"] = eff / 100
                    break

        attacker, defender = (hero, mob) if (turn == 1 and hero_first) or (turn > 1) else (mob, hero)

        # 더블어택 아이템 패시브
        attacks = 2 if ("더블어택" in hero.get("passive_items", []) and random.random() < 0.5) else 1
        # EXTRA_HIT 스킬
        if fired_skill and fired_skill["effect_code"] == "EXTRA_HIT":
            attacks += 1

        # 영웅 공격
        for _ in range(attacks):
            dmg, crit, miss = _calc_damage(hero, mob, bcfg, skill_mult)
            if miss:
                turn_log["actions"].append("빗나감!")
            else:
                mob["hp"] -= dmg
                crit_str = " (치명타!)" if crit else ""
                turn_log["actions"].append(f"[영웅] {dmg} 데미지{crit_str}")
                # on_crit 스킬
                if crit:
                    for sk in active_skills:
                        if sk["trigger_condition"] == "on_crit":
                            pts = skill_logs[sk["id"]]["invested_points"]
                            eff = sk["base_effect_value"] + sk["effect_coeff"] * pts
                            skill_mult = max(skill_mult, 1 + eff / 100)

        if mob["hp"] <= 0:
            turn_log["actions"].append(f"몬스터 처치!")
            turns.append(turn_log)
            break

        # 몬스터 공격
        dmg, crit, miss = _calc_damage(mob, hero, bcfg)
        if miss:
            turn_log["actions"].append("몬스터 빗나감!")
            # on_evade 스킬
            for sk in active_skills:
                if sk["trigger_condition"] == "on_evade":
                    pts  = skill_logs[sk["id"]]["invested_points"]
                    eff  = sk["base_effect_value"] + sk["effect_coeff"] * pts
                    mp_c = int(sk["mp_cost"] + sk["mp_cost_coeff"] * pts)
                    if hero["mp"] >= mp_c:
                        hero["mp"] -= mp_c
                        counter, _, _ = _calc_damage(hero, mob, bcfg, eff / 100)
                        mob["hp"] -= counter
                        turn_log["actions"].append(f"[{sk['name']}] 반격 {counter} 데미지")
        else:
            hero["hp"] -= dmg
            # 기사회생 처리
            if hero["hp"] <= 0:
                survive_chance = hero.pop("__survive_chance", 0)
                if random.random() < survive_chance:
                    hero["hp"] = 1
                    turn_log["actions"].append("[기사회생] HP 1로 생존!")
                else:
                    turn_log["actions"].append(f"[몬스터] {dmg} 데미지 — 쓰러짐")
                    turns.append(turn_log)
                    break
            else:
                crit_str = " (치명타!)" if crit else ""
                turn_log["actions"].append(f"[몬스터] {dmg} 데미지{crit_str}")

        turn_log["hero_hp"]  = max(0, hero["hp"])
        turn_log["mob_hp"]   = max(0, mob["hp"])
        turns.append(turn_log)

    result = "win" if mob["hp"] <= 0 else "lose"
    grade  = monster["grade"]

    if result == "win":
        exp_gained  = cfg_int(load_config(), f"monster_grade_{grade}_exp", 50)
        tickets_won = cfg_int(load_config(), f"monster_grade_{grade}_tickets", 1)
        result_data = gain_exp(conn, exp_gained)
        char2 = db.get_character(conn)
        db.update_character(conn, draw_tickets=char2["draw_tickets"] + tickets_won)
    else:
        exp_gained  = 0
        tickets_won = 0

    # HP 원복 처리
    restore_mode = load_battle_config().get("restore_hp_after_battle", "full")
    if restore_mode == "full":
        char3 = db.get_character(conn)
        db.update_character(conn, current_hp=char3["max_hp"], current_mp=char3["max_mp"])

    db.add_battle_log(conn, monster["name"], grade, result, exp_gained, tickets_won, turns)

    return {
        "result":      result,
        "turns":       turns,
        "exp_gained":  exp_gained,
        "tickets_won": tickets_won,
        "monster":     monster,
        "hero_final_hp": max(0, hero["hp"]),
        "mob_final_hp":  max(0, mob["hp"]),
    }
