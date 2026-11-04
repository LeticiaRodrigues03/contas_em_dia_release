from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from auth_utils import current_user
from db import db
from models.family import MAX_MEMBERS, Family, FamilyCreate, FamilyJoin, FamilyOut, Member
from sharing import detach_user, family_of, new_family_code

router = APIRouter(prefix="/family", tags=["family"])


async def _to_out(fam: dict) -> FamilyOut:
    users = await db.users.find({"id": {"$in": fam["member_ids"]}}, {"_id": 0, "id": 1, "name": 1, "email": 1}).to_list(MAX_MEMBERS)
    by_id = {u["id"]: u for u in users}
    members = [
        Member(**by_id[m], is_owner=(m == fam["owner_id"]))
        for m in fam["member_ids"] if m in by_id
    ]
    return FamilyOut(id=fam["id"], name=fam["name"], code=fam["code"], owner_id=fam["owner_id"], members=members, created_at=fam["created_at"])


@router.get("", response_model=Optional[FamilyOut])
async def my_family(user: dict = Depends(current_user)):
    fam = await family_of(user["id"])
    return await _to_out(fam) if fam else None


@router.post("", response_model=FamilyOut, status_code=201)
async def create_family(data: FamilyCreate, user: dict = Depends(current_user)):
    if await family_of(user["id"]):
        raise HTTPException(status_code=409, detail="Você já faz parte de um grupo familiar")
    fam = Family(name=data.name.strip(), code=await new_family_code(), owner_id=user["id"], member_ids=[user["id"]])
    await db.families.insert_one(fam.model_dump())
    return await _to_out(fam.model_dump())


@router.post("/join", response_model=FamilyOut)
async def join_family(data: FamilyJoin, user: dict = Depends(current_user)):
    if await family_of(user["id"]):
        raise HTTPException(status_code=409, detail="Você já faz parte de um grupo familiar. Saia dele antes de entrar em outro.")
    fam = await db.families.find_one({"code": data.code.strip().upper()}, {"_id": 0})
    if not fam:
        raise HTTPException(status_code=404, detail="Código inválido. Confira com quem criou o grupo.")
    if len(fam["member_ids"]) >= MAX_MEMBERS:
        raise HTTPException(status_code=409, detail="Este grupo já atingiu o limite de pessoas")
    # Atomic: only succeeds while the group still has a free seat
    res = await db.families.update_one(
        {"id": fam["id"], f"member_ids.{MAX_MEMBERS - 1}": {"$exists": False}},
        {"$addToSet": {"member_ids": user["id"]}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=409, detail="Este grupo já atingiu o limite de pessoas")
    fam["member_ids"].append(user["id"])
    return await _to_out(fam)


@router.post("/leave", status_code=204)
async def leave_family(user: dict = Depends(current_user)):
    if not await family_of(user["id"]):
        raise HTTPException(status_code=404, detail="Você não está em um grupo familiar")
    await detach_user(user["id"])


@router.delete("/members/{member_id}", response_model=FamilyOut)
async def remove_member(member_id: str, user: dict = Depends(current_user)):
    fam = await family_of(user["id"])
    if not fam or fam["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Apenas quem criou o grupo pode remover pessoas")
    if member_id == user["id"] or member_id not in fam["member_ids"]:
        raise HTTPException(status_code=400, detail="Pessoa não encontrada no grupo")
    await detach_user(member_id)
    return await _to_out(await family_of(user["id"]))


@router.post("/code", response_model=FamilyOut)
async def regenerate_code(user: dict = Depends(current_user)):
    fam = await family_of(user["id"])
    if not fam or fam["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Apenas quem criou o grupo pode gerar um novo código")
    code = await new_family_code()
    await db.families.update_one({"id": fam["id"]}, {"$set": {"code": code}})
    fam["code"] = code
    return await _to_out(fam)
