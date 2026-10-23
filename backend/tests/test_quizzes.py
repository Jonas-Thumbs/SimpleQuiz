
import unittest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.pool import StaticPool

from backend.main import app
from backend.database import get_session


class TestQuizCreation(unittest.TestCase):

    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool
        )

        SQLModel.metadata.create_all(self.engine)

        def get_test_session():
            with Session(self.engine) as session:
                yield session

        app.dependency_overrides[get_session] = get_test_session
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        SQLModel.metadata.drop_all(self.engine)
        self.engine.dispose()

    def test_create_quiz(self):
        response = self.client.post(
            "/quizzes/",
            json={
                "title": "Test Quiz",
                "description": "A quiz for testing"
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["title"], "Test Quiz")
        self.assertIsNotNone(response.json()["id"])

    def test_create_question(self):
        quiz_response = self.client.post(
            "/quizzes/",
            json={"title": "Test Quiz", "description": "Testing"}
        )

        quiz_id = quiz_response.json()["id"]

        response = self.client.post(
            "/questions/",
            json={
                "quiz_id": quiz_id,
                "question_text": "What is 2 + 2?",
                "question_type": "multiple_choice",
                "question_order": 1,
                "points": 1
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["quiz_id"], quiz_id)
        self.assertIsNotNone(response.json()["id"])

    def test_create_answer(self):
        quiz_response = self.client.post(
            "/quizzes/",
            json={"title": "Test Quiz", "description": "Testing"}
        )

        question_response = self.client.post(
            "/questions/",
            json={
                "quiz_id": quiz_response.json()["id"],
                "question_text": "What is 2 + 2?",
                "question_type": "multiple_choice",
                "question_order": 1,
                "points": 1
            }
        )

        question_id = question_response.json()["id"]

        response = self.client.post(
            "/answers/",
            json={
                "question_id": question_id,
                "answer_text": "4",
                "is_correct": True,
                "answer_order": 1
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["question_id"], question_id)
        self.assertTrue(response.json()["is_correct"])

    def test_list_quiz_content(self):
        quiz_response = self.client.post(
            "/quizzes/",
            json={"title": "Test Quiz", "description": "Testing"}
        )

        quiz_id = quiz_response.json()["id"]

        question_response = self.client.post(
            "/questions/",
            json={
                "quiz_id": quiz_id,
                "question_text": "What is 1 + 1?",
                "question_type": "multiple_choice",
                "question_order": 1,
                "points": 1
            }
        )

        question_id = question_response.json()["id"]

        self.client.post(
            "/answers/",
            json={
                "question_id": question_id,
                "answer_text": "2",
                "is_correct": True,
                "answer_order": 1
            }
        )

        quizzes = self.client.get("/quizzes/")
        questions = self.client.get(
            f"/quizzes/{quiz_id}/questions/"
        )
        answers = self.client.get(
            f"/questions/{question_id}/answers/"
        )

        self.assertEqual(quizzes.status_code, 200)
        self.assertEqual(questions.status_code, 200)
        self.assertEqual(answers.status_code, 200)
        self.assertEqual(len(questions.json()), 1)
        self.assertEqual(len(answers.json()), 1)

    def test_reject_invalid_parent_ids(self):
        question_response = self.client.post(
            "/questions/",
            json={
                "quiz_id": 999999,
                "question_text": "Test question",
                "question_type": "multiple_choice",
                "question_order": 1,
                "points": 1
            }
        )

        answer_response = self.client.post(
            "/answers/",
            json={
                "question_id": 999999,
                "answer_text": "Test answer",
                "is_correct": False,
                "answer_order": 1
            }
        )

        self.assertEqual(question_response.status_code, 404)
        self.assertEqual(answer_response.status_code, 404)

    def test_create_quiz_does_not_use_client_id(self):
        response = self.client.post(
            "/quizzes/",
            json={
                "id": 999999,
                "title": "Test Quiz",
                "description": "Testing client ID"
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertNotEqual(response.json()["id"], 999999)
