"""
캐릭터 페이지. 스탯 분배, 스킬 투자, 현황 조회.
"""
import streamlit as st
from database.db import get_connection, get_character, get_all_skills, get_skill_log
from services.game_service import allocate_stat, invest_skill_point, required_exp

conn = get_connection()


def _refresh():
    st.session_state.char = get_character(conn)


char = get_character(conn)
st.title("👤 캐릭터")

# ── 기본 정보 ──────────────────────────────────────────────────────────────────
lv   = char["level"]
exp  = char["total_exp"]
need = required_exp(lv)

col1, col2, col3, col4 = st.columns(4)
col1.metric("레벨", lv)
col2.metric("누적 EXP", f"{exp:,}")
col3.metric("다음 레벨까지", f"{need - exp:,}")
col4.metric("뽑기권", char["draw_tickets"])

st.progress(min(exp / need, 1.0), text=f"EXP {exp:,} / {need:,}")

# ── HP / MP ───────────────────────────────────────────────────────────────────
c1, c2 = st.columns(2)
c1.progress(char["current_hp"] / max(char["max_hp"], 1),
            text=f"HP {char['current_hp']:,} / {char['max_hp']:,}")
c2.progress(char["current_mp"] / max(char["max_mp"], 1),
            text=f"MP {char['current_mp']:,} / {char['max_mp']:,}")

st.divider()

# ── 스탯 분배 ──────────────────────────────────────────────────────────────────
st.subheader(f"스탯 — 포인트 남음: {char['stat_points']}점")

stat_map = {
    "str":      ("STR (힘)",      "물리 공격력에 영향"),
    "vit":      ("VIT (체력)",    "최대 HP에 영향"),
    "dex":      ("DEX (민첩)",    "명중·회피에 영향"),
    "int_stat": ("INT (지능)",    "마법 공격력·최대 MP에 영향"),
    "luk":      ("LUK (운)",      "치명타율에 영향"),
}

cols = st.columns(5)
for i, (key, (label, hint)) in enumerate(stat_map.items()):
    with cols[i]:
        st.metric(label, char[key], help=hint)
        if char["stat_points"] > 0:
            if st.button("+1", key=f"stat_{key}", use_container_width=True):
                if allocate_stat(conn, key):
                    _refresh()
                    st.rerun()

st.divider()

# ── 스킬 투자 ──────────────────────────────────────────────────────────────────
st.subheader(f"스킬 — 포인트 남음: {char['skill_points']}점")

all_skills  = get_all_skills(conn)
skill_logs  = {s["skill_id"]: s for s in get_skill_log(conn)}

tab_passive, tab_active = st.tabs(["패시브", "액티브"])

for tab, stype in [(tab_passive, "passive"), (tab_active, "active")]:
    with tab:
        skills = [s for s in all_skills if s["type"] == stype]
        if not skills:
            st.info("스킬 없음")
            continue

        for sk in skills:
            log     = skill_logs.get(sk["id"], {})
            invested = log.get("invested_points", 0)
            unlocked = log.get("is_unlocked", 0)
            locked   = char["level"] < sk["unlock_level"]

            col1, col2, col3 = st.columns([4, 2, 2])
            status = "🔒" if locked else ("✅" if unlocked else "🔓")
            col1.markdown(f"**{status} {sk['name']}** (해금 Lv.{sk['unlock_level']})")
            col1.caption(sk["description"])
            col2.metric("투자", f"{invested}/{sk['max_skp']}")

            can_invest = (
                not locked
                and char["skill_points"] > 0
                and invested < sk["max_skp"]
            )
            with col3:
                if can_invest:
                    if st.button("투자 +1", key=f"sk_{sk['id']}", use_container_width=True):
                        if invest_skill_point(conn, sk["id"]):
                            _refresh()
                            st.rerun()
                elif locked:
                    st.caption(f"Lv.{sk['unlock_level']} 필요")
                elif invested >= sk["max_skp"]:
                    st.caption("MAX")
