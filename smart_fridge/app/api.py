from fastapi import APIRouter, Request
from app.mqtt_utils import publish_wifi_config
from app.database import get_db_connection
from app.handlers import db_lock
from app.websocket import broadcast_inventory
from app.mqtt_utils import publish_barcode_response, publish_door_state, publish_wifi_config

router = APIRouter()

@router.get("/")
async def root():
    return {"message": "Smart Fridge API running."}

# @router.get("/health")
# async def health():
#     return {"status": "ok"}

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

             # فقط مقدار count رو صفر کن، حذف نکن
            if count > 1:
                cursor.execute("UPDATE products SET count = count - 1 WHERE barcode = ?", (code,))
            else:
                cursor.execute("UPDATE products SET count = 0 WHERE barcode = ?", (code,))

            conn.commit()

            # بررسی هشدار بعد از commit
            cursor.execute("SELECT name, count, min_limit FROM products WHERE barcode = ?", (code,))
            row = cursor.fetchone()
            alert_flag = False
            if row and row["count"] <= row["min_limit"]:
                alert_flag = True
                print(f"⚠️ هشدار: موجودی محصول '{row['name']}' به حداقل رسیده است.")

            conn.close()
            return {
                "status": "ok",
                "message": "product removed successfully!",
                "alert": alert_flag
            }
        else:
            conn.close()
            return {"status": "not_found", "message": "not found!"}

    await broadcast_inventory() 
    return {"status": "ok", "message": "inventory updated."}

 
 
@router.post("/updateProductName")
async def update_product_name(payload: dict):
    barcode = payload.get("barcode")
    new_name = payload.get("name", "").strip()
    min_limit = payload.get("min_limit")

    if not barcode or not new_name:
        return {"status": "invalid", "message": "بارکد یا نام محصول ارسال نشده است."}

    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT name FROM products WHERE barcode = ?", (barcode,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return {"status": "not_found", "message": "product not found."}

        old_name = row["name"]
        #############################
        cursor.execute("UPDATE products SET name = ?, min_limit = ? WHERE barcode = ?", (new_name, min_limit, barcode))
        conn.commit()
        conn.close()

    await broadcast_inventory()
    return {
    "status": "ok",
    "message": "updated name",
    "oldName": old_name,
    "newLimit": min_limit ###############
}

#################
@router.get("/door_status") 
async def get_door_status():
    # فرض: وضعیت در رو از یه متغیر، پایگاه داده یا سخت‌افزار بگیری
    # اینجا تستی:
    return {"open": False}  # یا True

@router.post("/door")
async def change_door(payload: dict):
    state = payload.get("open")
    if state is None:
        return {"status": "invalid"}
    
    from app.mqtt_utils import publish_door_state
    publish_door_state({"open": state})
    return {"status": "ok"}


@router.post("/wifi")
async def update_wifi(payload: dict):
    ssid = payload.get("ssid")
    password = payload.get("password")

    if not ssid or not password:
        return {"status": "invalid"}

    print(f"[API] New Wi-Fi recieved : SSID={ssid}, PASS={password}")
    publish_wifi_config({"ssid": ssid, "password": password})
    return {"status": "ok"}
