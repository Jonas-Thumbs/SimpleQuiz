import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  createAnswer,
  createQuestion,
  createQuiz,
  getQuizzes,
} from "../services/apiService";

function TeacherDashboard() {
  const [error, setError] = useState("");
  const [quizzes, setQuizzes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    // Load the quiz list once when the student page opens.
    getQuizzes()
      .then(setQuizzes)
      .catch((requestError) => setError(requestError.message));
  }, []);
  return (
    <main className="teacher-quiz-page">
      <section className="home-hero">
        <p className="home-eyebrow">TEACH MORE EFFECTIVELY</p>
        <h2>Manage Quizzes</h2>
        <p className="home-description">
          Create new quizzes and see how your students are doing in existing
          ones.
        </p>
        <br />
        {error && (
          <p className="student-quiz-error" role="alert">
            {error}
          </p>
        )}

        <div className="student-quiz-list">
          {quizzes.map((quiz) => (
            <article className="student-quiz-option" key={quiz.id}>
              <div>
                <h2>{quiz.title}</h2>
                <p>{quiz.description}</p>
                <span>{quiz.question_count} questions</span>
              </div>
              <button disabled={busy} onClick={() => handleSeeResults(quiz.id)}>
                See Results
              </button>
            </article>
          ))}
          {quizzes.length === 0 && !error && <p>Loading quizzes...</p>}
        </div>

        <br />
        <div className="teacher-actions">
          <Link
            to="/teacher/create-quiz/"
            className="home-button home-button-primary"
          >
            New Quiz
          </Link>
        </div>
      </section>
    </main>
  );

  // Starting again returns the existing in-progress attempt when available.
  async function handleSeeResults(quizId) {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      // here comes the new code
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }
}

export default TeacherDashboard;
