"""
Google Gemini API 호출. 활동 텍스트 → EXP + 코멘트 판정.
"""
import json
import re
import time
import streamlit as st
import google.generativeai as genai
from database import db


def _get_model():
    api_key = st.secrets.get("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError("GEMINI_API_KEY가 secrets.toml에 없습니다.")
    genai.configure(api_key=api_key)
    return genai.GenerativeModel("gemini-1.5-flash")


def judge_activity(conn, activity_text: str) -> dict:
    """
    활동 텍스트를 Gemini로 판정.
    반환: {"exp": int, "comment": str, "error": str|None}
    """
    prompt = db.get_active_prompt(conn, "general")
    if not prompt:
        return {"exp": 50, "comment": "활동 완료!", "error": None}

    full_prompt = f"{prompt}\n\n유저 활동: {activity_text}"

    for attempt in range(3):
        try:
            model = _get_model()
            response = model.generate_content(full_prompt)
            text = response.text.strip()

            # JSON 파싱 (마크다운 코드블록 포함 대응)
            json_match = re.search(r'\{.*?\}', text, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                return {
                    "exp": max(0, min(200, int(data.get("exp", 50)))),
                    "comment": str(data.get("comment", "활동 완료!"))[:50],
                    "error": None,
                }
            return {"exp": 50, "comment": "활동 완료!", "error": "응답 파싱 실패"}

        except Exception as e:
            err = str(e)
            if "429" in err or "quota" in err.lower():
                if attempt < 2:
                    time.sleep(5)
                    continue
                return {"exp": 0, "comment": "", "error": "rate_limit"}
            return {"exp": 0, "comment": "", "error": err}

    return {"exp": 0, "comment": "", "error": "재시도 초과"}
