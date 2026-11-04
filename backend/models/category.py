import uuid
from datetime import datetime
from typing import List

from pydantic import BaseModel, Field

from models.bill import now_utc

CATEGORY_MAX_LEN = 30


class CategoryIn(BaseModel):
    name: str = Field(min_length=1, max_length=CATEGORY_MAX_LEN)


class CustomCategory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    created_at: datetime = Field(default_factory=now_utc)


class CategoryListOut(BaseModel):
    defaults: List[str]
    custom: List[CustomCategory]
