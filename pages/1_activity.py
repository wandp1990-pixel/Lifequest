"""
활동 입력 페이지. 텍스트 자유 입력(AI 판정) + 체크리스트(고정 EXP).
"""
import streamlit as st
from database.db import (
    get_connection, get_character,
    add_activity_log, get_recent_activities,
    get_checklist_items, add_checklist_log, get_today_checked_item_ids,
)
from services.ai_service import judge_activity
from services.game_service import gain_exp

conn = get_connection()


def _refresh():
    st.session_state.char = get_character(conn)


st.title("📝 활동 입력")

tab_text, tab_check, tab_log = st.tabs(["✏️ 텍스트 입력", "✅ 체크리스트", "📜 활동 로그"])

# ── 텍스트 입력 탭 ─────────────────────────────────────────────────────────────
with tab_text:
    st.subheader("오늘 뭘 했나요?")
    activity = st.text_area(
        "활동 내용을 구체적으로 적어주세요",
        placeholder="예: 오전에 30분 런닝을 했다. 페이스는 6분/km 유지.",
        height=120,
        label_visibility="collapsed",
    )

    if st.button("⚡ AI 판정 받기", type="primary", use_container_width=True):
        if not activity.strip():
            st.warning("활동 내용을 입력해주세요.")
        else:
            with st.spinner("AI가 판정 중..."):
                result = judge_activity(conn, activity.strip())

            if result["error"] == "rate_limit":
                st.error("요청이 너무 많습니다. 1분 후 다시 시도해주세요.")
            elif result["error"]:
                st.error(f"오류가 발생했습니다: {result['error']}")
            else:
                exp = result["exp"]
                comment = result["comment"]

                level_result = gain_exp(conn, exp)
                add_activity_log(conn, activity.strip(), "text", exp, comment)
                _refresh()

                st.success(f"**+{exp} EXP** 획득!")
                st.info(f'💬 "{comment}"')

                if level_result["leveled_up"]:
                    st.balloons()
                    new_lv = level_result["new_level"]
                    st.success(f"🎉 레벨 업! {level_result['old_level']} → {new_lv}")
                    r = level_result["rewards"]
                    st.info(
                        f"보상: 스탯 포인트 +{r['stat_points']} "
                        f"| 스킬 포인트 +{r['skill_points']} "
                        f"| 뽑기권 +{r['draw_tickets']}"
                    )

# ── 체크리스트 탭 ──────────────────────────────────────────────────────────────
with tab_check:
    st.subheader("오늘의 체크리스트")
    items       = get_checklist_items(conn)
    checked_ids = get_today_checked_item_ids(conn)

    if not items:
        st.info("체크리스트 항목이 없습니다. 설정에서 추가하세요.")
    else:
        for item in items:
            col1, col2 = st.columns([3, 1])
            already = item["id"] in checked_ids
            label = f"{'~~' if already else ''}{item['name']}{'~~' if already else ''} (+{item['fixed_exp']} EXP)"
            if col1.checkbox(label, value=already, disabled=already, key=f"chk_{item['id']}"):
                if not already:
                    level_result = gain_exp(conn, item["fixed_exp"])
                    add_checklist_log(conn, item["id"], item["fixed_exp"])
                    add_activity_log(conn, item["name"], "checklist", item["fixed_exp"], "체크리스트 완료!")
                    _refresh()
                    st.success(f"✅ {item['name']} 완료! +{item['fixed_exp']} EXP")
                    if level_result["leveled_up"]:
                        st.balloons()
                        st.success(f"🎉 레벨 업! → Lv.{level_result['new_level']}")
                    st.rerun()

# ── 활동 로그 탭 ───────────────────────────────────────────────────────────────
with tab_log:
    st.subheader("최근 활동 (최대 10건)")
    logs = get_recent_activities(conn)
    if not logs:
        st.info("아직 활동 기록이 없습니다.")
    else:
        for log in logs:
            badge = "✏️" if log["input_type"] == "text" else "✅"
            with st.expander(f"{badge} +{log['exp_gained']} EXP — {log['created_at'][:16]}"):
                st.write(log["input_text"])
                if log["ai_comment"]:
                    st.caption(f'💬 "{log["ai_comment"]}"')
