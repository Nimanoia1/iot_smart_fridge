import json
import paho.mqtt.publish as publish
from app.config import MQTT_BROKER_URL, MQTT_PORT

def publish_barcode_response(message_str):
    print(f"[MQTT PUBLISH] Send message to Topic barcode_response: {message_str}")
    publish.single(
        topic="iot/smart_fridge/barcode_response",
        payload=json.dumps({"message": str(message_str)}),
        hostname=MQTT_BROKER_URL,
        port=MQTT_PORT
    )
