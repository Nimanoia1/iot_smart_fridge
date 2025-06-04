from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.api import router
from app.mqtt_client import start_mqtt
from app.database import init_db

app = FastAPI(title="Smart Refrigerator API")

# تنظیم مسیر برای فایل‌های استاتیک
app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(router)

init_db()
start_mqtt()
