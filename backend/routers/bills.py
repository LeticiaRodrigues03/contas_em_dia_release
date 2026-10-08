import calendar
from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from auth_utils import current_user
from db import db
from models.bill import (
    CATEGORIES, BackupOut, Bill, BillCreate, BillUpdate, ImportIn, ImportOut,
    PaidIn, PaidOut, now_utc,
)

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


def _category(value: str) -> str:
    return value if value in CATEGORIES else "Outros"


async def _get_owned(bill_id: str, user_id: str) -> Bill:
    doc = await db.bills.find_one({"id": bill_id, "user_id": user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    return _from_doc(doc)


@router.get("/categories", response_model=List[str])
async def list_categories():
    return CATEGORIES


@router.get("/bills", response_model=List[Bill])
async def list_bills(user: dict = Depends(current_user)):
    docs = await db.bills.find({"user_id": user["id"]}, {"_id": 0}).sort("due_date", 1).to_list(5000)
    return [_from_doc(d) for d in docs]


@router.post("/bills", response_model=Bill, status_code=201)
async def create_bill(data: BillCreate, user: dict = Depends(current_user)):
    bill = Bill(**data.model_dump(), user_id=user["id"])
    bill.name = bill.name.strip()
    bill.category = _category(bill.category)
    if bill.paid:
        bill.paid_at = now_utc()
    await db.bills.insert_one(_to_doc(bill))
    return bill


@router.get("/bills/{bill_id}", response_model=Bill)
async def get_bill(bill_id: str, user: dict = Depends(current_user)):
    return await _get_owned(bill_id, user["id"])


@router.put("/bills/{bill_id}", response_model=Bill)
async def update_bill(bill_id: str, data: BillUpdate, user: dict = Depends(current_user)):
    existing = await _get_owned(bill_id, user["id"])
    merged = existing.model_copy(update={**data.model_dump(), "updated_at": now_utc()})
    merged.name = merged.name.strip()
    merged.category = _category(merged.category)
    if merged.paid and not existing.paid:
        merged.paid_at = now_utc()
    if not merged.paid:
        merged.paid_at = None
    await db.bills.replace_one({"id": bill_id, "user_id": user["id"]}, _to_doc(merged))
    return merged


@router.patch("/bills/{bill_id}/paid", response_model=PaidOut)
async def set_paid(bill_id: str, data: PaidIn, user: dict = Depends(current_user)):
    bill = await _get_owned(bill_id, user["id"])
    bill.paid = data.paid
    bill.paid_at = now_utc() if data.paid else None
    bill.updated_at = now_utc()
    await db.bills.replace_one({"id": bill_id, "user_id": user["id"]}, _to_doc(bill))

    next_bill = None
    if bill.paid and bill.recurring:
        nxt = next_recurring_date(bill.due_date)
        exists = await db.bills.find_one({
            "user_id": user["id"], "name": bill.name, "recurring": True,
            "due_date": nxt.isoformat(), "id": {"$ne": bill.id},
        })
        if not exists:
            next_bill = Bill(
                user_id=user["id"], name=bill.name, amount=bill.amount, due_date=nxt,
                recurring=True, category=bill.category, notes=bill.notes,
            )
            await db.bills.insert_one(_to_doc(next_bill))
    return PaidOut(bill=bill, next_bill=next_bill)


@router.delete("/bills/{bill_id}", status_code=204)
async def delete_bill(bill_id: str, user: dict = Depends(current_user)):
    res = await db.bills.delete_one({"id": bill_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conta não encontrada")


@router.get("/backup/export", response_model=BackupOut)
async def export_backup(user: dict = Depends(current_user)):
    docs = await db.bills.find({"user_id": user["id"]}, {"_id": 0}).sort("due_date", 1).to_list(5000)
    bills = [BillCreate(**{k: d[k] for k in BillCreate.model_fields if k in d}) for d in docs]
    return BackupOut(exported_at=now_utc(), bills=bills)


@router.post("/backup/import", response_model=ImportOut)
async def import_backup(data: ImportIn, user: dict = Depends(current_user)):
    if data.replace:
        await db.bills.delete_many({"user_id": user["id"]})
    docs = []
    for item in data.bills:
        bill = Bill(**item.model_dump(), user_id=user["id"])
        bill.category = _category(bill.category)
        if bill.paid:
            bill.paid_at = now_utc()
        docs.append(_to_doc(bill))
    if docs:
        await db.bills.insert_many(docs)
    return ImportOut(imported=len(docs))
