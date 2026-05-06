import os

DATABASE_URL = os.getenv("DATABASE_URL")

def app():
    return {"ok": True}
