import unittest
from unittest.mock import patch

from sqlalchemy import create_engine, inspect
from sqlalchemy.pool import StaticPool

from backend.database import create_db_and_tables


class TestDatabaseMigration(unittest.TestCase):
    def test_adds_time_limit_column_to_existing_quiz_table(self):
        engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "CREATE TABLE quiz (id INTEGER PRIMARY KEY, title VARCHAR NOT NULL, description VARCHAR)"
            )
            connection.exec_driver_sql(
                "INSERT INTO quiz (id, title, description) VALUES (1, 'Existing quiz', 'Keep this data')"
            )
            connection.exec_driver_sql(
                "CREATE TABLE student (id INTEGER PRIMARY KEY, name VARCHAR NOT NULL, email VARCHAR NOT NULL)"
            )
            connection.exec_driver_sql(
                "INSERT INTO student (id, name, email) VALUES (2, 'Existing student', 'student@example.com')"
            )
            connection.exec_driver_sql(
                "CREATE TABLE studentanswer (id INTEGER PRIMARY KEY, attempt_id INTEGER NOT NULL, question_id INTEGER NOT NULL, selected_answer_id INTEGER NOT NULL, is_correct BOOLEAN)"
            )
            connection.exec_driver_sql(
                "INSERT INTO studentanswer (id, attempt_id, question_id, selected_answer_id, is_correct) VALUES (1, 2, 3, 4, 1)"
            )

        with patch("backend.database.engine", engine):
            create_db_and_tables()

        columns = {column["name"] for column in inspect(engine).get_columns("quiz")}
        student_answer_columns = {
            column["name"]
            for column in inspect(engine).get_columns("studentanswer")
        }
        student_columns = {
            column["name"] for column in inspect(engine).get_columns("student")
        }
        with engine.connect() as connection:
            existing_quiz = connection.exec_driver_sql(
                "SELECT id, title, description, time_limit_minutes FROM quiz WHERE id = 1"
            ).one()
            existing_answer = connection.exec_driver_sql(
                "SELECT id, attempt_id, question_id, answer_id, is_correct FROM studentanswer WHERE id = 1"
            ).one()
            existing_student = connection.exec_driver_sql(
                "SELECT id, name, email, clerk_user_id FROM student WHERE id = 2"
            ).one()

        self.assertIn("time_limit_minutes", columns)
        self.assertEqual(existing_quiz, (1, "Existing quiz", "Keep this data", None))
        self.assertIn("answer_id", student_answer_columns)
        self.assertNotIn("selected_answer_id", student_answer_columns)
        self.assertEqual(existing_answer, (1, 2, 3, 4, 1))
        self.assertIn("clerk_user_id", student_columns)
        self.assertEqual(
            existing_student,
            (2, "Existing student", "student@example.com", None),
        )
        self.assertIn("questionreviewflag", inspect(engine).get_table_names())
        engine.dispose()