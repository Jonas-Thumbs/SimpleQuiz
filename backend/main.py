#added httpeexception for possible eror messages.
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends
from sqlmodel import Session, select
from backend.database import create_db_and_tables, get_session
from backend.models import (
    Student,
    Quiz,
    Question,
    Answer,
    QuizCreate,
    QuestionCreate,
    AnswerCreate
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)

#The simplest possible backend. From: https://fastapi.tiangolo.com/tutorial/first-steps/
@app.get("/")
async def root():
    return {"message": "Hello World"}

#Simple put request.
@app.put("/test-put")
async def test_put(message: str):
    return{
        "status": "success",
        "yourmessage": message
    }

@app.post("/students/", response_model=Student)
def create_student(student: Student, session: Session = Depends(get_session)):
    session.add(student)
    session.commit()
    session.refresh(student)
    return student

@app.get("/students/", response_model=list[Student])
def read_students(session: Session = Depends(get_session)):
    students = session.exec(select(Student)).all()
    return students


@app.post("/api/quizzes", response_model=Quiz)
@app.post("/quizzes/", response_model=Quiz)
def create_quiz(quiz: QuizCreate, session: Session = Depends(get_session)):
    new_quiz = Quiz(
        title=quiz.title,
        description=quiz.description
        time_limit_minutes=quiz.time_limit_minutes
    )

    session.add(new_quiz)
    session.commit()
    session.refresh(new_quiz)
    return new_quiz


@app.get("/quizzes/", response_model=list[Quiz])
def read_quizzes(session: Session = Depends(get_session)):
    quizzes = session.exec(select(Quiz)).all()
    return quizzes



@app.post("/questions/", response_model=Question)
def create_question(
    question: QuestionCreate,
    session: Session = Depends(get_session)
):
    quiz = session.get(Quiz, question.quiz_id)

    if quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")

    new_question = Question(
        quiz_id=question.quiz_id,
        question_text=question.question_text,
        question_type=question.question_type,
        question_order=question.question_order,
        points=question.points
    )

    session.add(new_question)
    session.commit()
    session.refresh(new_question)
    return new_question


@app.get("/quizzes/{quiz_id}/questions/", response_model=list[Question])
def read_questions(quiz_id: int, session: Session = Depends(get_session)):
    questions = session.exec(
        select(Question).where(Question.quiz_id == quiz_id)
    ).all()
    return questions


@app.post("/answers/", response_model=Answer)
def create_answer(
    answer: AnswerCreate,
    session: Session = Depends(get_session)
):
    question = session.get(Question, answer.question_id)

    if question is None:
        raise HTTPException(status_code=404, detail="Question not found")

    new_answer = Answer(
        question_id=answer.question_id,
        answer_text=answer.answer_text,
        is_correct=answer.is_correct,
        answer_order=answer.answer_order
    )

    session.add(new_answer)
    session.commit()
    session.refresh(new_answer)
    return new_answer

@app.get("/questions/{question_id}/answers/", response_model=list[Answer])
def read_answers(question_id: int, session: Session = Depends(get_session)):
    answers = session.exec(
        select(Answer).where(Answer.question_id == question_id)
    ).all()
    return answers
