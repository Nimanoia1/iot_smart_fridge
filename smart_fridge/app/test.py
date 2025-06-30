import paho.mqtt.client as mqtt

# Define your MQTT server details
MQTT_BROKER = "192.168.1.4"  # You can replace this with your server address
MQTT_PORT = 1883  # Default port for non-TLS connections
MQTT_KEEPALIVE = 60
MQTT_TOPIC = "iot/smart_fridge/barcode"

# Callback when the client connects successfully to the broker
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("Connected successfully!")
        client.subscribe(MQTT_TOPIC)
    else:
        print(f"Connection failed with code {rc}")

# Callback when a message is received from the server
def on_message(client, userdata, msg):
    print(f"Received message: '{msg.payload.decode()}' on topic '{msg.topic}'")

# Callback when the client cannot connect
def on_disconnect(client, userdata, rc):
    print(f"Disconnected with return code {rc}")

# Create MQTT client instance
client = mqtt.Client()

# Assign callbacks
client.on_connect = on_connect
client.on_message = on_message
client.on_disconnect = on_disconnect

try:
    print(f"Connecting to {MQTT_BROKER}:{MQTT_PORT}...")
    client.connect(MQTT_BROKER, MQTT_PORT, MQTT_KEEPALIVE)

    # Blocking call that processes network traffic, dispatches callbacks and handles reconnecting
    client.loop_forever()

except Exception as e:
    print(f"An error occurred: {e}")
