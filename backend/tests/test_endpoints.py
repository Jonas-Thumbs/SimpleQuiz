#import necessary modules
import unittest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.pool import StaticPool

#import backend modules/ data base 
from backend.main import app
from backend.database import get_session

#create a class for trivial testing 
class TestEndpoints(unittest.TestCase):
    
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )

        SQLModel.metadata.create_all(self.engine)

        #create fucntion get_test_session
        def get_test_session():
            with Session(self.engine) as session:
                yield session

        app.dependency_overrides[get_session] = get_test_session
        self.client = TestClient(app)

        
        self.student_id = self.client.post(
            "/students",
            json={"name": "Test Student", "email": "teststudent@example.com"}
        ).json()["id"]

        self.quiz_id = self.client.post(
            "/quizzes",
            json={"title": "Test Quiz", "description": "Testing"}
        ).json()["id"]

    #teardown method to clean up after each test
    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        SQLModel.metadata.drop_all(self.engine)
        self.engine.dispose()

    def test_attempt_reuses_existing_attempt(self):
        first = self.client.post(
            f"/quizzes/{self.quiz_id}/attempts/",
            json={"student_id": self.student_id}
        ).json()["attempt_id"]

        second = self.client.post(
            f"/quizzes/{self.quiz_id}/attempts/",
            json={"student_id": self.student_id}
        ).json()["attempt_id"]

        self.assertEqual(first, second)
