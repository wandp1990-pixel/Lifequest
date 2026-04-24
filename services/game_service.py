"""
EXP 획득, 레벨업 판정, 보상 지급, 스탯 재계산.
"""
import math
import streamlit as st
from config import load_config, load_battle_config, cfg_float, cfg_int
from database import db


def required_exp(level: int) -> int:
    """레벨 n→n+1 필요 EXP. 순차 올림 반복 방식."""
    cfg = load_config()
    base = cfg_int(cfg, "base_exp", 100)
    mult = cfg_float(cfg, "level_multiplier", 1.01)
    val = float(base)
    for _ in range(level - 1):
        val = math.ceil(val * mult)
    return int(val)


def recalculate_hp_mp(char: dict, bcfg: dict) -> tuple[int, int]:
    """캐릭터 스탯 기반 최대 HP/MP 재계산."""
    vit_to_hp = cfg_float(bcfg, "vit_to_max_hp", 10.0)
    int_to_mp  = cfg_float(bcfg, "int_to_max_mp", 5.0)
    max_hp = char["base_hp"] + int(char["vit"] * vit_to_hp)
    max_mp = char["base_mp"] + int(char["int_stat"] * int_to_mp)
    return max_hp, max_mp


def gain_exp(conn, exp_amount: int) -> dict:
    """
    EXP 지급 후 레벨업 처리. 반환값:
    {leveled_up: bool, old_level: int, new_level: int, rewards: dict}
    """
    char = db.get_character(conn)
    cfg  = load_config()
    bcfg = load_battle_config()

    old_level  = char["level"]
    total_exp  = char["total_exp"] + exp_amount
    level      = old_level
    stat_pts   = char["stat_points"]
    skill_pts  = char["skill_points"]
    tickets    = char["draw_tickets"]

    stat_per_lv   = cfg_int(cfg, "stat_points_per_level", 3)
    skill_per_lv  = cfg_int(cfg, "skill_points_per_level", 2)
    ticket_per_lv = cfg_int(cfg, "draw_tickets_per_level", 1)

    leveled_up = False
    while total_exp >= required_exp(level):
        total_exp -= required_exp(level)
        level     += 1
        stat_pts  += stat_per_lv
        skill_pts += skill_per_lv
        tickets   += ticket_per_lv
        leveled_up = True

    max_hp, max_mp = recalculate_hp_mp({**char, "level": level}, bcfg)
    current_hp = max_hp if leveled_up else min(char["current_hp"], max_hp)
    current_mp = max_mp if leveled_up else min(char["current_mp"], max_mp)

    db.update_character(
        conn,
        level=level,
        total_exp=total_exp,
        stat_points=stat_pts,
        skill_points=skill_pts,
        draw_tickets=tickets,
        max_hp=max_hp,
        max_mp=max_mp,
        current_hp=current_hp,
        current_mp=current_mp,
    )

    return {
        "leveled_up": leveled_up,
        "old_level": old_level,
        "new_level": level,
        "rewards": {
            "stat_points": stat_pts - char["stat_points"],
            "skill_points": skill_pts - char["skill_points"],
            "draw_tickets": tickets - char["draw_tickets"],
        },
    }


def allocate_stat(conn, stat_name: str, amount: int = 1) -> bool:
    """스탯 포인트 1점 소비 후 해당 스탯 +1."""
    char = db.get_character(conn)
    if char["stat_points"] < amount:
        return False
    bcfg = load_battle_config()
    updates = {
        stat_name: char[stat_name] + amount,
        "stat_points": char["stat_points"] - amount,
    }
    merged = {**char, **updates}
    max_hp, max_mp = recalculate_hp_mp(merged, bcfg)
    updates["max_hp"] = max_hp
    updates["max_mp"] = max_mp
    updates["current_hp"] = min(char["current_hp"], max_hp)
    updates["current_mp"] = min(char["current_mp"], max_mp)
    db.update_character(conn, **updates)
    return True


def invest_skill_point(conn, skill_id: str) -> bool:
    """스킬 포인트 1점 소비 후 해당 스킬 투자."""
    char = db.get_character(conn)
    if char["skill_points"] < 1:
        return False

    skills = {s["id"]: s for s in db.get_all_skills(conn)}
    if skill_id not in skills:
        return False

    skill = skills[skill_id]
    char_level = char["level"]
    if char_level < skill["unlock_level"]:
        return False

    logs = {s["skill_id"]: s for s in db.get_skill_log(conn)}
    current = logs.get(skill_id, {})
    invested = current.get("invested_points", 0)
    if invested >= skill["max_skp"]:
        return False

    db.upsert_skill_log(conn, skill_id, invested + 1, 1)
    db.update_character(conn, skill_points=char["skill_points"] - 1)
    return True


def get_passive_bonuses(conn) -> dict:
    """
    현재 스킬 투자량 기반 패시브 보너스 계산.
    반환: {effect_code: total_bonus_value}
    """
    logs = {s["skill_id"]: s for s in db.get_skill_log(conn)}
    skills = {s["id"]: s for s in db.get_all_skills(conn)}
    bonuses: dict[str, float] = {}

    for sid, log in logs.items():
        if not log.get("is_unlocked"):
            continue
        skill = skills.get(sid)
        if not skill or skill["type"] != "passive":
            continue
        pts = log["invested_points"]
        val = skill["base_effect_value"] + skill["effect_coeff"] * pts
        code = skill["effect_code"]
        bonuses[code] = bonuses.get(code, 0.0) + val

    return bonuses
