import json
import threading
import paho.mqtt.client as mqtt
import asyncio
from app.config import MQTT_BROKER_URL, MQTT_PORT
from app.handlers import handle_barcode_message, handle_sensor_message

global_loop = None

def on_connect(client, userdata, flags, rc):
    print("[MQTT] Connected with result code", rc)
    client.subscribe("iot/smart_fridge/barcode")
    client.subscribe("iot/smart_fridge/sensors")

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        topic = msg.topic

        if topic == "iot/smart_fridge/barcode":
            handle_barcode_message(payload)
        elif topic == "iot/smart_fridge/sensors":
            handle_sensor_message(payload)

    except json.JSONDecodeError:
        print(f"[MQTT] Invalid JSON on {msg.topic}")

def start_mqtt(loop):
    global global_loop
    global_loop = loop
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(MQTT_BROKER_URL, MQTT_PORT, 60)

    thread = threading.Thread(target=client.loop_forever)
    thread.daemon = True
    thread.start()
