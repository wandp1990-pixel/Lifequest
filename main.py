"""
앱 진입점. 캐릭터 요약 사이드바 + 페이지 라우팅.
"""
import streamlit as st
from database.db import get_connection, get_character
from config import load_config
from services.game_service import required_exp

st.set_page_config(
    page_title="Life Quest",
    page_icon="⚔️",
    layout="wide",
    initial_sidebar_state="collapsed",
)

conn = get_connection()

# session_state에 캐릭터 로드 (앱 접속 시 1회만 DB에서 읽음)
if "char" not in st.session_state:
    st.session_state.char = get_character(conn)


def refresh_char():
    st.session_state.char = get_character(conn)


char = st.session_state.char

# ── 사이드바 캐릭터 요약 ───────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("### ⚔️ Life Quest")
    st.divider()

    lv   = char.get("level", 1)
    exp  = char.get("total_exp", 0)
    need = required_exp(lv)
    hp   = char.get("current_hp", 0)
    mhp  = char.get("max_hp", 1)
    mp   = char.get("current_mp", 0)
    mmp  = char.get("max_mp", 1)

    st.metric("레벨", lv)
    st.progress(min(exp / need, 1.0), text=f"EXP {exp:,} / {need:,}")
    st.progress(min(hp / mhp, 1.0), text=f"HP {hp:,} / {mhp:,}")
    st.progress(min(mp / mmp, 1.0), text=f"MP {mp:,} / {mmp:,}")
    st.divider()

    col1, col2, col3 = st.columns(3)
    col1.metric("스탯 포인트", char.get("stat_points", 0))
    col2.metric("스킬 포인트", char.get("skill_points", 0))
    col3.metric("뽑기권", char.get("draw_tickets", 0))

    st.divider()
    stats = ["str","vit","dex","int_stat","luk"]
    labels = ["STR","VIT","DEX","INT","LUK"]
    for s, l in zip(stats, labels):
        st.text(f"{l}: {char.get(s, 1)}")

# ── 메인 화면 ─────────────────────────────────────────────────────────────────
st.title("⚔️ Life Quest")
st.caption("일상을 게임으로. AI GM이 당신의 성장을 판정합니다.")

col1, col2, col3 = st.columns(3)
with col1:
    st.page_link("pages/1_activity.py",  label="📝 활동 입력", use_container_width=True)
with col2:
    st.page_link("pages/2_character.py", label="👤 캐릭터",    use_container_width=True)
with col3:
    st.page_link("pages/3_battle.py",    label="⚔️ 전투",      use_container_width=True)

col4, col5 = st.columns(2)
with col4:
    st.page_link("pages/4_inventory.py", label="🎒 인벤토리", use_container_width=True)
with col5:
    st.page_link("pages/5_settings.py",  label="⚙️ 설정",     use_container_width=True)
