"""
설정 페이지. 수치/프롬프트/체크리스트/몬스터 관리자 편집.
"""
import streamlit as st
from database.db import (
    get_connection,
    get_game_config, set_game_config,
    get_battle_config_full, set_battle_config,
    get_active_prompt, upsert_prompt,
    get_checklist_items, get_monsters,
)
import database.db as _db

conn = get_connection()

st.title("⚙️ 설정")

tab_prompt, tab_check, tab_config, tab_battle, tab_monster = st.tabs([
    "💬 판정 프롬프트", "✅ 체크리스트", "📊 게임 수치", "⚔️ 전투 수치", "👾 몬스터"
])

# ── 판정 프롬프트 ──────────────────────────────────────────────────────────────
with tab_prompt:
    st.subheader("AI 판정 프롬프트")
    current = get_active_prompt(conn, "general")
    new_prompt = st.text_area("프롬프트 내용", value=current, height=300)
    if st.button("저장", type="primary"):
        upsert_prompt(conn, "general", new_prompt)
        st.cache_data.clear()
        st.success("저장됨!")

# ── 체크리스트 관리 ────────────────────────────────────────────────────────────
with tab_check:
    st.subheader("체크리스트 항목 관리")
    items = get_checklist_items(conn)

    st.markdown("**기존 항목**")
    for item in items:
        col1, col2, col3 = st.columns([3, 1, 1])
        col1.text(item["name"])
        new_exp = col2.number_input("EXP", value=item["fixed_exp"], min_value=1, max_value=9999,
                                    key=f"exp_{item['id']}", label_visibility="collapsed")
        if col2.button("저장", key=f"save_chk_{item['id']}"):
            conn.execute("UPDATE checklist_item SET fixed_exp = ? WHERE id = ?", (new_exp, item["id"]))
            conn.commit()
            st.rerun()
        if col3.button("삭제", key=f"del_chk_{item['id']}"):
            conn.execute("UPDATE checklist_item SET is_active = 0 WHERE id = ?", (item["id"],))
            conn.commit()
            st.rerun()

    st.divider()
    st.markdown("**새 항목 추가**")
    new_name = st.text_input("항목명", key="new_chk_name")
    new_exp_add = st.number_input("고정 EXP", value=10, min_value=1, max_value=9999, key="new_chk_exp")
    if st.button("추가"):
        if new_name.strip():
            conn.execute("INSERT INTO checklist_item (name, fixed_exp) VALUES (?,?)",
                         (new_name.strip(), new_exp_add))
            conn.commit()
            st.rerun()

# ── 게임 수치 ──────────────────────────────────────────────────────────────────
with tab_config:
    st.subheader("게임 수치 (game_config)")
    st.caption("변경 후 '저장' 클릭. 앱 전체에 즉시 반영됩니다.")

    cfg = get_game_config(conn)
    all_cfg_rows = _db._rows(conn.execute("SELECT * FROM game_config ORDER BY id"))

    edited = st.data_editor(
        [{
            "키": r["config_key"],
            "값": r["config_value"],
            "설명": r["description"],
        } for r in all_cfg_rows],
        column_config={
            "키": st.column_config.TextColumn("키", disabled=True),
            "값": st.column_config.TextColumn("값"),
            "설명": st.column_config.TextColumn("설명", disabled=True),
        },
        use_container_width=True,
        num_rows="fixed",
        key="game_config_editor",
    )

    if st.button("저장", type="primary", key="save_game_config"):
        for row in edited:
            set_game_config(conn, row["키"], row["값"])
        st.cache_data.clear()
        st.success("저장됨!")

# ── 전투 수치 ──────────────────────────────────────────────────────────────────
with tab_battle:
    st.subheader("전투 수치 (battle_config)")
    bcfg_rows = get_battle_config_full(conn)

    edited_b = st.data_editor(
        [{
            "키": r["config_key"],
            "값": r["config_value"],
            "설명": r["label"],
        } for r in bcfg_rows],
        column_config={
            "키": st.column_config.TextColumn("키", disabled=True),
            "값": st.column_config.TextColumn("값"),
            "설명": st.column_config.TextColumn("설명", disabled=True),
        },
        use_container_width=True,
        num_rows="fixed",
        key="battle_config_editor",
    )

    if st.button("저장", type="primary", key="save_battle_config"):
        for row in edited_b:
            set_battle_config(conn, row["키"], row["값"])
        st.cache_data.clear()
        st.success("저장됨!")

# ── 몬스터 관리 ────────────────────────────────────────────────────────────────
with tab_monster:
    st.subheader("몬스터 목록")
    monsters = get_monsters(conn)

    if monsters:
        edited_m = st.data_editor(
            [{
                "ID": m["id"], "이름": m["name"], "종족": m["race"],
                "HP": m["base_hp"], "물공": m["base_atk"], "마공": m["base_matk"],
                "물방": m["base_pdef"], "마방": m["base_mdef"],
                "민첩": m["base_dex"], "운": m["base_luk"],
            } for m in monsters],
            use_container_width=True,
            num_rows="dynamic",
            key="monster_editor",
        )

        if st.button("저장", type="primary", key="save_monsters"):
            for row in edited_m:
                conn.execute(
                    """UPDATE monster_table SET name=?,race=?,base_hp=?,base_atk=?,base_matk=?,
                       base_pdef=?,base_mdef=?,base_dex=?,base_luk=? WHERE id=?""",
                    (row["이름"], row["종족"], row["HP"], row["물공"], row["마공"],
                     row["물방"], row["마방"], row["민첩"], row["운"], row["ID"]),
                )
            conn.commit()
            st.success("저장됨!")
