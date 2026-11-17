from sqlalchemy import inspect
from sqlmodel import SQLModel, create_engine, Session

# Import models so SQLModel registers their tables before create_all runs.
from backend import models

sqlite_file_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

def create_db_and_tables():
    # Create any missing tables without deleting existing quiz data.
    SQLModel.metadata.create_all(engine)
    with engine.begin() as connection:
        quiz_columns = {
            column["name"] for column in inspect(connection).get_columns("quiz")
        }
        if "time_limit_minutes" not in quiz_columns:
            connection.exec_driver_sql(
                "ALTER TABLE quiz ADD COLUMN time_limit_minutes INTEGER"
            )

        student_columns = {
            column["name"] for column in inspect(connection).get_columns("student")
        }
        if "clerk_user_id" not in student_columns:
            connection.exec_driver_sql(
                "ALTER TABLE student ADD COLUMN clerk_user_id VARCHAR"
            )
        connection.exec_driver_sql(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_student_clerk_user_id "
            "ON student (clerk_user_id)"
        )

        student_answer_columns = {
            column["name"]
            for column in inspect(connection).get_columns("studentanswer")
        }
        if "selected_answer_id" in student_answer_columns and "answer_id" not in student_answer_columns:
            connection.exec_driver_sql(
                "ALTER TABLE studentanswer RENAME COLUMN selected_answer_id TO answer_id"
            )

        connection.exec_driver_sql(
            "CREATE TABLE IF NOT EXISTS questionreviewflag ("
            "id INTEGER PRIMARY KEY, "
            "attempt_id INTEGER NOT NULL REFERENCES quizattempt(id), "
            "question_id INTEGER NOT NULL REFERENCES question(id))"
        )

def get_session():
    # FastAPI closes this database session after each request.
    with Session(engine) as session:
        yield session