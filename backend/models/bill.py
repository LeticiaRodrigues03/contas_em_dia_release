import uuid
from datetime import date, datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, Field

CATEGORIES = [
    "Moradia", "Energia", "Água", "Internet", "Telefone", "Cartão",
    "Transporte", "Saúde", "Educação", "Lazer", "Impostos", "Outros",
]


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class BillBase(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    amount: float = Field(default=0, ge=0)  # 0 = "Valor não informado"
    due_date: date
    recurring: bool = False
    category: str = "Outros"
    notes: str = Field(default="", max_length=500)


class BillCreate(BillBase):
    paid: bool = False


class BillUpdate(BillBase):
    paid: bool = False


class Bill(BillBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    paid: bool = False
    paid_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)


class PaidIn(BaseModel):
    paid: bool


class PaidOut(BaseModel):
    bill: Bill
    next_bill: Optional[Bill] = None


class BackupOut(BaseModel):
    app: str = "contas-em-dia"
    version: int = 1
    exported_at: datetime
    bills: List[BillCreate]


class ImportIn(BaseModel):
    bills: List[BillCreate]
    replace: bool = False


class ImportOut(BaseModel):
    imported: int
