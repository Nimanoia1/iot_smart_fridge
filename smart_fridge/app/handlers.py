from app.database import get_db_connection
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
        # Insert product if not exist
        cursor.execute("SELECT count FROM products WHERE barcode = ?", (code,))
        row = cursor.fetchone()

        if row:#if barcode exist

            current = row["count"]
            if action == "add":
                new_count = current + 1
            elif action == "remove":
                new_count = max(current - 1, 0)  # تعداد نباید کمتر از 0 بشه
            cursor.execute("UPDATE products SET count = ? WHERE barcode = ?", (new_count, code))
        else:  # اگر بارکد وجود نداشته باشد، رکورد جدید اضافه می‌کنیم
            count = 1 if action == "add" else 0
            cursor.execute("INSERT INTO products (barcode, count) VALUES (?, ?)", (code, count))

        conn.commit()
        conn.close()

    return "ok"

def handle_sensor_message(payload: dict) -> str:
    print("Received sensor payload:", payload)  # برای بررسی داده‌های ورودی
    if "temp" not in payload or "humidity" not in payload:
        return "invalid"

    temp = payload["temp"]
    humidity = payload["humidity"]

    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO sensor_logs (temp, humidity) VALUES (?, ?)", (temp, humidity))
        conn.commit()
        conn.close()

    return "ok"
