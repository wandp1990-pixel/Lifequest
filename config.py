"""
DB의 game_config를 읽어 앱 전체에 공급. 5분 캐싱.
수치가 필요한 곳에서 cfg = load_config() 호출 후 cfg["base_exp"] 식으로 사용.
"""
import streamlit as st
from database.db import get_connection, get_game_config, get_battle_config


@st.cache_data(ttl=300)
def load_config() -> dict:
    conn = get_connection()
    return get_game_config(conn)


@st.cache_data(ttl=300)
def load_battle_config() -> dict:
    conn = get_connection()
    return get_battle_config(conn)


def cfg_float(cfg: dict, key: str, default: float = 0.0) -> float:
    return float(cfg.get(key, default))


def cfg_int(cfg: dict, key: str, default: int = 0) -> int:
    return int(float(cfg.get(key, default)))
