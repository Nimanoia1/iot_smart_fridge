import json
import paho.mqtt.publish as publish


print(f"[MQTT PUBLISH] Send message to Topic barcode_response: test")
publish.single(
    topic="test/topic",
    payload=json.dumps({"message": "test"}),
    hostname="localhost",
    port=1883
)