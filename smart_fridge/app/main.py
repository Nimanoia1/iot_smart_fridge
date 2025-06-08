from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.api import router
from app.mqtt_client import start_mqtt
from app.database import init_db
from app.websocket import setup_websocket_env, setup_websocket_inventory, setup_test_websocket
import asyncio

loop = asyncio.get_event_loop()
app = FastAPI(title="Smart Refrigerator API")

# Static and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("ref.html", {"request": request})

app.include_router(router)

init_db()
start_mqtt(loop)
setup_websocket_inventory(app)
setup_websocket_env(app)
setup_test_websocket(app)