#added httpeexception for possible eror messages.
from contextlib import asynccontextmanager
import secrets
import string
from fastapi import FastAPI, HTTPException, Depends
from sqlmodel import Session, select
from backend.database import create_db_and_tables, engine, get_session
from backend.models import (
    Answer,
    AnswerCreate,
    AssignQuizRequest,
    Classroom,
    ClassroomCreateRequest,
    ClassMembership,
    FlagQuestionRequest,
    JoinClassRequest,
    Question,
    QuestionCreate,
    Quiz,
    QuizAttempt,
    QuizAssignment,
    QuestionReviewFlag,
    QuizCreate,
    SaveAnswerRequest,
    StartAttemptRequest,
    Student,
    StudentIdentityRequest,
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
        saved_answer.question_id: saved_answer.answer_id
        for saved_answer in saved_answers
    }
    flagged_question_ids = {
        flag.question_id
        for flag in session.exec(
            select(QuestionReviewFlag).where(QuestionReviewFlag.attempt_id == attempt.id)
        ).all()
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
            "is_flagged": question.id in flagged_question_ids,
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


@app.post("/students/identity", response_model=Student)
def get_or_create_student(
    request: StudentIdentityRequest,
    session: Session = Depends(get_session),
):
    student = session.exec(
        select(Student).where(Student.clerk_user_id == request.clerk_user_id)
    ).first()
    if student is None:
        student = Student(
            clerk_user_id=request.clerk_user_id,
            name=request.name,
            email=request.email,
        )
    else:
        student.name = request.name
        student.email = request.email
    session.add(student)
    session.commit()
    session.refresh(student)
    return student


def classroom_payload(session: Session, classroom: Classroom):
    assignments = session.exec(
        select(QuizAssignment).where(QuizAssignment.classroom_id == classroom.id)
    ).all()
    return {
        "id": classroom.id,
        "name": classroom.name,
        "join_code": classroom.join_code,
        "assignments": [
            {
                "id": assignment.id,
                "quiz_id": assignment.quiz_id,
                "quiz_title": session.get(Quiz, assignment.quiz_id).title,
            }
            for assignment in assignments
        ],
    }


@app.post("/classes/")
def create_classroom(
    request: ClassroomCreateRequest,
    session: Session = Depends(get_session),
):
    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Class name is required")

    alphabet = string.ascii_uppercase + string.digits
    join_code = "".join(secrets.choice(alphabet) for _ in range(6))
    while session.exec(
        select(Classroom).where(Classroom.join_code == join_code)
    ).first():
        join_code = "".join(secrets.choice(alphabet) for _ in range(6))

    classroom = Classroom(
        name=name,
        teacher_clerk_id=request.teacher_clerk_id,
        join_code=join_code,
    )
    session.add(classroom)
    session.commit()
    session.refresh(classroom)
    return classroom_payload(session, classroom)


@app.get("/teachers/{teacher_clerk_id}/classes/")
def read_teacher_classes(
    teacher_clerk_id: str,
    session: Session = Depends(get_session),
):
    classrooms = session.exec(
        select(Classroom).where(Classroom.teacher_clerk_id == teacher_clerk_id)
    ).all()
    return [classroom_payload(session, classroom) for classroom in classrooms]


@app.post("/classes/{classroom_id}/assignments/")
def assign_quiz_to_class(
    classroom_id: int,
    request: AssignQuizRequest,
    session: Session = Depends(get_session),
):
    classroom = session.get(Classroom, classroom_id)
    if classroom is None:
        raise HTTPException(status_code=404, detail="Class not found")
    quiz = session.get(Quiz, request.quiz_id)
    if quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")

    existing = session.exec(
        select(QuizAssignment).where(
            QuizAssignment.classroom_id == classroom_id,
            QuizAssignment.quiz_id == request.quiz_id,
        )
    ).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Quiz is already assigned to this class")

    assignment = QuizAssignment(classroom_id=classroom_id, quiz_id=request.quiz_id)
    session.add(assignment)
    session.commit()
    session.refresh(assignment)
    return {"id": assignment.id, "quiz_id": quiz.id, "quiz_title": quiz.title}


@app.post("/classes/join")
def join_class(
    request: JoinClassRequest,
    session: Session = Depends(get_session),
):
    student = session.get(Student, request.student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    classroom = session.exec(
        select(Classroom).where(Classroom.join_code == request.join_code.strip().upper())
    ).first()
    if classroom is None:
        raise HTTPException(status_code=404, detail="Class code not found")

    membership = session.exec(
        select(ClassMembership).where(
            ClassMembership.classroom_id == classroom.id,
            ClassMembership.student_id == student.id,
        )
    ).first()
    if membership is None:
        session.add(ClassMembership(classroom_id=classroom.id, student_id=student.id))
        session.commit()
    return {"joined": True, "class_id": classroom.id, "class_name": classroom.name}


@app.get("/students/{student_id}/quizzes/")
def read_student_assigned_quizzes(
    student_id: int,
    session: Session = Depends(get_session),
):
    student = session.get(Student, student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")

    memberships = session.exec(
        select(ClassMembership).where(ClassMembership.student_id == student_id)
    ).all()
    quizzes_by_id = {}
    for membership in memberships:
        classroom = session.get(Classroom, membership.classroom_id)
        assignments = session.exec(
            select(QuizAssignment).where(
                QuizAssignment.classroom_id == membership.classroom_id
            )
        ).all()
        for assignment in assignments:
            quizzes_by_id.setdefault(assignment.quiz_id, set()).add(classroom.name)

    assigned_quizzes = []
    for quiz_id, class_names in quizzes_by_id.items():
        quiz = session.get(Quiz, quiz_id)
        attempts = session.exec(
            select(QuizAttempt)
            .where(
                QuizAttempt.student_id == student_id,
                QuizAttempt.quiz_id == quiz_id,
            )
            .order_by(QuizAttempt.id.desc())
        ).all()
        latest_attempt = attempts[0] if attempts else None
        if latest_attempt is None:
            status = "not_started"
        elif latest_attempt.status in ("completed", "submitted"):
            status = "completed"
        else:
            status = "in_progress"

        quiz_questions = session.exec(
            select(Question).where(Question.quiz_id == quiz_id)
        ).all()
        assigned_quizzes.append({
            "quiz_id": quiz.id,
            "title": quiz.title,
            "description": quiz.description,
            "question_count": len(quiz_questions),
            "total_points": sum(question.points for question in quiz_questions),
            "class_names": sorted(class_names),
            "status": status,
            "score": latest_attempt.score if latest_attempt else None,
        })
    return assigned_quizzes


@app.post("/api/quizzes", response_model=Quiz)
@app.post("/quizzes/", response_model=Quiz)
def create_quiz(quiz: QuizCreate, session: Session = Depends(get_session)):
    new_quiz = Quiz(
        title=quiz.title,
        description=quiz.description,
        time_limit_minutes=quiz.time_limit_minutes
    )

    session.add(new_quiz)
    session.commit()
    session.refresh(new_quiz)
    return new_quiz


@app.get("/quizzes/", response_model=None)
def read_quizzes(session: Session = Depends(get_session)):
    quizzes = session.exec(select(Quiz)).all()
    return [
        {
            **quiz.model_dump(),
            "question_count": len(session.exec(
                select(Question).where(Question.quiz_id == quiz.id)
            ).all()),
        }
        for quiz in quizzes
    ]


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

@app.post("/quizzes/{quiz_id}/attempts/", response_model=None)
@app.post("/quizzes/{quiz_id}/attempts", response_model=None)
def start_attempt(
    quiz_id: int,
    request: StartAttemptRequest,
    session: Session = Depends(get_session)
):
    quiz = session.get(Quiz, quiz_id)
    if quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")

    student = session.get(Student, request.student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")

    attempt = session.exec(
        select(QuizAttempt).where(
            QuizAttempt.quiz_id == quiz_id,
            QuizAttempt.student_id == request.student_id,
            QuizAttempt.status == "in_progress",
        )
    ).first()
    
    if attempt is None:
        attempt = QuizAttempt(quiz_id=quiz_id, student_id=request.student_id, status="in_progress")
        session.add(attempt)
        session.commit()
        session.refresh(attempt)
        
    return attempt_payload(session, attempt)


@app.get("/attempts/{attempt_id}", response_model=None)
@app.get("/attempts/{attempt_id}/", response_model=None)
def read_attempt(attempt_id: int, session: Session = Depends(get_session)):
    attempt = session.get(QuizAttempt, attempt_id)
    if attempt is None:
        raise HTTPException(status_code=404, detail="Attempt not found")
    return attempt_payload(session, attempt)


@app.post("/attempts/{attempt_id}/answers/{question_id}", response_model=None)
@app.post("/attempts/{attempt_id}/answers/{question_id}/", response_model=None)
@app.put("/attempts/{attempt_id}/answers/{question_id}", response_model=None)
@app.put("/attempts/{attempt_id}/answers/{question_id}/", response_model=None)
def save_answer(
    attempt_id: int,
    question_id: int,
    request: SaveAnswerRequest,
    session: Session = Depends(get_session)
):
    attempt = session.get(QuizAttempt, attempt_id)
    if attempt is None:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.status != "in_progress":
        raise HTTPException(status_code=409, detail="Attempt is already submitted")

    question = session.get(Question, question_id)
    if question is None or question.quiz_id != attempt.quiz_id:
        raise HTTPException(status_code=404, detail="Question not found in this quiz")
        
    answer = session.get(Answer, request.answer_id)
    if answer is None or answer.question_id != question_id:
        raise HTTPException(status_code=422, detail="Answer is not an available option")

    existing_answer = session.exec(
        select(StudentAnswer).where(
            StudentAnswer.attempt_id == attempt_id,
            StudentAnswer.question_id == question_id
        )
    ).first()

    if existing_answer:
        existing_answer.answer_id = request.answer_id
        session.add(existing_answer)
        session.commit()
        session.refresh(existing_answer)
        return {"saved": True}

    student_answer = StudentAnswer(
        attempt_id=attempt_id,
        question_id=question_id,
        answer_id=request.answer_id
    )
    session.add(student_answer)
    session.commit()
    session.refresh(student_answer)
    return {"saved": True}


@app.put("/attempts/{attempt_id}/questions/{question_id}/flag")
def set_question_flag(
    attempt_id: int,
    question_id: int,
    request: FlagQuestionRequest,
    session: Session = Depends(get_session),
):
    attempt = session.get(QuizAttempt, attempt_id)
    if attempt is None:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.status != "in_progress":
        raise HTTPException(status_code=409, detail="Attempt is already submitted")

    question = session.get(Question, question_id)
    if question is None or question.quiz_id != attempt.quiz_id:
        raise HTTPException(status_code=404, detail="Question not found in this quiz")

    flag = session.exec(
        select(QuestionReviewFlag).where(
            QuestionReviewFlag.attempt_id == attempt_id,
            QuestionReviewFlag.question_id == question_id,
        )
    ).first()
    if request.is_flagged and flag is None:
        session.add(QuestionReviewFlag(attempt_id=attempt_id, question_id=question_id))
    elif not request.is_flagged and flag is not None:
        session.delete(flag)
    session.commit()
    return {"is_flagged": request.is_flagged}


def submission_results(session: Session, questions: list[Question], answer_by_question: dict):
    results = []
    total_score = 0
    for question in questions:
        student_answer = answer_by_question.get(question.id)
        selected_answer = session.get(Answer, student_answer.answer_id) if student_answer else None
        correct_answer = session.exec(
            select(Answer).where(
                Answer.question_id == question.id,
                Answer.is_correct == True,
            )
        ).first()
        is_correct = bool(selected_answer and selected_answer.is_correct)
        points_earned = question.points if is_correct else 0
        total_score += points_earned
        if student_answer is not None:
            student_answer.is_correct = is_correct

        results.append({
            "question_id": question.id,
            "question_text": question.question_text,
            "your_answer": selected_answer.answer_text if selected_answer else None,
            "correct_answer": correct_answer.answer_text if correct_answer else None,
            "is_correct": is_correct,
            "points": question.points,
            "points_earned": points_earned,
        })
    return results, total_score


@app.post("/attempts/{attempt_id}/submit", response_model=None)
@app.post("/attempts/{attempt_id}/submit/", response_model=None)
def submit_attempt(attempt_id: int, session: Session = Depends(get_session)):
    attempt = session.get(QuizAttempt, attempt_id)
    if attempt is None:
        raise HTTPException(status_code=404, detail="Attempt not found")

    questions = session.exec(
        select(Question)
        .where(Question.quiz_id == attempt.quiz_id)
        .order_by(Question.question_order)
    ).all()
    total_points = sum(q.points for q in questions)
    answers = session.exec(
        select(StudentAnswer).where(StudentAnswer.attempt_id == attempt_id)
    ).all()
    answer_by_question = {answer.question_id: answer for answer in answers}
    results, calculated_score = submission_results(session, questions, answer_by_question)

    if attempt.status in ["completed", "submitted"]:
        return {
            "attempt_id": attempt.id,
            "score": attempt.score,
            "total_points": total_points,
            "status": attempt.status,
            "results": results,
        }

    attempt.score = calculated_score
    attempt.status = "submitted"
    session.add(attempt)
    session.commit()
    session.refresh(attempt)
    
    return {
        "attempt_id": attempt.id,
        "score": attempt.score,
        "total_points": total_points,
        "status": attempt.status,
        "results": results,
    }

@app.get("/quizzes/{quiz_id}/quick_results")
@app.get("/quizzes/{quiz_id}/quick_results/")
def get_quick_results_teacher(quiz_id: int, session: Session = Depends(get_session)):
    quiz = session.get(Quiz, quiz_id)
    if quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")

    submitted_attempts = session.exec(
        select(QuizAttempt).where(
            QuizAttempt.quiz_id == quiz_id,
            QuizAttempt.status.in_(["submitted", "completed"])
        )
    ).all()

    total_attempts = len(submitted_attempts)
    total_score_sum = sum(attempt.score or 0 for attempt in submitted_attempts)
    average_score = round(total_score_sum / total_attempts, 2) if total_attempts else 0.0
    attempt_ids = [attempt.id for attempt in submitted_attempts]
    questions = session.exec(
        select(Question)
        .where(Question.quiz_id == quiz_id)
        .order_by(Question.question_order)
    ).all()

    question_summaries = []
    for question in questions:
        if total_attempts > 0:
            student_answers = session.exec(
                select(StudentAnswer).where(
                    StudentAnswer.question_id == question.id,
                    StudentAnswer.attempt_id.in_(attempt_ids)
                )
            ).all()
            correct_answers = 0
            for student_answer in student_answers:
                selected_choice = session.get(Answer, student_answer.answer_id)
                if selected_choice and selected_choice.is_correct:
                    correct_answers += 1
        else:
            correct_answers = 0

        question_summaries.append({
            "question_id": question.id,
            "question_text": question.question_text,
            "points": question.points,
            "total_answers": total_attempts,
            "correct_answers": correct_answers,
        })

    return {
        "quiz_id": quiz.id,
        "quiz_title": quiz.title,
        "total_attempts": total_attempts,
        "average_score": average_score,
        "questions": question_summaries,
    }