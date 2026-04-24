"""
인벤토리 페이지. 아이템 목록, 장착/해제, 뽑기권 사용.
"""
import json
import streamlit as st
from database.db import get_connection, get_character, get_equipment, equip_item, unequip_item, delete_equipment
from services.item_service import generate_item

conn = get_connection()

SLOT_LABELS = {
    "weapon":"무기","helmet":"투구","armor":"갑옷","pants":"바지",
    "belt":"벨트","glove":"장갑","shoe":"신발","necklace":"목걸이","ring":"반지",
}
GRADE_COLORS = {
    "C":"⬜","B":"🟩","A":"🟦","S":"🟨","SR":"🟧","SSR":"🟥","UR":"🟪",
}


def _refresh():
    st.session_state.char = get_character(conn)


st.title("🎒 인벤토리")

char = get_character(conn)

# ── 뽑기권 사용 ────────────────────────────────────────────────────────────────
col1, col2 = st.columns([2, 1])
with col1:
    st.metric("뽑기권", char["draw_tickets"])
with col2:
    if char["draw_tickets"] > 0:
        if st.button("🎰 뽑기!", type="primary", use_container_width=True):
            item = generate_item(conn, char["level"])
            if item:
                _refresh()
                grade_icon = GRADE_COLORS.get(item["grade"], "⬛")
                st.success(f"{grade_icon} **[{item['grade']}] {item['name']}** 획득!")
                with st.expander("옵션 확인"):
                    opts = item["options"]
                    for k, v in opts.items():
                        if isinstance(v, dict):
                            val = v.get("value", "?")
                            unit = v.get("unit", "")
                            if unit == "passive":
                                st.text(f"  ✨ {k}: {v.get('desc','')}")
                            else:
                                st.text(f"  • {k}: +{val}{unit}")
                st.rerun()
    else:
        st.button("뽑기권 없음", disabled=True, use_container_width=True)

st.divider()

# ── 장착 중인 아이템 ───────────────────────────────────────────────────────────
st.subheader("장착 중")
items     = get_equipment(conn)
equipped  = [i for i in items if i["is_equipped"]]
inventory = [i for i in items if not i["is_equipped"]]

if equipped:
    for item in equipped:
        grade_icon = GRADE_COLORS.get(item["grade"], "⬛")
        slot_name  = SLOT_LABELS.get(item["slot"], item["slot"])
        col1, col2, col3 = st.columns([3, 1, 1])
        col1.markdown(f"{grade_icon} **[{item['grade']}] {item['name']}** — {slot_name}")
        opts = json.loads(item.get("options","{}"))
        opt_str = " | ".join(
            f"{k}: +{v['value']}{v.get('unit','')}" if isinstance(v,dict) and v.get('unit') != 'passive'
            else f"✨{k}"
            for k, v in opts.items()
        )
        col1.caption(opt_str[:80])
        if col3.button("해제", key=f"unequip_{item['id']}", use_container_width=True):
            unequip_item(conn, item["id"])
            st.rerun()
else:
    st.info("장착 중인 아이템이 없습니다.")

st.divider()

# ── 인벤토리 ───────────────────────────────────────────────────────────────────
st.subheader(f"보관함 ({len(inventory)}개)")

if not inventory:
    st.info("아이템이 없습니다. 뽑기권을 사용해보세요!")
else:
    for item in inventory:
        grade_icon = GRADE_COLORS.get(item["grade"], "⬛")
        slot_name  = SLOT_LABELS.get(item["slot"], item["slot"])
        with st.expander(f"{grade_icon} [{item['grade']}] {item['name']} — {slot_name}"):
            opts = json.loads(item.get("options","{}"))
            for k, v in opts.items():
                if isinstance(v, dict):
                    if v.get("unit") == "passive":
                        st.text(f"✨ {k}: {v.get('desc','')}")
                    else:
                        st.text(f"• {k}: +{v['value']}{v.get('unit','')}")

            col1, col2 = st.columns(2)
            if col1.button("장착", key=f"equip_{item['id']}", use_container_width=True):
                equip_item(conn, item["id"])
                st.rerun()
            if col2.button("버리기", key=f"del_{item['id']}", use_container_width=True):
                delete_equipment(conn, item["id"])
                st.rerun()
