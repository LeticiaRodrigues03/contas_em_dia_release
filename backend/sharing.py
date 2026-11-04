"""Helpers shared by bills, categories and family: who can see whose data."""
import re
import secrets
import uuid
from typing import List, Optional

from db import db
from models.bill import CATEGORIES

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I


async def family_of(user_id: str) -> Optional[dict]:
    return await db.families.find_one({"member_ids": user_id}, {"_id": 0})


async def scope_ids(user_id: str) -> List[str]:
    """User ids whose bills/categories are visible to `user_id` (self + family members)."""
    fam = await family_of(user_id)
    return fam["member_ids"] if fam else [user_id]


async def new_family_code() -> str:
    while True:
        code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(6))
        if not await db.families.find_one({"code": code}):
            return code


def normalize_category_name(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


async def custom_category_names(ids: List[str]) -> List[str]:
    docs = await db.categories.find({"user_id": {"$in": ids}}, {"_id": 0, "name": 1}).sort("name", 1).to_list(500)
    return [d["name"] for d in docs]


async def resolve_category(value: str, ids: List[str]) -> str:
    """Keep default or existing custom categories; anything unknown becomes 'Outros'."""
    name = normalize_category_name(value or "")
    if name in CATEGORIES:
        return name
    custom = await custom_category_names(ids)
    for c in custom:
        if c.casefold() == name.casefold():
            return c
    return "Outros"


async def detach_user(user_id: str) -> None:
    """Remove user from their family (ownership transfer / dissolve) and hand over custom categories."""
    fam = await family_of(user_id)
    if not fam:
        return
    remaining = [m for m in fam["member_ids"] if m != user_id]
    if not remaining:
        await db.families.delete_one({"id": fam["id"]})
        return
    update = {"$set": {"member_ids": remaining}}
    if fam["owner_id"] == user_id:
        update["$set"]["owner_id"] = remaining[0]
    await db.families.update_one({"id": fam["id"]}, update)
    # The leaving member keeps their own custom categories. The group keeps a copy of the
    # ones still used by remaining members' bills, so nothing silently turns into "Outros".
    used = set(await db.bills.distinct("category", {"user_id": {"$in": remaining}}))
    group_names = set(await custom_category_names(remaining))
    for cat in await db.categories.find({"user_id": user_id}, {"_id": 0}).to_list(500):
        if cat["name"] in used and cat["name"] not in group_names:
            await db.categories.insert_one({**cat, "id": str(uuid.uuid4()), "user_id": remaining[0]})
