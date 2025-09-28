import databutton as db
import asyncpg
from app.env import mode, Mode
import json
from typing import List, Dict, Any

async def get_db_connection():
    if mode == Mode.PROD:
        db_url = db.secrets.get("DATABASE_URL_ADMIN_PROD")
    else:
        db_url = db.secrets.get("DATABASE_URL_ADMIN_DEV")
    
    conn = await asyncpg.connect(db_url)
    return conn

async def insert_analysis_history(user_id: str, concerns_data: List[Dict[str, Any]], main_concern: str, main_severity: float):
    """Inserts a new analysis record into the database."""
    conn = await get_db_connection()
    try:
        await conn.execute(
            """
            INSERT INTO analysis_history (user_id, concerns_data, main_concern_name, main_concern_severity)
            VALUES ($1, $2, $3, $4)
            """,
            user_id,
            json.dumps(concerns_data),
            main_concern,
            main_severity
        )
    finally:
        await conn.close()

async def fetch_analysis_history(user_id: str) -> List[Dict[str, Any]]:
    """Fetches all analysis history for a given user, ordered by date."""
    conn = await get_db_connection()
    try:
        records = await conn.fetch(
            """
            SELECT id, analysis_date, concerns_data, main_concern_name, main_concern_severity
            FROM analysis_history
            WHERE user_id = $1
            ORDER BY analysis_date DESC
            """,
            user_id
        )
        return [dict(record) for record in records]
    finally:
        await conn.close()
