
import unittest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.pool import StaticPool

from backend.main import app
from backend.database import get_session


class TestTakeQuizFlow(unittest.TestCase):

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

        # Build a student and a two-question quiz with one correct answer each.
        student_response = self.client.post(
            "/students/",
            json={"name": "Test Student", "email": "student@test.com"}
        )
        self.student_id = student_response.json()["id"]

        quiz_response = self.client.post(
            "/quizzes/",
            json={"title": "Test Quiz", "description": "Testing"}
        )
        self.quiz_id = quiz_response.json()["id"]

        self.correct_answer_ids = {}
        self.wrong_answer_ids = {}
        self.question_ids = []
        for order, correct_text in ((1, "4"), (2, "Mars")):
            question_response = self.client.post(
                "/questions/",
                json={
                    "quiz_id": self.quiz_id,
                    "question_text": f"Question {order}",
                    "question_type": "multiple_choice",
                    "question_order": order,
                    "points": 1
                }
            )
            question_id = question_response.json()["id"]
            self.question_ids.append(question_id)

            wrong_response = self.client.post(
                "/answers/",
                json={
                    "question_id": question_id,
                    "answer_text": "Wrong",
                    "is_correct": False,
                    "answer_order": 1
                }
            )
            correct_response = self.client.post(
                "/answers/",
                json={
                    "question_id": question_id,
                    "answer_text": correct_text,
                    "is_correct": True,
                    "answer_order": 2
                }
            )
            self.wrong_answer_ids[question_id] = wrong_response.json()["id"]
            self.correct_answer_ids[question_id] = correct_response.json()["id"]

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        SQLModel.metadata.drop_all(self.engine)
        self.engine.dispose()

    def start_attempt(self):
        response = self.client.post(
            f"/quizzes/{self.quiz_id}/attempts",
            json={"student_id": self.student_id}
        )
        self.assertEqual(response.status_code, 200)
        return response.json()

    def test_list_quizzes(self):
        response = self.client.get("/quizzes/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["id"], self.quiz_id)

    def test_start_attempt(self):
        payload = self.start_attempt()

        self.assertIsNotNone(payload["attempt_id"])
        self.assertEqual(payload["status"], "in_progress")
        self.assertEqual(payload["quiz"]["id"], self.quiz_id)
        self.assertEqual(len(payload["quiz"]["questions"]), 2)
        first_question = payload["quiz"]["questions"][0]
        self.assertEqual(first_question["text"], "Question 1")
        self.assertEqual(len(first_question["answers"]), 2)
        self.assertIsNone(first_question["selected_answer_id"])
        # Correct answers must not be exposed to the student.
        for question in payload["quiz"]["questions"]:
            for answer in question["answers"]:
                self.assertNotIn("is_correct", answer)

    def test_start_attempt_rejects_invalid_ids(self):
        bad_quiz = self.client.post(
            "/quizzes/999999/attempts",
            json={"student_id": self.student_id}
        )
        bad_student = self.client.post(
            f"/quizzes/{self.quiz_id}/attempts",
            json={"student_id": 999999}
        )

        self.assertEqual(bad_quiz.status_code, 404)
        self.assertEqual(bad_student.status_code, 404)

    def test_save_answer(self):
        attempt_id = self.start_attempt()["attempt_id"]
        question_id = self.question_ids[0]

        response = self.client.put(
            f"/attempts/{attempt_id}/answers/{question_id}",
            json={"answer_id": self.correct_answer_ids[question_id]}
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["saved"])

        attempt = self.client.get(f"/attempts/{attempt_id}")
        saved = attempt.json()["quiz"]["questions"][0]["selected_answer_id"]
        self.assertEqual(saved, self.correct_answer_ids[question_id])

    def test_save_answer_can_be_changed(self):
        attempt_id = self.start_attempt()["attempt_id"]
        question_id = self.question_ids[0]

        self.client.put(
            f"/attempts/{attempt_id}/answers/{question_id}",
            json={"answer_id": self.wrong_answer_ids[question_id]}
        )
        self.client.put(
            f"/attempts/{attempt_id}/answers/{question_id}",
            json={"answer_id": self.correct_answer_ids[question_id]}
        )

        attempt = self.client.get(f"/attempts/{attempt_id}")
        saved = attempt.json()["quiz"]["questions"][0]["selected_answer_id"]
        self.assertEqual(saved, self.correct_answer_ids[question_id])

    def test_submit_grades_correctly(self):
        attempt_id = self.start_attempt()["attempt_id"]

        # Answer the first question correctly and the second one wrong.
        self.client.put(
            f"/attempts/{attempt_id}/answers/{self.question_ids[0]}",
            json={"answer_id": self.correct_answer_ids[self.question_ids[0]]}
        )
        self.client.put(
            f"/attempts/{attempt_id}/answers/{self.question_ids[1]}",
            json={"answer_id": self.wrong_answer_ids[self.question_ids[1]]}
        )

        response = self.client.post(f"/attempts/{attempt_id}/submit")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["score"], 1)
        self.assertEqual(response.json()["total_points"], 2)
        self.assertEqual(response.json()["status"], "submitted")

        attempt = self.client.get(f"/attempts/{attempt_id}")
        self.assertEqual(attempt.json()["status"], "submitted")
        self.assertEqual(attempt.json()["score"], 1)

    def test_submit_perfect_score(self):
        attempt_id = self.start_attempt()["attempt_id"]

        for question_id in self.question_ids:
            self.client.put(
                f"/attempts/{attempt_id}/answers/{question_id}",
                json={"answer_id": self.correct_answer_ids[question_id]}
            )

        response = self.client.post(f"/attempts/{attempt_id}/submit")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["score"], 2)
        self.assertEqual(response.json()["total_points"], 2)

    def test_reject_invalid_answer_id(self):
        attempt_id = self.start_attempt()["attempt_id"]
        question_id = self.question_ids[0]

        missing_answer = self.client.put(
            f"/attempts/{attempt_id}/answers/{question_id}",
            json={"answer_id": 999999}
        )
        # A valid answer for a different question is not allowed here.
        other_question_answer = self.client.put(
            f"/attempts/{attempt_id}/answers/{question_id}",
            json={"answer_id": self.correct_answer_ids[self.question_ids[1]]}
        )
        wrong_quiz_question = self.client.put(
            f"/attempts/{attempt_id}/answers/999999",
            json={"answer_id": self.correct_answer_ids[question_id]}
        )

        self.assertEqual(missing_answer.status_code, 422)
        self.assertEqual(other_question_answer.status_code, 422)
        self.assertEqual(wrong_quiz_question.status_code, 404)

    def test_prevent_editing_after_submit(self):
        attempt_id = self.start_attempt()["attempt_id"]
        question_id = self.question_ids[0]

        self.client.put(
            f"/attempts/{attempt_id}/answers/{question_id}",
            json={"answer_id": self.wrong_answer_ids[question_id]}
        )
        self.client.post(f"/attempts/{attempt_id}/submit")

        edit_response = self.client.put(
            f"/attempts/{attempt_id}/answers/{question_id}",
            json={"answer_id": self.correct_answer_ids[question_id]}
        )

        self.assertEqual(edit_response.status_code, 409)

        # Resubmitting keeps the original score instead of re-grading edits.
        resubmit = self.client.post(f"/attempts/{attempt_id}/submit")
        self.assertEqual(resubmit.status_code, 200)
        self.assertEqual(resubmit.json()["score"], 0)
        self.assertEqual(resubmit.json()["status"], "submitted")
