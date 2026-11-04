import calendar
from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from auth_utils import current_user
from db import db
from models.bill import (
    BackupOut, Bill, BillCreate, BillUpdate, ImportIn, ImportOut,
    PaidIn, PaidOut, now_utc,
)
from sharing import resolve_category, scope_ids

router = APIRouter(tags=["bills"])


def _to_doc(bill: Bill) -> dict:
    d = bill.model_dump()
    d["due_date"] = bill.due_date.isoformat()
    return d


def _from_doc(doc: dict) -> Bill:
    return Bill(**doc)


def next_recurring_date(current: date) -> date:
    """Same rule as the original app: next month, same day, clamped to month end."""
    year, month = (current.year + 1, 1) if current.month == 12 else (current.year, current.month + 1)
    last = calendar.monthrange(year, month)[1]
    return date(year, month, min(current.day, last))


async def _get_visible(bill_id: str, ids: List[str]) -> Bill:
    """A bill is visible (and editable) by its owner and by everyone in the owner's family."""
    doc = await db.bills.find_one({"id": bill_id, "user_id": {"$in": ids}}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    return _from_doc(doc)


@router.get("/bills", response_model=List[Bill])
async def list_bills(user: dict = Depends(current_user)):
    ids = await scope_ids(user["id"])
    docs = await db.bills.find({"user_id": {"$in": ids}}, {"_id": 0}).sort("due_date", 1).to_list(5000)
    return [_from_doc(d) for d in docs]


@router.post("/bills", response_model=Bill, status_code=201)
async def create_bill(data: BillCreate, user: dict = Depends(current_user)):
    bill = Bill(**data.model_dump(), user_id=user["id"])
    bill.name = bill.name.strip()
    bill.category = await resolve_category(bill.category, await scope_ids(user["id"]))
    if bill.paid:
        bill.paid_at = now_utc()
    await db.bills.insert_one(_to_doc(bill))
    return bill


@router.get("/bills/{bill_id}", response_model=Bill)
async def get_bill(bill_id: str, user: dict = Depends(current_user)):
    return await _get_visible(bill_id, await scope_ids(user["id"]))


@router.put("/bills/{bill_id}", response_model=Bill)
async def update_bill(bill_id: str, data: BillUpdate, user: dict = Depends(current_user)):
    ids = await scope_ids(user["id"])
    existing = await _get_visible(bill_id, ids)
    merged = existing.model_copy(update={**data.model_dump(), "updated_at": now_utc()})
    merged.name = merged.name.strip()
    merged.category = await resolve_category(merged.category, ids)
    if merged.paid and not existing.paid:
        merged.paid_at = now_utc()
    if not merged.paid:
        merged.paid_at = None
    await db.bills.replace_one({"id": bill_id}, _to_doc(merged))
    return merged


@router.patch("/bills/{bill_id}/paid", response_model=PaidOut)
async def set_paid(bill_id: str, data: PaidIn, user: dict = Depends(current_user)):
    ids = await scope_ids(user["id"])
    bill = await _get_visible(bill_id, ids)
    bill.paid = data.paid
    bill.paid_at = now_utc() if data.paid else None
    bill.updated_at = now_utc()
    await db.bills.replace_one({"id": bill_id}, _to_doc(bill))

    next_bill = None
    if bill.paid and bill.recurring:
        nxt = next_recurring_date(bill.due_date)
        exists = await db.bills.find_one({
            "user_id": {"$in": ids}, "name": bill.name, "recurring": True,
            "due_date": nxt.isoformat(), "id": {"$ne": bill.id},
        })
        if not exists:
            next_bill = Bill(
                user_id=bill.user_id, name=bill.name, amount=bill.amount, due_date=nxt,
                recurring=True, category=bill.category, notes=bill.notes,
            )
            await db.bills.insert_one(_to_doc(next_bill))
    return PaidOut(bill=bill, next_bill=next_bill)


@router.delete("/bills/{bill_id}", status_code=204)
async def delete_bill(bill_id: str, user: dict = Depends(current_user)):
    ids = await scope_ids(user["id"])
    res = await db.bills.delete_one({"id": bill_id, "user_id": {"$in": ids}})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conta não encontrada")


@router.get("/backup/export", response_model=BackupOut)
async def export_backup(user: dict = Depends(current_user)):
    ids = await scope_ids(user["id"])
    docs = await db.bills.find({"user_id": {"$in": ids}}, {"_id": 0}).sort("due_date", 1).to_list(5000)
    bills = [BillCreate(**{k: d[k] for k in BillCreate.model_fields if k in d}) for d in docs]
    return BackupOut(exported_at=now_utc(), bills=bills)


@router.post("/backup/import", response_model=ImportOut)
async def import_backup(data: ImportIn, user: dict = Depends(current_user)):
    ids = await scope_ids(user["id"])
    if data.replace:
        await db.bills.delete_many({"user_id": user["id"]})
    docs = []
    for item in data.bills:
        bill = Bill(**item.model_dump(), user_id=user["id"])
        bill.category = await resolve_category(bill.category, ids)
        if bill.paid:
            bill.paid_at = now_utc()
        docs.append(_to_doc(bill))
    if docs:
        await db.bills.insert_many(docs)
    return ImportOut(imported=len(docs))
