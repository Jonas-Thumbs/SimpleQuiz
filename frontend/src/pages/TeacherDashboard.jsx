import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  createAnswer,
  createQuestion,
  createQuiz,
  getQuickResultsTeacher,
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

        {
          // show only after the backend sent us the at-a-glance summary
          result && (
            <section className="teacher-summary-container">
              <div className="summary-header">
                <h3>Results: {result.quiz_title}</h3>
                <button onClick={() => setResult(null)}>Close</button>
              </div>

              <div className="summary-overview">
                <span>
                  Submissions: <strong>{result.total_attempts}</strong>
                </span>
                <span>
                  Average Score:{" "}
                  <strong>{result.average_score.toFixed(1)} pts</strong>
                </span>
              </div>

              <table className="summary-table">
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Accuracy (Correct / Total)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.questions.map((q, index) => {
                    const accuracy = getAccuracyPercentage(
                      q.correct_answers,
                      q.total_answers
                    );

                    return (
                      <tr key={q.question_id}>
                        {/* Left Column: Question text */}
                        <td className="question-col">
                          <strong>Q{index + 1}:</strong> {q.question_text}
                        </td>

                        {/* Right Column: Progress bar & fraction of correct answers*/}
                        <td className="progress-col">
                          <div className="progress-wrapper">
                            <div className="progress-bar-track">
                              <div
                                className="progress-bar-fill"
                                style={{ width: `${accuracy}%` }}
                              />
                            </div>
                            <span className="progress-label">
                              {accuracy}% ({q.correct_answers}/{q.total_answers}
                              )
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )
        }

        {!result && (
          <div className="student-quiz-list">
            {quizzes.map((quiz) => (
              <article className="student-quiz-option" key={quiz.id}>
                <div>
                  <h2>{quiz.title}</h2>
                  <p>{quiz.description}</p>
                  <span>{quiz.question_count} questions</span>
                </div>
                <button
                  disabled={busy}
                  onClick={() => handleSeeResults(quiz.id)}
                >
                  See Results
                </button>
              </article>
            ))}
            {quizzes.length === 0 && !error && <p>Loading quizzes...</p>}
          </div>
        )}
        <br />

        {!result && (
          <div className="teacher-actions">
            <Link
              to="/teacher/create-quiz/"
              className="home-button home-button-primary"
            >
              New Quiz
            </Link>
          </div>
        )}
      </section>
    </main>
  );

  // Starting again returns the existing in-progress attempt when available.
  async function handleSeeResults(quizId) {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const quickResultsData = await getQuickResultsTeacher(quizId);
      setResult(quickResultsData);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function getAccuracyPercentage(correct, total) {
    if (!total || total === 0) return 0;
    return Math.round((correct / total) * 100);
  }
}

export default TeacherDashboard;
