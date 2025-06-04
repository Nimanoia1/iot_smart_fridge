from fastapi import APIRouter
from app.database import get_db_connection
from app.handlers import db_lock

router = APIRouter()

@router.get("/")
async def root():
    return {"message": "Smart Fridge API running."}

# @router.get("/health")
# async def health():
#     return {"status": "ok"}
# Endpoint برای گرفتن دمای یخچال از دیتابیس
@router.get("/temperature")
async def get_temperature():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT temp, humidity FROM sensor_logs ORDER BY timestamp DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()

    if row:
        return {"temperature": row["temp"], "humidity": row["humidity"]}
    else:
        return {"temperature": "No data", "humidity": "No data"}
 

# Endpoint برای دریافت موجودی کالاها
@router.get("/inventory")
async def get_inventory():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name, count, barcode FROM products")
    rows = cursor.fetchall()
    conn.close()

    inventory = [{"name": row["name"], "quantity": row["count"], "barcode": row["barcode"]} for row in rows]
    return {"items": inventory}

@router.post("/removeItem")
async def remove_item(payload: dict):
    print("Received remove request payload:", payload)

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
            count = row["count"]
            print(f"Current count: {count}")

            if count is None or count <= 0:
                conn.close()
                return {"status": "not_allowed", "message": "item count is already zero!"}

            if count > 1:
                cursor.execute("UPDATE products SET count = count - 1 WHERE barcode = ?", (code,))
            else:
                cursor.execute("DELETE FROM products WHERE barcode = ?", (code,))

            conn.commit()
            conn.close()
            return {"status": "ok", "message": "product removed successfully!"}
        else:
            conn.close()
            return {"status": "not_found", "message": "not found!"}

 
 
@router.post("/updateProductName")
async def update_product_name(payload: dict):
    if "barcode" not in payload or "name" not in payload:
        return {"status": "invalid", "message": "بارکد یا نام محصول ارسال نشده است."}

    barcode = payload["barcode"]
    new_name = payload["name"].strip()

    if not new_name:
        return {"status": "invalid", "message": "نام محصول نمی‌تواند خالی باشد."}

    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT name FROM products WHERE barcode = ?", (barcode,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return {"status": "not_found", "message": "product not found."}

        old_name = row["name"]

        cursor.execute("UPDATE products SET name = ? WHERE barcode = ?", (new_name, barcode))
        conn.commit() #ذخیره‌سازی تغییرات در فایل دیتابیس
        print(f"Updated {barcode} to new name: {new_name}")
        conn.close()

    return {"status": "ok", "message": "نام محصول به‌روزرسانی شد.", "oldName": old_name}
