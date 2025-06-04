import os
import sqlite3
from app.handlers import handle_barcode_message, handle_sensor_message
from app.database import DB_FILE, init_db

def setup_module(module):
    if os.path.exists(DB_FILE):
        os.remove(DB_FILE)
    init_db()

def test_barcode_add_and_remove():
    assert handle_barcode_message({"code": "abc123", "action": "add"}) == "ok"
    assert handle_barcode_message({"code": "abc123", "action": "add"}) == "ok"
    assert handle_barcode_message({"code": "abc123", "action": "remove"}) == "ok"

    conn = sqlite3.connect(DB_FILE)
    row = conn.execute("SELECT count FROM products WHERE barcode = ?", ("abc123",)).fetchone()
    assert row[0] == 1

def test_sensor_logging():
    assert handle_sensor_message({"temp": 3.2, "humidity": 65}) == "ok"

    conn = sqlite3.connect(DB_FILE)
    row = conn.execute("SELECT temp, humidity FROM sensor_logs ORDER BY id DESC LIMIT 1").fetchone()
    print("Sensor log result:", row) 
    
    assert row[0] == 3.2
    assert row[1] == 65
