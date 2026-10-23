from typing import Optional
from sqlmodel import SQLModel, Field

class Student(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str

class Quiz(SQLModel, table=True):
    time_limit_minutes: Optional[int] = Field(default=None)

class QuizCreate(SQLModel):
    time_limit_minutes: Optional[int] = None