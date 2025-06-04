from app.database import get_db_connection

def remove_item(payload: dict):
    if "barcode" not in payload or "action" not in payload:
        return {"status": "invalid"}

    code = payload["barcode"]
    action = payload["action"]

    if action != "remove":
        return {"status": "unknown_action"}

    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT count FROM products WHERE barcode = ?", (code,))
        row = cursor.fetchone()

        if row:
            if row["count"] > 1:
                cursor.execute("UPDATE products SET count = count - 1 WHERE barcode = ?", (code,))
            else:
                cursor.execute("DELETE FROM products WHERE barcode = ?", (code,))
            conn.commit()
            conn.close()
            return {"status": "ok", "message": "product removed successfully!"}
        else:
            conn.close()
            return {"status": "not_found", "message": "not found!"}

print(remove_item({"barcode":"123","action":"remove"}))