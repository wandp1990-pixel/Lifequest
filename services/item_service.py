"""
아이템 생성 로직. 뽑기권 사용 시 실시간으로 아이템 생성.
"""
import json
import random
from config import load_config, cfg_float
from database import db

SLOT_NAMES = ["weapon","helmet","armor","pants","belt","glove","shoe","necklace","ring"]

SLOT_ITEM_NAMES = {
    "weapon":   ["검","칼","도","창","도끼"],
    "helmet":   ["투구","왕관","헬멧","두건","면류관"],
    "armor":    ["갑옷","가죽갑옷","강철갑옷","로브","판금갑옷"],
    "pants":    ["바지","가죽바지","금속하의","전투복","레깅스"],
    "belt":     ["벨트","허리띠","띠","체인벨트","가죽띠"],
    "glove":    ["장갑","가죽장갑","금속장갑","팔찌","손가락보호대"],
    "shoe":     ["신발","가죽신발","부츠","운동화","샌들"],
    "necklace": ["목걸이","사슬","펜던트","목조각","토큰"],
    "ring":     ["반지","돌반지","금반지","은반지","보석반지"],
}

GRADE_PREFIXES = {
    "C":   ["낡은","평범한","거친","조잡한","헐어진"],
    "B":   ["단단한","정교한","숙련된","견고한","완성된"],
    "A":   ["마력의","봉인된","빛나는","신비로운","반짝이는"],
    "S":   ["태초의","황금의","명장의","무결한","찬란한"],
    "SR":  ["잊혀진","고대의","유물의","심연의","시간이 멈춘"],
    "SSR": ["신성한","천벌의","원시의","전설로 불린","운명의"],
    "UR":  ["불멸의","역사가 된","신들이 버린","세계를 가른","영원한"],
}

# 슬롯별 옵션 비율
SLOT_RATIOS = {
    "main":     1.0,
    "sub_1":    0.5,
    "sub_2":    0.4,
    "combat_1": 1.0,
    "combat_2": 0.8,
}

# 등급별 stat 배율 (아이템 기본 수치 스케일)
GRADE_STAT_MULT = {
    "C": 1.0, "B": 1.5, "A": 2.2, "S": 3.5, "SR": 5.0, "SSR": 8.0, "UR": 13.0,
}


def _pick_grade(grades: list[dict]) -> dict:
    weights = [g["weight"] for g in grades]
    return random.choices(grades, weights=weights, k=1)[0]


def _parse_count_range(text: str) -> int:
    """'0~1' → randint(0,1), '1' → 1, '2' → 2."""
    text = str(text).strip()
    if "~" in text:
        lo, hi = text.split("~")
        return random.randint(int(lo), int(hi))
    return int(text)


def _scale_value(base: float, level: int, grade: str) -> int:
    level_bonus = 1.0 + (level - 1) * 0.05
    return max(1, round(base * level_bonus * GRADE_STAT_MULT.get(grade, 1.0)))


def generate_item(conn, char_level: int) -> dict | None:
    """
    뽑기권 1개 소비 후 아이템 생성. draw_tickets가 0이면 None 반환.
    생성된 아이템을 DB에 저장하고 dict로 반환.
    """
    char = db.get_character(conn)
    if char["draw_tickets"] < 1:
        return None

    grades     = db.get_item_grades(conn)
    slots_data = {s["slot"]: s for s in db.get_item_slots(conn)}
    abilities  = db.get_ability_pool(conn)
    passives   = db.get_passive_pool(conn)

    grade_row  = _pick_grade(grades)
    grade      = grade_row["grade"]
    slot       = random.choice(SLOT_NAMES)
    slot_row   = slots_data.get(slot, {})

    # 기본 스탯
    base_stat = random.randint(grade_row["stat_min"], grade_row["stat_max"])
    scaled_stat = _scale_value(base_stat, char_level, grade)

    # 메인 옵션
    main_ability = slot_row.get("main_ability", "물리 공격력")
    main_pool = [a for a in abilities if a["name"] == main_ability]
    main_ab   = main_pool[0] if main_pool else abilities[0]

    options = {}

    # 메인
    options[main_ab["name"]] = {
        "value": _scale_value(main_ab["base_value"], char_level, grade),
        "unit": main_ab["unit"],
    }

    # 서브 옵션
    excluded = json.loads(slot_row.get("excluded", "[]"))
    sub_pool = [a for a in abilities if a["name"] != main_ability and a["name"] not in excluded]

    sub_count    = _parse_count_range(grade_row["sub_count"])
    combat_count = _parse_count_range(grade_row["combat_count"])
    passive_count= _parse_count_range(grade_row["passive_count"])

    chosen_names = {main_ab["name"]}
    for i, ratio_key in enumerate(["sub_1", "sub_2"][:sub_count]):
        pool = [a for a in sub_pool if a["name"] not in chosen_names]
        if not pool:
            break
        ab = random.choice(pool)
        chosen_names.add(ab["name"])
        val = round(_scale_value(ab["base_value"], char_level, grade) * SLOT_RATIOS[ratio_key])
        options[ab["name"]] = {"value": max(1, val), "unit": ab["unit"]}

    combat_pool = [a for a in sub_pool if a["category"] == "Combat" and a["name"] not in chosen_names]
    for i, ratio_key in enumerate(["combat_1", "combat_2"][:combat_count]):
        if not combat_pool:
            break
        ab = random.choice(combat_pool)
        combat_pool.remove(ab)
        chosen_names.add(ab["name"])
        val = round(_scale_value(ab["base_value"], char_level, grade) * SLOT_RATIOS[ratio_key])
        options[ab["name"]] = {"value": max(1, val), "unit": ab["unit"]}

    for _ in range(passive_count):
        avail = [p for p in passives if p["name"] not in options]
        if not avail:
            break
        p = random.choice(avail)
        options[p["name"]] = {"value": 1, "unit": "passive", "desc": p["description"]}

    # 아이템 이름
    prefix = random.choice(GRADE_PREFIXES.get(grade, ["평범한"]))
    base_name = random.choice(SLOT_ITEM_NAMES.get(slot, ["아이템"]))
    item_name = f"{prefix} {base_name}"

    item_id = db.add_equipment(conn, slot, item_name, grade, scaled_stat, options)
    db.update_character(conn, draw_tickets=char["draw_tickets"] - 1)

    return {
        "id": item_id,
        "slot": slot,
        "name": item_name,
        "grade": grade,
        "base_stat": scaled_stat,
        "options": options,
    }
