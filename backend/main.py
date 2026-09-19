#added httpeexception for possible eror messages.
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from sqlmodel import Session, select
from backend.database import create_db_and_tables, get_session
from backend.models import Student

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(lifespan=lifespan)

#The simplest possible backend. From: https://fastapi.tiangolo.com/tutorial/first-steps/
@app.get("/")
async def root():
    return {"message": "Hello World"}

#Simple put request.
@app.put("/test-put")
async def test_put(message: str):
    return{
        "status": "success",
        "yourmessage": message
    }