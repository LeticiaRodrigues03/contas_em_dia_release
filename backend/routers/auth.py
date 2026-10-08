import uuid

from fastapi import APIRouter, Depends, HTTPException
from pymongo.errors import DuplicateKeyError

from auth_utils import create_token, current_user, password_hash
from db import db
from models.bill import now_utc
from models.user import AuthOut, LoginIn, RegisterIn, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthOut, status_code=201)
async def register(data: RegisterIn):
    email = str(data.email).strip().lower()
    user = {"id": str(uuid.uuid4()), "name": data.name.strip(), "email": email}
    doc = {**user, "password_hash": password_hash.hash(data.password), "created_at": now_utc()}
    try:
        await db.users.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="E-mail já cadastrado")
    return AuthOut(access_token=create_token(user["id"]), user=UserOut(**user))


@router.post("/login", response_model=AuthOut)
async def login(data: LoginIn):
    email = str(data.email).strip().lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not password_hash.verify(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
    return AuthOut(access_token=create_token(user["id"]), user=UserOut(**user))


@router.get("/me", response_model=UserOut)
async def me(user: dict = Depends(current_user)):
    return UserOut(**user)


@router.delete("/me", status_code=204)
async def delete_account(user: dict = Depends(current_user)):
    await db.bills.delete_many({"user_id": user["id"]})
    await db.users.delete_one({"id": user["id"]})
