from app.database import get_db_connection
from app.mqtt_utils import publish_barcode_response
import threading

db_lock = threading.Lock()

def handle_barcode_message(payload: dict) -> str:
    if "code" not in payload or "action" not in payload:
        return "invalid"

    code = payload["code"]
    action = payload["action"]
    if action not in {"add", "remove"}:
        return "unknown_action"

    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT count, name FROM products WHERE barcode = ?", (code,))
        row = cursor.fetchone()

        if row:
            current = row["count"]
            name = row["name"]
            if action == "add":
                new_count = current + 1
            elif action == "remove":
                new_count = max(current - 1, 0)
            cursor.execute("UPDATE products SET count = ? WHERE barcode = ?", (new_count, code))
        else:
            name = None
            count = 1 if action == "add" else 0
            cursor.execute("INSERT INTO products (barcode, count) VALUES (?, ?)", (code, count))

        conn.commit()
        conn.close()

    response_message = name if name else code
    publish_barcode_response(response_message)
    print(f"[HANDLER] Published: {response_message}")

    return "ok"

def handle_sensor_message(payload: dict) -> str:
    print("Received sensor payload:", payload)
    if "temp" not in payload or "humidity" not in payload or "open" not in payload:
        return "invalid"

    temp = payload["temp"]
    humidity = payload["humidity"]
    door_status = "open" if payload["open"] == 1 else "closed"

    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO sensor_logs (temp, humidity, door_status) VALUES (?, ?, ?)", (temp, humidity, door_status))
        conn.commit()
        conn.close()

    return "ok"
