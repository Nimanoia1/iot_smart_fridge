import sqlite3
from pathlib import Path

DB_FILE = Path(__file__).parent / "fridge.db"

def get_db_connection():
    conn = sqlite3.connect(DB_FILE, timeout=10, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db_connection() as conn:
        cursor = conn.cursor()
    
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS products (
                barcode TEXT PRIMARY KEY,
                name TEXT,
                count INTEGER DEFAULT 0
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sensor_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                temp REAL,
                humidity REAL,
                door_status TEXT 
            )
        ''')
        try:
            cursor.execute("ALTER TABLE products ADD COLUMN min_limit INTEGER DEFAULT 0")
        except sqlite3.OperationalError:    
         # ستون قبلاً وجود داشته
             pass
            
            
        conn.commit()
    conn.close()
