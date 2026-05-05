"""데일리 탭 — 텍스트 AI 판정 + 체크리스트 + 활동 로그."""
import streamlit as st
from database.db import (
    get_character, add_activity_log, get_recent_activities,
    get_checklist_items, add_checklist_log, get_today_checked_item_ids,
)
from services.ai_service import judge_activity
from services.game_service import gain_exp


def render(conn):
    def _refresh():
        st.session_state.char = get_character(conn)

    tab_ai, tab_check, tab_log = st.tabs(["✏️ AI 활동 입력", "✅ 체크리스트", "📜 기록"])

    # ── AI 판정 ──────────────────────────────────────────────────────────────
    with tab_ai:
        activity = st.text_area(
            "오늘 뭘 했나요?",
            placeholder="예: 오전에 30분 런닝. 페이스 6분/km 유지.",
            height=110,
        )
        if st.button("⚡ AI 판정", type="primary", use_container_width=True):
            if not activity.strip():
                st.warning("활동 내용을 입력해주세요.")
            else:
                with st.spinner("판정 중..."):
                    result = judge_activity(conn, activity.strip())

                if result["error"] == "rate_limit":
                    st.error("요청이 너무 많습니다. 1분 후 다시 시도해주세요.")
                elif result["error"]:
                    st.error(f"오류: {result['error']}")
                else:
                    exp = result["exp"]
                    lv_result = gain_exp(conn, exp)
                    add_activity_log(conn, activity.strip(), "text", exp, result["comment"])
                    _refresh()

                    st.markdown(f"""
                    <div style="background:white;border-radius:14px;padding:14px;border-left:4px solid #f39c12;margin:8px 0;">
                      <div style="font-size:22px;font-weight:800;color:#f39c12;">+{exp} EXP</div>
                      <div style="font-size:13px;color:#374151;margin-top:4px;">💬 "{result['comment']}"</div>
                    </div>""", unsafe_allow_html=True)

                    if lv_result["leveled_up"]:
                        st.balloons()
                        r = lv_result["rewards"]
                        st.success(
                            f"🎉 레벨 업! → Lv.{lv_result['new_level']}  |  "
                            f"스탯+{r['stat_points']} 스킬+{r['skill_points']} 뽑기권+{r['draw_tickets']}"
                        )

    # ── 체크리스트 ────────────────────────────────────────────────────────────
    with tab_check:
        items       = get_checklist_items(conn)
        checked_ids = get_today_checked_item_ids(conn)

        if not items:
            st.info("⚙️ 설정에서 체크리스트 항목을 추가하세요.")
        else:
            for item in items:
                done = item["id"] in checked_ids
                strip_color = "#9ca3af" if done else "#f0a500"
                title_style = "color:#9ca3af;text-decoration:line-through;" if done else "color:#1f2937;"

                st.markdown(f"""
                <div class="daily-item">
                  <div class="daily-strip" style="background:{strip_color};">
                    <div class="daily-chkbox" style="{'background:white;border-color:white;' if done else 'background:#f5c842;border-color:#e6b400;'}">
                      {'✓' if done else ''}
                    </div>
                  </div>
                  <div class="daily-content">
                    <p style="margin:0;font-size:13px;font-weight:600;{title_style}">{item['name']}</p>
                    <p style="margin:2px 0 0;font-size:11px;color:#9ca3af;">+{item['fixed_exp']} EXP</p>
                  </div>
                </div>""", unsafe_allow_html=True)

                if not done:
                    if st.button(f"완료", key=f"chk_{item['id']}", use_container_width=True):
                        lv_result = gain_exp(conn, item["fixed_exp"])
                        add_checklist_log(conn, item["id"], item["fixed_exp"])
                        add_activity_log(conn, item["name"], "checklist", item["fixed_exp"], "체크리스트 완료!")
                        _refresh()
                        if lv_result["leveled_up"]:
                            st.balloons()
                            st.success(f"🎉 레벨 업! → Lv.{lv_result['new_level']}")
                        st.rerun()

    # ── 활동 로그 ─────────────────────────────────────────────────────────────
    with tab_log:
        logs = get_recent_activities(conn)
        if not logs:
            st.info("아직 활동 기록이 없습니다.")
        else:
            for log in logs:
                badge = "✏️" if log["input_type"] == "text" else "✅"
                with st.expander(f"{badge} +{log['exp_gained']} EXP  {log['created_at'][:16]}"):
                    st.write(log["input_text"])
                    if log["ai_comment"]:
                        st.caption(f'💬 "{log["ai_comment"]}"')
