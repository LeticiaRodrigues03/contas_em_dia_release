import uuid
from datetime import datetime
from typing import List

from pydantic import BaseModel, Field

from models.bill import now_utc

MAX_MEMBERS = 10


class FamilyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=40)


class FamilyJoin(BaseModel):
    code: str = Field(min_length=6, max_length=6)


class Member(BaseModel):
    id: str
    name: str
    email: str
    is_owner: bool = False


class Family(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str
    owner_id: str
    member_ids: List[str]
    created_at: datetime = Field(default_factory=now_utc)


class FamilyOut(BaseModel):
    id: str
    name: str
    code: str
    owner_id: str
    members: List[Member]
    created_at: datetime
