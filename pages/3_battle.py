"""
전투 페이지. 몬스터 생성 → 자동 시뮬레이션 → 결과 표시.
"""
import streamlit as st
from database.db import get_connection, get_character, get_recent_battles
from services.battle_service import generate_monster, run_battle

conn = get_connection()


def _refresh():
    st.session_state.char = get_character(conn)


st.title("⚔️ 전투")

char = get_character(conn)
clear_count = len(get_recent_battles(conn))

# session_state에 몬스터 유지
if "current_monster" not in st.session_state:
    st.session_state.current_monster = None
if "battle_result" not in st.session_state:
    st.session_state.battle_result = None

# ── 몬스터 생성 ───────────────────────────────────────────────────────────────
col1, col2 = st.columns([2, 1])

with col1:
    if st.button("🎲 새 몬스터 소환", type="primary", use_container_width=True):
        st.session_state.current_monster = generate_monster(conn, char["level"], clear_count)
        st.session_state.battle_result   = None

monster = st.session_state.current_monster

if monster:
    st.subheader(f"{monster['name']} ({monster['grade_name']})")
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("HP", monster["hp"])
    m2.metric("물리 공격", monster["atk"])
    m3.metric("마법 공격", monster["matk"])
    m4.metric("민첩", monster["dex"])

    m5, m6 = st.columns(2)
    m5.metric("물리방어", monster["pdef"])
    m6.metric("마법방어", monster["mdef"])

    st.divider()

    # ── 전투 실행 ──────────────────────────────────────────────────────────────
    if st.button("⚔️ 전투 시작!", type="primary", use_container_width=True):
        with st.spinner("전투 중..."):
            result = run_battle(conn, monster)
        st.session_state.battle_result = result
        _refresh()

    if st.session_state.battle_result:
        br = st.session_state.battle_result
        result_str = "승리! 🎉" if br["result"] == "win" else "패배... 💀"
        st.subheader(result_str)

        if br["result"] == "win":
            st.success(f"+{br['exp_gained']} EXP | 뽑기권 +{br['tickets_won']}")

        # 전투 로그 표시
        with st.expander("📜 전투 로그 보기"):
            for t in br["turns"]:
                st.markdown(f"**턴 {t['turn']}**")
                for action in t.get("actions", []):
                    st.text(f"  {action}")
                hp_h = t.get("hero_hp", "?")
                hp_m = t.get("mob_hp", "?")
                st.caption(f"영웅 HP: {hp_h} | 몬스터 HP: {hp_m}")

        if br["result"] == "lose":
            if st.button("🔄 재도전", use_container_width=True):
                # 패배 시 같은 몬스터로 재도전 (HP 원복은 battle_service에서 처리)
                new_monster = {**monster}
                new_monster["hp"] = new_monster["max_hp"]
                st.session_state.current_monster = new_monster
                st.session_state.battle_result   = None
                st.rerun()
else:
    st.info("'새 몬스터 소환' 버튼을 눌러 전투를 시작하세요.")

# ── 최근 전투 기록 ─────────────────────────────────────────────────────────────
st.divider()
st.subheader("최근 전투 기록")
battles = get_recent_battles(conn)
if not battles:
    st.info("전투 기록이 없습니다.")
else:
    for b in battles:
        result_emoji = "🏆" if b["result"] == "win" else "💀"
        st.text(f"{result_emoji} {b['monster_name']} ({b['monster_grade']}) — {b['created_at'][:16]}")
