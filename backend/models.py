from typing import Optional
from sqlmodel import SQLModel, Field

class Student(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str

class Quiz(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    time_limit_minutes: Optional[int] = Field(default=None)

class Question(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    quiz_id: int = Field(foreign_key="quiz.id")
    question_text: str
    question_type: str
    question_order: int
    points: int = 1

class Answer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    question_id: int = Field(foreign_key="question.id")
    answer_text: str
    is_correct: bool = False
    answer_order: int

class QuizCreate(SQLModel):
    title: str
    description: Optional[str] = None
    time_limit_minutes: Optional[int] = None


class QuestionCreate(SQLModel):
    quiz_id: int
    question_text: str
    question_type: str
    question_order: int
    points: int = 1


class AnswerCreate(SQLModel):
    question_id: int
    answer_text: str
    is_correct: bool = False
    answer_order: int
