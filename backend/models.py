from typing import Optional
from sqlmodel import SQLModel, Field

# Each table stores one kind of quiz data, foreign keys connect related records.
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


# One record tracks a student's progress and final score for one quiz run.
class QuizAttempt(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    quiz_id: int = Field(foreign_key="quiz.id")
    student_id: int = Field(foreign_key="student.id")
    status: str = "in_progress"
    score: Optional[int] = None


# One selected answer is saved per question in an attempt and graded on submission.
class StudentAnswer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    attempt_id: int = Field(foreign_key="quizattempt.id")
    question_id: int = Field(foreign_key="question.id")
    selected_answer_id: int = Field(foreign_key="answer.id")
    is_correct: Optional[bool] = None


# Request models define the small JSON bodies accepted by the API.
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


class StartAttemptRequest(SQLModel):
    student_id: int


class SaveAnswerRequest(SQLModel):
    answer_id: int
