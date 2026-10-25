#added httpeexception for possible eror messages.
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends
from sqlmodel import Session, select
from backend.database import create_db_and_tables, get_session
from backend.models import Student, Quiz, QuizCreate

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
def create_quiz(quiz_data: QuizCreate, session: Session = Depends(get_session)):
    quiz = Quiz(
        title=quiz_data.title,
        description=quiz_data.description,
        time_limit_minutes=quiz_data.time_limit_minutes
    )
    session.add(quiz)
    session.commit()
    session.refresh(quiz)
    return quiz

