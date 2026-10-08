import logging
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from starlette.middleware.cors import CORSMiddleware

from db import client, db
from routers import auth, bills, legal

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")


@asynccontextmanager
async def lifespan(_: FastAPI):
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.bills.create_index([("user_id", 1), ("due_date", 1)])
    await db.bills.create_index("id", unique=True)
    yield
    client.close()


app = FastAPI(title="Contas em Dia API", lifespan=lifespan)
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "Contas em Dia API"}


api_router.include_router(auth.router)
api_router.include_router(bills.router)
api_router.include_router(legal.router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
