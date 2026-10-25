#added httpeexception for possible eror messages.
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends
from sqlmodel import Session, select
from backend.database import create_db_and_tables, engine, get_session
from backend.models import (
    Answer,
    AnswerCreate,
    Question,
    QuestionCreate,
    Quiz,
    QuizAttempt,
    QuizCreate,
    SaveAnswerRequest,
    StartAttemptRequest,
    Student,
    StudentAnswer,
)


def seed_demo_data():
    # Add a known quiz once so the student flow works before teacher tools exist.
    with Session(engine) as session:
        if session.get(Student, 1) is None:
            session.add(Student(id=1, name="Demo Student", email="student@example.com"))

        if session.get(Quiz, 1) is None:
            quiz = Quiz(
                id=1,
                title="Sample Quiz",
                description="A short multiple-choice quiz for testing the student flow.",
            )
            session.add(quiz)
            session.flush()
            first_question = Question(
                quiz_id=quiz.id,
                question_text="What is 2 + 2?",
                question_type="multiple_choice",
                question_order=1,
                points=1,
            )
            second_question = Question(
                quiz_id=quiz.id,
                question_text="Which planet is known as the Red Planet?",
                question_type="multiple_choice",
                question_order=2,
                points=1,
            )
            session.add_all([first_question, second_question])
            session.flush()
            session.add_all([
                Answer(question_id=first_question.id, answer_text="3", answer_order=1),
                Answer(question_id=first_question.id, answer_text="4", is_correct=True, answer_order=2),
                Answer(question_id=first_question.id, answer_text="5", answer_order=3),
                Answer(question_id=second_question.id, answer_text="Venus", answer_order=1),
                Answer(question_id=second_question.id, answer_text="Mars", is_correct=True, answer_order=2),
                Answer(question_id=second_question.id, answer_text="Jupiter", answer_order=3),
            ])
        session.commit()


def attempt_payload(session: Session, attempt: QuizAttempt):
    # Return quiz content and saved choices, but never expose correct answers.
    quiz = session.get(Quiz, attempt.quiz_id)
    questions = session.exec(
        select(Question)
        .where(Question.quiz_id == attempt.quiz_id)
        .order_by(Question.question_order)
    ).all()
    saved_answers = session.exec(
        select(StudentAnswer).where(StudentAnswer.attempt_id == attempt.id)
    ).all()
    answer_by_question = {
        saved_answer.question_id: saved_answer.selected_answer_id
        for saved_answer in saved_answers
    }

    question_payloads = []
    for question in questions:
        choices = session.exec(
            select(Answer)
            .where(Answer.question_id == question.id)
            .order_by(Answer.answer_order)
        ).all()
        question_payloads.append({
            "id": question.id,
            "text": question.question_text,
            "answers": [
                {"id": choice.id, "text": choice.answer_text}
                for choice in choices
            ],
            "points": question.points,
            "selected_answer_id": answer_by_question.get(question.id),
        })

    return {
        "attempt_id": attempt.id,
        "status": attempt.status,
        "score": attempt.score,
        "quiz": {
            "id": quiz.id,
            "title": quiz.title,
            "description": quiz.description,
            "questions": question_payloads,
        },
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Prepare the database and demo quiz before the API starts accepting requests.
    create_db_and_tables()
    seed_demo_data()
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
