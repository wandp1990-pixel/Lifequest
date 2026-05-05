"""
CSS 주입 + HTML 컴포넌트 함수 모음.
display-only 요소(캐릭터 패널, 하단 탭바)는 순수 HTML로 렌더링.
"""

# ── 전역 CSS ──────────────────────────────────────────────────────────────────

APP_CSS = """
<style>
/* 기본 */
html, body, [class*="css"] {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif;
}
.stApp { background-color: #f9f9fb !important; }
.block-container {
    padding-top: 0.75rem !important;
    padding-left: 1rem !important;
    padding-right: 1rem !important;
    padding-bottom: 90px !important;
    max-width: 480px !important;
    margin: 0 auto !important;
}

/* Streamlit 기본 UI 제거 */
#MainMenu { visibility: hidden; }
footer    { visibility: hidden; }
header    { visibility: hidden; }
.stDeployButton           { display: none !important; }
[data-testid="stToolbar"] { display: none !important; }
section[data-testid="stSidebar"]    { display: none !important; }
[data-testid="collapsedControl"]    { display: none !important; }

/* ── 캐릭터 패널 ─────────────────────────────── */
.char-panel {
    display: flex;
    gap: 12px;
    padding: 4px 0 12px 0;
}
.char-avatar {
    width: 88px; height: 88px;
    border-radius: 16px;
    background: linear-gradient(135deg, #8b7fd4, #6c63ff);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    font-size: 44px;
    box-shadow: 0 2px 8px rgba(108,99,255,0.3);
}
.char-stats { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 7px; }
.stat-row   { display: flex; flex-direction: column; gap: 3px; }
.stat-lbl   { display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; }
.stat-val   { margin-left: auto; font-size: 10px; font-weight: 600; }
.bar-track  { height: 10px; background: #e5e7eb; border-radius: 9999px; overflow: hidden; }
.bar-fill   { height: 100%; border-radius: 9999px; }
.hp-fill    { background: linear-gradient(to right, #e74c3c, #ff6b6b); }
.mp-fill    { background: linear-gradient(to right, #3498db, #5dade2); }
.exp-fill   { background: linear-gradient(to right, #f39c12, #f1c40f); }

/* ── 레벨 바 ─────────────────────────────────── */
.level-bar {
    display: flex; align-items: center; justify-content: space-between;
    padding-bottom: 8px;
}
.level-badge {
    background: #f3f4f6; border: 1px solid #e5e7eb;
    border-radius: 10px; padding: 4px 14px;
    font-size: 13px; font-weight: 700; color: #374151;
}
.currency-row { display: flex; align-items: center; gap: 12px; }
.currency-item { display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 700; color: #374151; }

/* ── 하단 탭바 ───────────────────────────────── */
.bottom-nav {
    position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
    width: 100%; max-width: 480px;
    z-index: 9999;
    background: #f9f9fb;
    border-top: 1px solid #e5e7eb;
    display: flex; justify-content: space-around; align-items: center;
    padding: 5px 4px 8px;
}
.nav-btn {
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    padding: 5px 14px; border-radius: 14px;
    text-decoration: none; cursor: pointer; transition: background 0.15s;
    min-width: 56px;
}
.nav-icon  { font-size: 20px; line-height: 1.1; }
.nav-label { font-size: 9px; font-weight: 700; }
.nav-dot   { width: 4px; height: 4px; border-radius: 50%; margin-top: 1px; }

/* ── 데일리 아이템 ───────────────────────────── */
.daily-item {
    display: flex; align-items: stretch;
    background: white; border-bottom: 1px solid #f3f4f6;
}
.daily-strip {
    width: 44px; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; border-radius: 10px 0 0 10px;
    margin: 5px 0 5px 5px;
}
.daily-strip-on   { background: #f0a500; }
.daily-strip-off  { background: #9ca3af; }
.daily-chkbox {
    width: 24px; height: 24px; border-radius: 5px; border: 2px solid;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 900;
}
.daily-chkbox-on  { background: #f5c842; border-color: #e6b400; color: #4a4a4a; }
.daily-chkbox-off { background: white;   border-color: white;   color: white; }
.daily-content { flex: 1; padding: 10px 12px; }
.daily-title-on  { font-size: 13px; font-weight: 600; color: #1f2937; margin: 0; }
.daily-title-off { font-size: 13px; font-weight: 600; color: #9ca3af; text-decoration: line-through; margin: 0; }
.daily-sub  { font-size: 11px; color: #9ca3af; margin: 2px 0 0 0; }

/* ── 장비 카드 ───────────────────────────────── */
.equip-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 4px 0;
}
.equip-card {
    position: relative; display: flex; flex-direction: column; align-items: center;
    border-radius: 18px; padding: 14px 8px 10px; border: 2px solid;
    cursor: pointer; transition: transform 0.15s; text-align: center;
}
.equip-card:active { transform: scale(0.95); }
.eq-C   { border-color: #d1d5db; background: #f4f4f4; }
.eq-B   { border-color: #60a5fa; background: #eef4ff; }
.eq-A   { border-color: #a855f7; background: #f3eeff; }
.eq-S   { border-color: #f59e0b; background: #fffbf0; }
.eq-SR  { border-color: #fb923c; background: #fff7f0; }
.eq-SSR { border-color: #ef4444; background: #fff5f5; }
.eq-UR  { border-color: #8b5cf6; background: #fdf4ff; }
.equip-icon  { font-size: 30px; margin-bottom: 4px; }
.equip-label { font-size: 11px; font-weight: 700; color: #374151; }
.equip-bonus { font-size: 9px; font-weight: 600; margin-top: 2px; }
.eq-C-txt   { color: #6b7280; } .eq-B-txt   { color: #3b82f6; }
.eq-A-txt   { color: #a855f7; } .eq-S-txt   { color: #f59e0b; }
.eq-SR-txt  { color: #fb923c; } .eq-SSR-txt { color: #ef4444; }
.eq-UR-txt  { color: #8b5cf6; }
.equip-badge {
    position: absolute; top: 5px; left: 5px;
    background: #fbbf24; border-radius: 9999px;
    padding: 1px 5px; font-size: 7px; font-weight: 900; color: #1f2937;
}
.equip-pip {
    position: absolute; top: 7px; right: 7px;
    width: 7px; height: 7px; border-radius: 50%; border: 1px solid white;
}
.pip-C{background:#d1d5db} .pip-B{background:#60a5fa}
.pip-A{background:#a855f7} .pip-S{background:#f59e0b}
.pip-SR{background:#fb923c} .pip-SSR{background:#ef4444} .pip-UR{background:#8b5cf6}

/* ── 가챠 배너 ───────────────────────────────── */
.gacha-banner {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    border-radius: 16px; padding: 16px;
    position: relative; overflow: hidden; margin-bottom: 16px;
}
.gacha-dots {
    position: absolute; inset: 0; opacity: 0.1;
    background-image: radial-gradient(circle, #fff 1px, transparent 1px);
    background-size: 12px 12px; pointer-events: none;
}
.gacha-inner { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.gacha-text-sp { color: #fbbf24; font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 2px; }
.gacha-text-main { color: white; font-weight: 700; font-size: 15px; }

/* ── 흰 카드 / 섹션 헤더 ─────────────────────── */
.white-card {
    background: white; border-radius: 14px; padding: 14px;
    margin-bottom: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}
.section-hdr {
    font-size: 10px; font-weight: 700; color: #6b7280;
    text-transform: uppercase; letter-spacing: 0.1em;
    padding: 8px 2px 4px;
}

/* ── Streamlit 컴포넌트 커스터마이징 ─────────── */
/* 버튼 */
.stButton > button {
    border-radius: 12px !important;
    font-weight: 600 !important;
    font-size: 13px !important;
}
/* 텍스트에리어 */
.stTextArea textarea {
    border-radius: 12px !important;
    font-size: 13px !important;
}
/* 프로그레스 바 */
.stProgress > div > div { border-radius: 9999px !important; }
/* 익스팬더 */
.stExpander { border-radius: 12px !important; border: 1px solid #e5e7eb !important; }
/* 탭 */
.stTabs [data-baseweb="tab-list"] { gap: 4px; }
.stTabs [data-baseweb="tab"] { border-radius: 8px; font-size: 12px; font-weight: 600; }
/* 메트릭 */
[data-testid="stMetricValue"] { font-size: 20px !important; font-weight: 700 !important; }
/* 구분선 */
hr { border-color: #e5e7eb !important; margin: 8px 0 !important; }
</style>
"""

# ── HTML 컴포넌트 함수 ─────────────────────────────────────────────────────────

SLOT_ICONS = {
    "weapon":"⚔️","helmet":"🪖","armor":"🛡️","pants":"👖",
    "belt":"🥋","glove":"🧤","shoe":"👟","necklace":"📿","ring":"💍",
}

GRADE_LABELS = {
    "C":"일반","B":"고급","A":"희귀","S":"영웅","SR":"전설","SSR":"고대","UR":"신화",
}


def level_bar_html(level: int, tickets: int) -> str:
    return f"""
    <div class="level-bar">
        <div class="level-badge">Lv. {level}</div>
        <div class="currency-row">
            <div class="currency-item">🎟️ <span>{tickets}</span></div>
        </div>
    </div>"""


def char_panel_html(char: dict, exp_needed: int) -> str:
    hp    = char.get("current_hp", 0)
    mhp   = max(char.get("max_hp", 1), 1)
    mp    = char.get("current_mp", 0)
    mmp   = max(char.get("max_mp", 1), 1)
    exp   = char.get("total_exp", 0)
    hp_p  = min(hp / mhp * 100, 100)
    mp_p  = min(mp / mmp * 100, 100)
    exp_p = min(exp / max(exp_needed, 1) * 100, 100)

    return f"""
    <div class="char-panel">
      <div class="char-avatar">🧙</div>
      <div class="char-stats">
        <div class="stat-row">
          <div class="stat-lbl">
            <span>❤️</span>
            <span style="color:#e74c3c;">HP</span>
            <span class="stat-val" style="color:#e74c3c;">{hp:,} / {mhp:,}</span>
          </div>
          <div class="bar-track"><div class="bar-fill hp-fill" style="width:{hp_p:.1f}%"></div></div>
        </div>
        <div class="stat-row">
          <div class="stat-lbl">
            <span>💎</span>
            <span style="color:#3498db;">MP</span>
            <span class="stat-val" style="color:#3498db;">{mp:,} / {mmp:,}</span>
          </div>
          <div class="bar-track"><div class="bar-fill mp-fill" style="width:{mp_p:.1f}%"></div></div>
        </div>
        <div class="stat-row">
          <div class="stat-lbl">
            <span>⭐</span>
            <span style="color:#f39c12;">EXP</span>
            <span class="stat-val" style="color:#f39c12;">{exp:,} / {exp_needed:,}</span>
          </div>
          <div class="bar-track"><div class="bar-fill exp-fill" style="width:{exp_p:.1f}%"></div></div>
        </div>
      </div>
    </div>"""


_NAV_TABS = [
    ("activity",  "📅", "데일리",  "#f59e0b", "#fff7ed"),
    ("character", "⚔️", "캐릭터",  "#7c3aed", "#f5f3ff"),
    ("battle",    "💀", "전투",    "#f43f5e", "#fff1f2"),
    ("inventory", "🎒", "아이템",  "#0ea5e9", "#f0f9ff"),
    ("settings",  "⚙️", "설정",    "#22c55e", "#f0fdf4"),
]


def bottom_nav_html(active_tab: str) -> str:
    items = []
    for tab_id, icon, label, color, bg in _NAV_TABS:
        active = active_tab == tab_id
        bg_style  = f"background:{bg};" if active else ""
        txt_color = color if active else "#9ca3af"
        dot = f'<div class="nav-dot" style="background:{color};"></div>' if active else ""
        items.append(f"""
        <a href="?tab={tab_id}" class="nav-btn" style="{bg_style}text-decoration:none;">
          <div class="nav-icon" style="color:{txt_color};">{icon}</div>
          <div class="nav-label" style="color:{txt_color};">{label}</div>
          {dot}
        </a>""")
    return f'<div class="bottom-nav">{"".join(items)}</div>'


def equip_grid_html(equipped_items: list[dict]) -> str:
    import json as _json
    slot_map = {item["slot"]: item for item in equipped_items}
    all_slots = ["weapon","helmet","armor","pants","belt","glove","shoe","necklace","ring"]
    slot_labels = {
        "weapon":"무기","helmet":"투구","armor":"갑옷","pants":"바지",
        "belt":"벨트","glove":"장갑","shoe":"신발","necklace":"목걸이","ring":"반지",
    }
    cards = []
    for slot in all_slots:
        item = slot_map.get(slot)
        icon = SLOT_ICONS.get(slot, "❓")
        if item:
            g = item["grade"]
            glabel = GRADE_LABELS.get(g, g)
            opts = _json.loads(item.get("options","{}"))
            # 첫 번째 옵션 표시
            first_opt = next(iter(opts.values()), None)
            bonus_str = ""
            if first_opt and isinstance(first_opt, dict):
                bonus_str = f"+{first_opt['value']}{first_opt.get('unit','')}"
            cards.append(f"""
            <div class="equip-card eq-{g}">
              <div class="equip-badge">ON</div>
              <div class="equip-pip pip-{g}"></div>
              <div class="equip-icon">{icon}</div>
              <div class="equip-label">{slot_labels.get(slot, slot)}</div>
              <div class="equip-bonus eq-{g}-txt">{glabel} {bonus_str}</div>
            </div>""")
        else:
            cards.append(f"""
            <div class="equip-card eq-C" style="opacity:0.4;">
              <div class="equip-pip pip-C"></div>
              <div class="equip-icon" style="filter:grayscale(1);">{icon}</div>
              <div class="equip-label">{slot_labels.get(slot, slot)}</div>
              <div class="equip-bonus eq-C-txt">미장착</div>
            </div>""")
    return f'<div class="equip-grid">{"".join(cards)}</div>'
