from fastapi import WebSocket, WebSocketDisconnect
import asyncio
from app.database import get_db_connection

connected_websockets = []

def get_latest_sensor_data():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT temp, humidity, door_status FROM sensor_logs ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()

    if row:
        return {
            "temperature": row["temp"],
            "humidity": row["humidity"],
            "door_status": row["door_status"]
        }
    return {
        "temperature": "No data",
        "humidity": "No data",
        "door_status": "No data"
    }
    
def get_latest_inventory():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name, count, barcode FROM products")
    rows = cursor.fetchall()
    conn.close()
    return {
        "type": "inventory_update",
        "items": [
            {"name": row["name"], "quantity": row["count"], "barcode": row["barcode"]}
            for row in rows
        ]
}

async def websocket_handler(websocket: WebSocket):
    await websocket.accept()
    connected_websockets.append(websocket)
    try:
        while True:          
            data = get_latest_sensor_data()
            await websocket.send_json(data)
            await asyncio.sleep(5)  
    except WebSocketDisconnect:
        connected_websockets.remove(websocket)

async def broadcast_inventory():
    data = get_latest_inventory()
    for ws in connected_websockets:
        try:
            await ws.send_json(data)
        except Exception as e:
            print(f"[WS] Error sending inventory update: {e}")


def setup_websocket_routes(app):
    print("[WS] Setting up WebSocket route")

    @app.websocket("/ws/env")
    async def env_websocket(websocket: WebSocket):
        print("[WS] /ws/env endpoint hit")
        await websocket_handler(websocket)
