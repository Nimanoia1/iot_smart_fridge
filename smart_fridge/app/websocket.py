from fastapi import WebSocket, WebSocketDisconnect
import asyncio
from app.database import get_db_connection

env_sockets = []
inventory_sockets = []

# Sensor data fetching
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

# Inventory data fetching
def get_latest_inventory():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name, count, barcode, min_limit FROM products")
    rows = cursor.fetchall()
    conn.close()
    return {
        "type": "inventory_update",
        "items": [
            {"name": row["name"], "quantity": row["count"], "barcode": row["barcode"], "limit": row["min_limit"]} for row in rows
        ]
    }

# Periodically push env data
async def env_socket_handler(websocket: WebSocket):
    await websocket.accept()
    env_sockets.append(websocket)
    try:
        while True:
            data = get_latest_sensor_data()
            await websocket.send_json(data)
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        env_sockets.remove(websocket)

async def inventory_socket_handler(websocket: WebSocket):
    await websocket.accept()
    inventory_sockets.append(websocket)
    try:
        while True:
            await websocket.receive_text()  
    except WebSocketDisconnect:
        inventory_sockets.remove(websocket)


async def broadcast_inventory():
    data = get_latest_inventory()
    for ws in inventory_sockets.copy():
        try:
            await ws.send_json(data)
        except Exception as e:
            print(f"[WS] Error sending inventory update: {e}")
            inventory_sockets.remove(ws)


# Setup routes
def setup_websocket_env(app):
    @app.websocket("/ws/env")
    async def env_websocket(websocket: WebSocket):
        print("[WS] /ws/env connected")
        await env_socket_handler(websocket)

def setup_websocket_inventory(app):
    @app.websocket("/ws/inventory")
    async def inventory_websocket(websocket: WebSocket):
        print("[WS] /ws/inventory connected")
        await inventory_socket_handler(websocket)

