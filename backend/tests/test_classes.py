import unittest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.pool import StaticPool

from backend.main import app
from backend.database import get_session


class TestClassesAndAssignments(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        SQLModel.metadata.create_all(self.engine)

        def get_test_session():
            with Session(self.engine) as session:
                yield session

        app.dependency_overrides[get_session] = get_test_session
        self.client = TestClient(app)

        self.student = self.client.post(
            "/students/identity",
            json={
                "clerk_user_id": "user_student_1",
                "name": "Test Student",
                "email": "student@example.com",
            },
        ).json()
        self.quiz = self.client.post(
            "/quizzes/",
            json={"title": "Assigned Quiz", "description": "For the class"},
        ).json()

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        SQLModel.metadata.drop_all(self.engine)
        self.engine.dispose()

    def create_class(self):
        response = self.client.post(
            "/classes/",
            json={"name": "Biology", "teacher_clerk_id": "user_teacher_1"},
        )
        self.assertEqual(response.status_code, 200)
        return response.json()

    def test_student_identity_is_reused(self):
        response = self.client.post(
            "/students/identity",
            json={
                "clerk_user_id": "user_student_1",
                "name": "Updated Name",
                "email": "student@example.com",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], self.student["id"])
        self.assertEqual(response.json()["name"], "Updated Name")

    def test_student_joins_class_and_sees_assigned_quiz_status(self):
        classroom = self.create_class()
        assignment = self.client.post(
            f"/classes/{classroom['id']}/assignments/",
            json={"quiz_id": self.quiz["id"]},
        )
        self.assertEqual(assignment.status_code, 200)

        joined = self.client.post(
            "/classes/join",
            json={"join_code": classroom["join_code"], "student_id": self.student["id"]},
        )
        self.assertEqual(joined.status_code, 200)

        assigned_quizzes = self.client.get(
            f"/students/{self.student['id']}/quizzes/"
        )
        self.assertEqual(assigned_quizzes.status_code, 200)
        self.assertEqual(len(assigned_quizzes.json()), 1)
        self.assertEqual(assigned_quizzes.json()[0]["quiz_id"], self.quiz["id"])
        self.assertEqual(assigned_quizzes.json()[0]["status"], "not_started")

        attempt = self.client.post(
            f"/quizzes/{self.quiz['id']}/attempts",
            json={"student_id": self.student["id"]},
        )
        self.assertEqual(attempt.status_code, 200)

        assigned_quizzes = self.client.get(
            f"/students/{self.student['id']}/quizzes/"
        )
        self.assertEqual(assigned_quizzes.json()[0]["status"], "in_progress")

        submitted = self.client.post(
            f"/attempts/{attempt.json()['attempt_id']}/submit"
        )
        self.assertEqual(submitted.status_code, 200)

        assigned_quizzes = self.client.get(
            f"/students/{self.student['id']}/quizzes/"
        )
        self.assertEqual(assigned_quizzes.json()[0]["status"], "completed")
        self.assertEqual(assigned_quizzes.json()[0]["score"], 0)

    def test_join_code_is_case_insensitive_and_invalid_code_is_rejected(self):
        classroom = self.create_class()
        response = self.client.post(
            "/classes/join",
            json={
                "join_code": classroom["join_code"].lower(),
                "student_id": self.student["id"],
            },
        )
        missing = self.client.post(
            "/classes/join",
            json={"join_code": "NOTREAL", "student_id": self.student["id"]},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(missing.status_code, 404)

    def test_teacher_class_list_includes_assignments(self):
        classroom = self.create_class()
        self.client.post(
            f"/classes/{classroom['id']}/assignments/",
            json={"quiz_id": self.quiz["id"]},
        )

        response = self.client.get("/teachers/user_teacher_1/classes/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()[0]["assignments"][0]["quiz_title"], "Assigned Quiz")


if __name__ == "__main__":
    unittest.main()
