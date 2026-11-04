from typing import List

from fastapi import APIRouter, Depends, HTTPException

from auth_utils import current_user
from db import db
from models.bill import CATEGORIES, now_utc
from models.category import CategoryIn, CategoryListOut, CustomCategory
from sharing import custom_category_names, normalize_category_name, scope_ids

router = APIRouter(prefix="/categories", tags=["categories"])


async def _validate_name(raw: str, ids: List[str], exclude_id: str | None = None) -> str:
    name = normalize_category_name(raw)
    if len(name) < 2:
        raise HTTPException(status_code=422, detail="O nome da categoria deve ter pelo menos 2 letras")
    if any(name.casefold() == c.casefold() for c in CATEGORIES):
        raise HTTPException(status_code=409, detail="Essa categoria já existe como padrão")
    query = {"user_id": {"$in": ids}}
    if exclude_id:
        query["id"] = {"$ne": exclude_id}
    for doc in await db.categories.find(query, {"_id": 0, "name": 1}).to_list(500):
        if doc["name"].casefold() == name.casefold():
            raise HTTPException(status_code=409, detail="Já existe uma categoria com esse nome")
    return name


async def _owned(cat_id: str, ids: List[str]) -> dict:
    doc = await db.categories.find_one({"id": cat_id, "user_id": {"$in": ids}}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return doc


@router.get("", response_model=List[str])
async def list_categories(user: dict = Depends(current_user)):
    """Default categories first, then the user's (and family's) custom ones."""
    return CATEGORIES + await custom_category_names(await scope_ids(user["id"]))


@router.get("/custom", response_model=CategoryListOut)
async def list_custom(user: dict = Depends(current_user)):
    ids = await scope_ids(user["id"])
    docs = await db.categories.find({"user_id": {"$in": ids}}, {"_id": 0}).sort("name", 1).to_list(500)
    return CategoryListOut(defaults=CATEGORIES, custom=[CustomCategory(**d) for d in docs])


@router.post("/custom", response_model=CustomCategory, status_code=201)
async def create_custom(data: CategoryIn, user: dict = Depends(current_user)):
    ids = await scope_ids(user["id"])
    cat = CustomCategory(user_id=user["id"], name=await _validate_name(data.name, ids))
    await db.categories.insert_one(cat.model_dump())
    return cat


@router.put("/custom/{cat_id}", response_model=CustomCategory)
async def rename_custom(cat_id: str, data: CategoryIn, user: dict = Depends(current_user)):
    ids = await scope_ids(user["id"])
    doc = await _owned(cat_id, ids)
    name = await _validate_name(data.name, ids, exclude_id=cat_id)
    await db.categories.update_one({"id": cat_id}, {"$set": {"name": name}})
    await db.bills.update_many(
        {"user_id": {"$in": ids}, "category": doc["name"]},
        {"$set": {"category": name, "updated_at": now_utc()}},
    )
    return CustomCategory(**{**doc, "name": name})


@router.delete("/custom/{cat_id}", status_code=204)
async def delete_custom(cat_id: str, user: dict = Depends(current_user)):
    ids = await scope_ids(user["id"])
    doc = await _owned(cat_id, ids)
    await db.categories.delete_one({"id": cat_id})
    # Bills keep all their data; only the label falls back to the default bucket
    await db.bills.update_many(
        {"user_id": {"$in": ids}, "category": doc["name"]},
        {"$set": {"category": "Outros", "updated_at": now_utc()}},
    )
